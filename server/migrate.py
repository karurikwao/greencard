import os
from pathlib import Path

import psycopg2
from dotenv import load_dotenv

load_dotenv()


def run_incremental_migrations(cur):
    cur.execute(
        """
        CREATE OR REPLACE FUNCTION create_or_update_subscription(
            p_user_id UUID, p_plan_type TEXT, p_status TEXT DEFAULT 'active',
            p_provider TEXT DEFAULT 'internal', p_provider_customer_id TEXT DEFAULT NULL,
            p_provider_subscription_id TEXT DEFAULT NULL, p_trial_ends_at TIMESTAMPTZ DEFAULT NULL,
            p_current_period_ends_at TIMESTAMPTZ DEFAULT NULL, p_metadata JSONB DEFAULT '{}'::jsonb
        )
        RETURNS user_subscriptions AS $$
        DECLARE
            v_sub user_subscriptions;
            v_now TIMESTAMPTZ := now();
        BEGIN
            INSERT INTO user_subscriptions (
                user_id, plan_type, status, provider, provider_customer_id, provider_subscription_id,
                trial_starts_at, trial_ends_at, current_period_starts_at, current_period_ends_at,
                lifetime_granted_at, interview_pass_ends_at, metadata, created_at, updated_at
            ) VALUES (
                p_user_id, p_plan_type, p_status, p_provider, p_provider_customer_id, p_provider_subscription_id,
                CASE WHEN p_status = 'trialing' THEN v_now ELSE NULL END,
                p_trial_ends_at,
                CASE WHEN p_status = 'active' THEN v_now ELSE NULL END,
                p_current_period_ends_at,
                CASE WHEN p_plan_type = 'lifetime' THEN v_now ELSE NULL END,
                CASE WHEN p_plan_type = 'interviewPass' THEN p_current_period_ends_at ELSE NULL END,
                p_metadata, v_now, v_now
            )
            ON CONFLICT (user_id) DO UPDATE SET
                plan_type = EXCLUDED.plan_type,
                status = EXCLUDED.status,
                provider = EXCLUDED.provider,
                provider_customer_id = COALESCE(EXCLUDED.provider_customer_id, user_subscriptions.provider_customer_id),
                provider_subscription_id = COALESCE(EXCLUDED.provider_subscription_id, user_subscriptions.provider_subscription_id),
                trial_starts_at = COALESCE(EXCLUDED.trial_starts_at, user_subscriptions.trial_starts_at),
                trial_ends_at = COALESCE(EXCLUDED.trial_ends_at, user_subscriptions.trial_ends_at),
                current_period_starts_at = COALESCE(EXCLUDED.current_period_starts_at, user_subscriptions.current_period_starts_at),
                current_period_ends_at = CASE
                    WHEN EXCLUDED.plan_type = 'lifetime' THEN NULL
                    ELSE COALESCE(EXCLUDED.current_period_ends_at, user_subscriptions.current_period_ends_at)
                END,
                canceled_at = CASE WHEN EXCLUDED.status = 'active' THEN NULL ELSE user_subscriptions.canceled_at END,
                ends_at = CASE WHEN EXCLUDED.status = 'active' THEN NULL ELSE user_subscriptions.ends_at END,
                payment_failed_at = CASE WHEN EXCLUDED.status = 'active' THEN NULL ELSE user_subscriptions.payment_failed_at END,
                payment_failure_count = CASE WHEN EXCLUDED.status = 'active' THEN 0 ELSE user_subscriptions.payment_failure_count END,
                lifetime_granted_at = COALESCE(EXCLUDED.lifetime_granted_at, user_subscriptions.lifetime_granted_at),
                interview_pass_ends_at = CASE
                    WHEN EXCLUDED.plan_type = 'interviewPass' THEN COALESCE(EXCLUDED.interview_pass_ends_at, user_subscriptions.interview_pass_ends_at)
                    WHEN EXCLUDED.plan_type = 'lifetime' THEN NULL
                    ELSE user_subscriptions.interview_pass_ends_at
                END,
                metadata = COALESCE(user_subscriptions.metadata, '{}'::jsonb) || EXCLUDED.metadata,
                updated_at = v_now
            RETURNING * INTO v_sub;
            RETURN v_sub;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS dashboard_agent_memory (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            question TEXT NOT NULL,
            answer TEXT NOT NULL,
            provider TEXT,
            model TEXT,
            topic_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
            source TEXT NOT NULL DEFAULT 'dashboard_virtual_agent',
            memory_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );

        CREATE INDEX IF NOT EXISTS idx_dashboard_agent_memory_user_created
            ON dashboard_agent_memory(user_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_dashboard_agent_memory_tags
            ON dashboard_agent_memory USING GIN (topic_tags);
        CREATE INDEX IF NOT EXISTS idx_dashboard_agent_memory_search
            ON dashboard_agent_memory USING GIN (
                to_tsvector('english', COALESCE(question, '') || ' ' || COALESCE(answer, ''))
            );

        DROP TRIGGER IF EXISTS trigger_update_dashboard_agent_memory_updated_at ON dashboard_agent_memory;
        CREATE TRIGGER trigger_update_dashboard_agent_memory_updated_at
        BEFORE UPDATE ON dashboard_agent_memory
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

        ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS ai_summary TEXT;
        ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS ai_suggested_reply TEXT;
        ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS ai_triage JSONB DEFAULT '{}'::jsonb;
        ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS last_ai_assisted_at TIMESTAMPTZ;

        ALTER TABLE broadcast_messages ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
        ALTER TABLE broadcast_messages ADD COLUMN IF NOT EXISTS send_email BOOLEAN NOT NULL DEFAULT true;
        ALTER TABLE broadcast_messages ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

        CREATE TABLE IF NOT EXISTS admin_settings (
            key TEXT PRIMARY KEY,
            value JSONB NOT NULL DEFAULT '{}'::jsonb,
            updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );

        DROP TRIGGER IF EXISTS trigger_update_admin_settings_updated_at ON admin_settings;
        CREATE TRIGGER trigger_update_admin_settings_updated_at
        BEFORE UPDATE ON admin_settings
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

        ALTER TABLE support_tickets DROP CONSTRAINT IF EXISTS support_tickets_category_check;
        ALTER TABLE support_tickets
          ADD CONSTRAINT support_tickets_category_check
          CHECK (category IN ('billing', 'refund', 'technical', 'account', 'feature_request', 'other'));

        CREATE OR REPLACE FUNCTION create_refund_request(
            p_user_id UUID, p_subscription_id TEXT DEFAULT NULL,
            p_stripe_payment_intent_id TEXT DEFAULT NULL,
            p_stripe_charge_id TEXT DEFAULT NULL,
            p_plan_type TEXT DEFAULT NULL, p_amount DECIMAL DEFAULT 0,
            p_currency TEXT DEFAULT 'usd', p_purchased_at TIMESTAMPTZ DEFAULT NULL,
            p_days_since_purchase INTEGER DEFAULT 0,
            p_questions_completed INTEGER DEFAULT 0,
            p_mock_interviews_completed INTEGER DEFAULT 0,
            p_reason TEXT DEFAULT NULL, p_additional_comments TEXT DEFAULT NULL
        )
        RETURNS UUID AS $$
        DECLARE
            v_id UUID;
            v_eligibility_status TEXT;
        BEGIN
            v_eligibility_status := CASE
                WHEN p_reason = 'unauthorized_transaction' THEN 'eligible'
                WHEN p_days_since_purchase <= 7
                    AND p_questions_completed < 25
                    AND p_mock_interviews_completed <= 1 THEN 'eligible'
                WHEN p_reason = 'unclear_purchase'
                    AND p_days_since_purchase <= 14
                    AND p_questions_completed < 25
                    AND p_mock_interviews_completed <= 1 THEN 'eligible'
                ELSE 'not_eligible'
            END;

            INSERT INTO refund_requests (
                user_id, subscription_id, stripe_payment_intent_id, stripe_charge_id,
                plan_type, amount, currency, purchased_at, days_since_purchase,
                questions_completed, mock_interviews_completed, eligibility_status,
                reason, additional_comments
            ) VALUES (
                p_user_id, p_subscription_id, p_stripe_payment_intent_id, p_stripe_charge_id,
                p_plan_type, p_amount, p_currency, p_purchased_at, p_days_since_purchase,
                p_questions_completed, p_mock_interviews_completed, v_eligibility_status,
                p_reason, p_additional_comments
            )
            RETURNING id INTO v_id;
            RETURN v_id;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;

        DROP FUNCTION IF EXISTS create_support_ticket(UUID, TEXT, TEXT, TEXT);

        CREATE OR REPLACE FUNCTION create_support_ticket(
            p_user_id UUID, p_subject TEXT, p_category TEXT, p_message TEXT,
            p_ai_summary TEXT DEFAULT NULL, p_ai_suggested_reply TEXT DEFAULT NULL,
            p_ai_triage JSONB DEFAULT '{}'::jsonb
        )
        RETURNS UUID AS $$
        DECLARE
            v_ticket_id UUID;
        BEGIN
            INSERT INTO support_tickets (
                user_id, subject, category, message, ai_summary,
                ai_suggested_reply, ai_triage, last_ai_assisted_at
            )
            VALUES (
                p_user_id, p_subject, p_category, p_message, p_ai_summary,
                p_ai_suggested_reply, COALESCE(p_ai_triage, '{}'::jsonb),
                CASE WHEN p_ai_summary IS NOT NULL OR p_ai_suggested_reply IS NOT NULL THEN now() ELSE NULL END
            )
            RETURNING id INTO v_ticket_id;

            PERFORM create_user_notification(
                p_user_id, 'support', 'Support Ticket Created',
                'Your support ticket "' || p_subject || '" has been submitted. We''ll respond soon.',
                NULL, jsonb_build_object('ticket_id', v_ticket_id)
            );
            RETURN v_ticket_id;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;

        DROP FUNCTION IF EXISTS get_user_tickets_with_replies(UUID);

        CREATE OR REPLACE FUNCTION get_user_tickets_with_replies(p_user_id UUID)
        RETURNS TABLE (
            id UUID, subject TEXT, category TEXT, message TEXT,
            status TEXT, admin_reply TEXT, replied_at TIMESTAMPTZ,
            ai_summary TEXT, ai_suggested_reply TEXT, ai_triage JSONB,
            created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
        ) AS $$
        BEGIN
            RETURN QUERY
            SELECT t.id, t.subject, t.category, t.message, t.status,
                t.admin_reply, t.replied_at, t.ai_summary, t.ai_suggested_reply,
                t.ai_triage, t.created_at, t.updated_at
            FROM support_tickets t
            WHERE t.user_id = p_user_id
            ORDER BY t.created_at DESC;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
        """
    )


def main():
    database_url = os.getenv('DATABASE_URL')
    setup_sql = os.getenv('SETUP_SQL_PATH', '/app/MASTER_SETUP_POSTGRES_v5.sql')

    if not database_url:
        print('[migrate] DATABASE_URL is not set; skipping database bootstrap.')
        return

    sql_path = Path(setup_sql)
    if not sql_path.exists():
        print(f'[migrate] Setup SQL not found at {sql_path}; skipping database bootstrap.')
        return

    with psycopg2.connect(database_url) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT to_regclass('public.users')")
            already_initialized = cur.fetchone()[0] is not None

            if already_initialized:
                print('[migrate] Database already has core tables; applying incremental migrations.')
                run_incremental_migrations(cur)
                return

            print('[migrate] Bootstrapping database schema...')
            cur.execute(sql_path.read_text(encoding='utf-8'))
            run_incremental_migrations(cur)
        conn.commit()

    print('[migrate] Database bootstrap complete.')


if __name__ == '__main__':
    main()
