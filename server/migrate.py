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
