import json
import os
import uuid
from flask import Blueprint, request, jsonify
from auth import require_auth, require_admin, optional_auth
import db

api_bp = Blueprint('api', __name__)


@api_bp.route('/rpc/<func_name>', methods=['POST'])
@optional_auth
def call_rpc(func_name):
    user = request.current_user
    data = request.get_json() or {}

    allowed_functions = {
        'is_admin', 'is_superadmin',
        'get_effective_subscription', 'check_ai_usage_limits',
        'record_ai_session_start', 'record_ai_turn',
        'create_or_update_subscription',
        'record_pdf_download', 'get_user_download_summary',
        'get_user_download_events',
        'get_active_announcements', 'get_active_trust_snippets',
        'get_active_content_blocks', 'get_dismissed_content_ids',
        'dismiss_content', 'record_content_interaction',
        'get_content_analytics', 'get_placement_analytics',
        'get_seo_settings', 'update_sitemap_frequency',
        'get_seo_expansion_settings', 'save_seo_expansion_settings',
        'get_published_expansion_slugs', 'get_seo_expansion_pages',
        'update_seo_expansion_page_status',
        'bulk_update_seo_expansion_pages',
        'increment_expansion_page_views',
        'record_scheduler_run', 'record_rebuild_attempt',
        'get_latest_rebuild_attempt', 'get_scheduler_run_history',
        'get_sitemap_sync_status_secure',
        'validate_promo_code', 'record_referral_event',
        'get_all_promo_code_stats', 'apply_promo_code_discount',
        'get_promo_code_stats',
        'create_answer_candidate', 'get_pending_answer_candidates',
        'update_answer_candidate_review', 'get_answer_candidate_stats',
        'get_unread_notification_count', 'mark_notification_read',
        'publish_broadcast', 'create_support_ticket',
        'get_user_tickets_with_replies', 'get_open_tickets_for_admin',
        'reply_to_support_ticket', 'create_refund_request',
        'get_refund_request_with_download_summary',
        'process_refund_approval', 'deny_refund_request',
        'get_pending_refund_requests',
        'get_verification_code', 'upsert_verification_code',
        'soft_delete_user', 'get_user_profile',
        'has_premium_access',
        'increment_download', 'reset_stats',
        'process-refund', 'trigger-rebuild',
    }

    if func_name not in allowed_functions:
        return jsonify({'error': f'Function {func_name} not found'}), 404

    admin_only_functions = {
        'update_sitemap_frequency', 'update_seo_expansion_page_status',
        'record_scheduler_run', 'record_rebuild_attempt',
        'get_all_promo_code_stats', 'apply_promo_code_discount',
        'get_promo_code_stats', 'save_seo_expansion_settings',
        'bulk_update_seo_expansion_pages', 'get_seo_expansion_pages',
        'get_pending_answer_candidates', 'update_answer_candidate_review',
        'get_answer_candidate_stats', 'publish_broadcast',
        'get_open_tickets_for_admin', 'reply_to_support_ticket',
        'get_refund_request_with_download_summary',
        'process_refund_approval', 'deny_refund_request',
        'get_pending_refund_requests',
        'upsert_verification_code', 'reset_stats',
        'get_content_analytics', 'get_placement_analytics',
        'get_scheduler_run_history',
        'process-refund', 'trigger-rebuild',
    }

    auth_required_functions = {
        'is_admin', 'is_superadmin', 'get_effective_subscription',
        'check_ai_usage_limits', 'record_ai_session_start', 'record_ai_turn',
        'create_or_update_subscription', 'record_pdf_download',
        'get_user_download_summary', 'get_user_download_events',
        'get_dismissed_content_ids', 'dismiss_content',
        'create_answer_candidate', 'get_unread_notification_count',
        'mark_notification_read', 'create_support_ticket',
        'get_user_tickets_with_replies', 'create_refund_request',
        'soft_delete_user', 'get_user_profile', 'has_premium_access',
        'record_referral_event', 'increment_download',
    }

    if func_name in admin_only_functions:
        if not user or user.get('role') not in ('admin', 'superadmin'):
            return jsonify({'error': 'Admin access required'}), 403

    if func_name in auth_required_functions and not user:
        return jsonify({'error': 'Authentication required'}), 401

    if func_name == 'process-refund':
        return process_refund()
    if func_name == 'trigger-rebuild':
        return trigger_rebuild()

    param_mapping = {
        'is_admin': {'p_user_id': lambda: user['id']},
        'is_superadmin': {'p_user_id': lambda: user['id']},
        'get_effective_subscription': {'p_user_id': lambda: data.get('p_user_id', user['id'])},
        'check_ai_usage_limits': {'p_user_id': lambda: user['id']},
        'record_ai_session_start': {
            'p_user_id': lambda: user['id'],
            'p_provider': lambda: data.get('provider'),
            'p_model': lambda: data.get('model'),
            'p_topic_id': lambda: data.get('topicId'),
        },
        'record_ai_turn': {
            'p_user_id': lambda: user['id'],
            'p_session_id': lambda: data.get('sessionId'),
            'p_turn_count': lambda: data.get('turnCount', 1),
        },
        'dismiss_content': {
            'p_user_id': lambda: user['id'],
            'p_content_type': lambda: data.get('contentType'),
            'p_content_id': lambda: data.get('contentId'),
            'p_placement': lambda: data.get('placement'),
        },
        'get_dismissed_content_ids': {
            'p_user_id': lambda: user['id'],
            'p_content_type': lambda: data.get('contentType'),
            'p_placement': lambda: data.get('placement'),
        },
        'record_pdf_download': {
            'p_user_id': lambda: user['id'],
            'p_user_email': lambda: user.get('email'),
            'p_pdf_filename': lambda: data.get('pdfFilename'),
            'p_pdf_title': lambda: data.get('pdfTitle'),
            'p_topic_id': lambda: data.get('topicId'),
            'p_category_id': lambda: data.get('categoryId'),
            'p_download_source': lambda: data.get('downloadSource', 'topic_page'),
            'p_event_status': lambda: data.get('eventStatus', 'requested'),
            'p_session_hash': lambda: data.get('sessionHash'),
            'p_user_agent_hash': lambda: data.get('userAgentHash'),
        },
        'get_user_download_summary': {'p_user_id': lambda: user['id']},
        'mark_notification_read': {'p_notification_id': lambda: data.get('notificationId')},
        'get_unread_notification_count': {},
        'create_support_ticket': {
            'p_user_id': lambda: user['id'],
            'p_subject': lambda: data.get('p_subject') or data.get('subject'),
            'p_category': lambda: data.get('p_category') or data.get('category', 'other'),
            'p_message': lambda: data.get('p_message') or data.get('message'),
            'p_ai_summary': lambda: data.get('p_ai_summary') or data.get('aiSummary'),
            'p_ai_suggested_reply': lambda: data.get('p_ai_suggested_reply') or data.get('aiSuggestedReply'),
            'p_ai_triage': lambda: (
                json.dumps(data.get('p_ai_triage') or data.get('aiTriage') or {})
                if isinstance(data.get('p_ai_triage') or data.get('aiTriage'), dict)
                else (data.get('p_ai_triage') or data.get('aiTriage') or '{}')
            ),
        },
        'create_refund_request': {
            'p_user_id': lambda: user['id'],
            'p_subscription_id': lambda: data.get('p_subscription_id') or data.get('subscriptionId'),
            'p_stripe_payment_intent_id': lambda: data.get('p_stripe_payment_intent_id') or data.get('stripePaymentIntentId'),
            'p_stripe_charge_id': lambda: data.get('p_stripe_charge_id') or data.get('stripeChargeId'),
            'p_plan_type': lambda: data.get('p_plan_type') or data.get('planType'),
            'p_amount': lambda: data.get('p_amount') or data.get('amount'),
            'p_currency': lambda: data.get('p_currency') or data.get('currency', 'usd'),
            'p_purchased_at': lambda: data.get('p_purchased_at') or data.get('purchasedAt'),
            'p_days_since_purchase': lambda: data.get('p_days_since_purchase') or data.get('daysSincePurchase', 0),
            'p_questions_completed': lambda: data.get('p_questions_completed') or data.get('questionsCompleted', 0),
            'p_mock_interviews_completed': lambda: data.get('p_mock_interviews_completed') or data.get('mockInterviewsCompleted', 0),
            'p_reason': lambda: data.get('p_reason') or data.get('reason'),
            'p_additional_comments': lambda: data.get('p_additional_comments') or data.get('additionalComments'),
        },
        'validate_promo_code': {'p_code': lambda: data.get('code')},
        'record_referral_event': {
            'p_user_id': lambda: user['id'] if user else data.get('userId'),
            'p_promo_code': lambda: data.get('promoCode'),
            'p_referrer': lambda: data.get('referrer'),
            'p_landing_page': lambda: data.get('landingPage'),
            'p_event_type': lambda: data.get('eventType', 'visit'),
            'p_metadata': lambda: json.dumps(data.get('metadata', {})) if isinstance(data.get('metadata'), dict) else data.get('metadata', '{}'),
        },
        'increment_expansion_page_views': {'p_slug': lambda: data.get('slug')},
        'create_or_update_subscription': {
            'p_user_id': lambda: data.get('userId', user['id'] if user else None),
            'p_plan_type': lambda: data.get('planType'),
            'p_status': lambda: data.get('status', 'active'),
            'p_provider': lambda: data.get('provider', 'internal'),
            'p_provider_customer_id': lambda: data.get('providerCustomerId'),
            'p_provider_subscription_id': lambda: data.get('providerSubscriptionId'),
            'p_trial_ends_at': lambda: data.get('trialEndsAt'),
            'p_current_period_ends_at': lambda: data.get('currentPeriodEndsAt'),
            'p_metadata': lambda: json.dumps(data.get('metadata', {})) if isinstance(data.get('metadata'), dict) else data.get('metadata', '{}'),
        },
    'update_seo_expansion_page_status': {
      'p_slug': lambda: data.get('slug'),
      'p_status': lambda: data.get('status'),
      'p_include_in_sitemap': lambda: data.get('includeInSitemap', False),
      'p_noindex_override': lambda: data.get('noindexOverride', True),
      'p_notes': lambda: data.get('notes'),
    },
    'get_seo_expansion_pages': {
      'p_status': lambda: data.get('status'),
      'p_limit': lambda: data.get('limit', 100),
      'p_offset': lambda: data.get('offset', 0),
    },
        'record_scheduler_run': {
            'p_triggered_manually': lambda: data.get('triggeredManually', True),
            'p_pages_considered': lambda: data.get('pagesConsidered', 0),
            'p_pages_published': lambda: data.get('pagesPublished', 0),
            'p_published_slugs': lambda: data.get('publishedSlugs', []),
            'p_sitemap_included': lambda: data.get('sitemapIncluded', False),
            'p_noindex_respected': lambda: data.get('noindexRespected', True),
            'p_only_approved_published': lambda: data.get('onlyApprovedPublished', True),
            'p_execution_duration_ms': lambda: data.get('executionDurationMs'),
            'p_error_message': lambda: data.get('errorMessage'),
        },
        'record_rebuild_attempt': {
            'p_triggered_by': lambda: user['id'] if user else data.get('triggeredBy'),
            'p_triggered_at': lambda: data.get('triggeredAt'),
            'p_status': lambda: data.get('status', 'pending'),
            'p_reason': lambda: data.get('reason', 'admin_triggered'),
            'p_source': lambda: data.get('source', 'admin_dashboard'),
            'p_error': lambda: data.get('error'),
        },
        'create_answer_candidate': {
            'p_user_id': lambda: data.get('userId', user['id'] if user else None),
            'p_question_id': lambda: data.get('questionId'),
            'p_question_slug': lambda: data.get('questionSlug'),
            'p_question_prompt': lambda: data.get('questionPrompt'),
            'p_original_answer': lambda: data.get('originalAnswer'),
            'p_sanitized_answer': lambda: data.get('sanitizedAnswer'),
            'p_category': lambda: data.get('category', 'uncategorized'),
            'p_answer_pattern': lambda: data.get('answerPattern', 'other'),
            'p_quality_score': lambda: data.get('qualityScore', 'uncategorized'),
            'p_quality_reason': lambda: data.get('qualityReason'),
            'p_source_session_id': lambda: data.get('sourceSessionId'),
            'p_source_turn_number': lambda: data.get('sourceTurnNumber'),
        },
        'update_answer_candidate_review': {
            'p_candidate_id': lambda: data.get('candidateId'),
            'p_review_status': lambda: data.get('reviewStatus'),
            'p_reviewer_notes': lambda: data.get('reviewerNotes'),
            'p_approved_for_publication': lambda: data.get('approvedForPublication', False),
        },
        'get_verification_code': {
            'p_placement': lambda: data.get('placement'),
            'p_environment': lambda: data.get('environment', 'production'),
        },
        'upsert_verification_code': {
            'p_placement': lambda: data.get('placement'),
            'p_code': lambda: data.get('code'),
            'p_is_enabled': lambda: data.get('isEnabled', True),
            'p_notes': lambda: data.get('notes'),
            'p_environment': lambda: data.get('environment', 'production'),
        },
        'has_premium_access': {'p_user_id': lambda: data.get('p_user_id', user['id'] if user else None)},
        'get_user_profile': {'p_user_id': lambda: user['id']},
    'soft_delete_user': {'p_user_id': lambda: user['id']},
    'get_user_download_events': {
      'p_user_id': lambda: data.get('p_user_id', user['id']),
      'p_limit': lambda: data.get('limit', 50),
      'p_offset': lambda: data.get('offset', 0),
    },
    'get_content_analytics': {
      'p_content_type': lambda: data.get('contentType'),
      'p_start_date': lambda: data.get('startDate'),
      'p_end_date': lambda: data.get('endDate'),
    },
    'get_placement_analytics': {
      'p_placement': lambda: data.get('placement'),
      'p_start_date': lambda: data.get('startDate'),
      'p_end_date': lambda: data.get('endDate'),
    },
    'save_seo_expansion_settings': {
      'p_auto_publish': lambda: data.get('autoPublish', False),
      'p_max_pages_per_run': lambda: data.get('maxPagesPerRun', 5),
      'p_quality_threshold': lambda: data.get('qualityThreshold', 0.7),
      'p_require_approval': lambda: data.get('requireApproval', True),
      'p_default_include_sitemap': lambda: data.get('defaultIncludeSitemap', True),
      'p_default_noindex': lambda: data.get('defaultNoindex', False),
    },
    'bulk_update_seo_expansion_pages': {
      'p_slugs': lambda: data.get('slugs', []),
      'p_status': lambda: data.get('status'),
      'p_include_in_sitemap': lambda: data.get('includeInSitemap'),
      'p_noindex_override': lambda: data.get('noindexOverride'),
    },
    'get_scheduler_run_history': {
      'p_limit': lambda: data.get('limit', 20),
      'p_offset': lambda: data.get('offset', 0),
    },
    'process_refund_approval': {
      'p_refund_request_id': lambda: data.get('refundRequestId'),
      'p_admin_notes': lambda: data.get('adminNotes'),
    },
    'deny_refund_request': {
      'p_refund_request_id': lambda: data.get('refundRequestId'),
      'p_admin_notes': lambda: data.get('adminNotes'),
    },
    'get_pending_refund_requests': {},
    'get_promo_code_stats': {'p_code': lambda: data.get('code')},
    'increment_download': {},
    'reset_stats': {},
  }

    if func_name in param_mapping:
        param_defs = param_mapping[func_name]
        try:
            params = []
            for key, value_fn in param_defs.items():
                params.append(value_fn())
        except Exception as e:
            return jsonify({'error': f'Parameter error: {str(e)}'}), 400
    else:
        params = []
        for key, value in data.items():
            if not key.startswith('_'):
                params.append(value)

    try:
        result = db.call_function(func_name, params if params else None)
        if isinstance(result, list) and len(result) == 1:
            result = result[0]
        return jsonify({'data': result})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# Table-based queries (replacing supabase.from() calls)
@api_bp.route('/table/<table_name>', methods=['GET'])
@optional_auth
def query_table(table_name):
    user = request.current_user

    allowed_tables_read = {
        'user_profiles', 'user_subscriptions', 'plan_config',
        'user_progress', 'ai_daily_usage', 'ai_session_tracking',
        'pdf_assets', 'pdf_download_events', 'pdf_download_summaries',
        'site_announcements', 'site_trust_snippets', 'site_content_blocks',
        'content_dismissals', 'content_interactions',
        'seo_settings', 'seo_expansion_settings', 'seo_expansion_pages',
        'seo_expansion_scheduler_runs', 'seo_expansion_rebuild_attempts',
        'site_verification_codes', 'refund_requests',
        'user_notifications', 'broadcast_messages', 'support_tickets',
        'promo_codes', 'referral_events',
        'answer_example_candidates', 'stripe_webhook_events',
        'question_states', 'download_stats', 'ad_settings',
        'partner_connections', 'partner_progress', 'partner_settings',
        'users', 'user_topic_progress', 'user_preferences',
    }

    if table_name not in allowed_tables_read:
        return jsonify({'error': f'Table {table_name} not accessible'}), 404

    admin_only_tables = {
        'pdf_download_events', 'pdf_download_summaries',
        'ai_daily_usage', 'ai_session_tracking',
        'site_announcements', 'site_trust_snippets', 'site_content_blocks',
        'content_interactions', 'seo_expansion_scheduler_runs',
        'seo_expansion_rebuild_attempts', 'refund_requests',
        'broadcast_messages', 'support_tickets',
        'answer_example_candidates', 'stripe_webhook_events',
        'promo_codes', 'referral_events',
        'partner_connections', 'partner_progress', 'partner_settings',
        'users', 'site_verification_codes',
        'download_stats', 'ad_settings',
    }

    if table_name in admin_only_tables:
        if not user or user.get('role') not in ('admin', 'superadmin'):
            return jsonify({'error': 'Admin access required'}), 403

    user_scoped_tables = {
        'user_profiles', 'user_subscriptions', 'user_progress',
        'ai_daily_usage', 'ai_session_tracking',
        'pdf_download_events', 'pdf_download_summaries',
        'content_dismissals', 'user_notifications',
        'refund_requests', 'support_tickets', 'question_states',
        'partner_connections', 'partner_progress', 'partner_settings',
        'user_topic_progress', 'user_preferences',
    }

    select = request.args.get('select', '*')
    filter_col = request.args.get('filter')
    filter_val = request.args.get('filterValue')
    eq_col = request.args.get('eq')
    eq_val = request.args.get('eqValue')
    filters_json = request.args.get('filters')
    order = request.args.get('order')
    limit = request.args.get('limit', type=int)
    single = request.args.get('single', 'false').lower() == 'true'

    sql = f"SELECT {select} FROM {table_name}"
    conditions = []
    params = []

    if table_name in user_scoped_tables and user and user.get('role') not in ('admin', 'superadmin'):
        conditions.append("user_id = %s")
        params.append(user['id'])

    if eq_col and eq_val is not None:
        conditions.append(f"{eq_col} = %s")
        params.append(eq_val)

    if filter_col and filter_val:
        conditions.append(f"{filter_col} = %s")
        params.append(filter_val)

    if filters_json:
        try:
            for f in json.loads(filters_json):
                op = f.get('op', 'eq')
                col = f.get('col')
                val = f.get('val')
                if col and op == 'eq':
                    conditions.append(f"{col} = %s")
                    params.append(str(val))
                elif col and op == 'neq':
                    conditions.append(f"{col} != %s")
                    params.append(str(val))
                elif col and op == 'gt':
                    conditions.append(f"{col} > %s")
                    params.append(str(val))
                elif col and op == 'gte':
                    conditions.append(f"{col} >= %s")
                    params.append(str(val))
                elif col and op == 'lt':
                    conditions.append(f"{col} < %s")
                    params.append(str(val))
                elif col and op == 'lte':
                    conditions.append(f"{col} <= %s")
                    params.append(str(val))
                elif col and op == 'like':
                    conditions.append(f"{col} LIKE %s")
                    params.append(str(val))
                elif col and op == 'ilike':
                    conditions.append(f"{col} ILIKE %s")
                    params.append(str(val))
                elif col and op == 'in' and isinstance(val, list):
                    placeholders = ', '.join(['%s'] * len(val))
                    conditions.append(f"{col} IN ({placeholders})")
                    params.extend([str(v) for v in val])
                elif col and op == 'is':
                    if val is None or str(val).lower() == 'null':
                        conditions.append(f"{col} IS NULL")
                    else:
                        conditions.append(f"{col} IS %s")
                        params.append(str(val))
        except (json.JSONDecodeError, TypeError):
            pass

    if conditions:
        sql += " WHERE " + " AND ".join(conditions)

    if order:
        direction = 'DESC' if order.startswith('-') else 'ASC'
        col = order.lstrip('-')
        sql += f" ORDER BY {col} {direction}"

    if limit:
        sql += f" LIMIT {limit}"

    if single:
        sql += " LIMIT 1"

    try:
        rows = db.query_all(sql, params if params else None)
        if single:
            return jsonify({'data': rows[0] if rows else None})
        return jsonify({'data': rows})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api_bp.route('/table/<table_name>', methods=['POST'])
@require_auth
def insert_table(table_name):
    user = request.current_user
    data = request.get_json()

    allowed_tables_write = {
        'content_dismissals', 'content_interactions',
        'referral_events', 'user_progress', 'question_states',
        'broadcast_messages', 'support_tickets',
        'site_announcements', 'site_trust_snippets', 'site_content_blocks',
        'site_verification_codes', 'answer_example_candidates',
        'pdf_download_events', 'promo_codes',
        'refund_requests', 'user_notifications',
        'partner_connections', 'partner_progress', 'partner_settings',
        'user_topic_progress', 'user_preferences',
    }

    if table_name not in allowed_tables_write:
        return jsonify({'error': f'Cannot insert into {table_name}'}), 403

    admin_only_write_tables = {
        'broadcast_messages', 'site_announcements', 'site_trust_snippets',
        'site_content_blocks', 'site_verification_codes', 'promo_codes',
        'pdf_download_events', 'answer_example_candidates',
    }
    if table_name in admin_only_write_tables and user.get('role') not in ('admin', 'superadmin'):
        return jsonify({'error': 'Admin access required'}), 403

    if isinstance(data, list) and len(data) == 1:
        data = data[0]

    if table_name in ('content_dismissals',) and 'user_id' not in data:
        data['user_id'] = user['id']

    is_upsert = request.args.get('upsert', 'false').lower() == 'true'
    on_conflict = request.args.get('onConflict')

    columns = ', '.join(data.keys())
    placeholders = ', '.join(['%s'] * len(data))
    values = list(data.values())

    try:
        if is_upsert and on_conflict:
            conflict_cols = on_conflict.replace(',', ', ')
            update_sets = ', '.join(f"{k} = EXCLUDED.{k}" for k in data.keys() if k not in on_conflict.split(','))
            if not update_sets:
                update_sets = ', '.join(f"{k} = EXCLUDED.{k}" for k in data.keys())
            sql = f"INSERT INTO {table_name} ({columns}) VALUES ({placeholders}) ON CONFLICT ({conflict_cols}) DO UPDATE SET {update_sets} RETURNING *"
            result = db.execute_returning(sql, values)
        elif is_upsert:
            return jsonify({'error': 'onConflict parameter required for upsert'}), 400
        else:
            result = db.execute_returning(
                f"INSERT INTO {table_name} ({columns}) VALUES ({placeholders}) RETURNING *",
                values
            )
        return jsonify({'data': result})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api_bp.route('/table/<table_name>', methods=['PATCH'])
@require_auth
def update_table(table_name):
    user = request.current_user
    data = request.get_json()

    allowed_tables_update = {
        'user_profiles', 'user_subscriptions', 'user_progress',
        'content_dismissals', 'user_notifications', 'question_states',
        'ad_settings', 'seo_settings', 'seo_expansion_pages',
        'seo_expansion_settings',
        'broadcast_messages', 'support_tickets',
        'site_announcements', 'site_trust_snippets', 'site_content_blocks',
        'site_verification_codes', 'answer_example_candidates',
        'pdf_download_events', 'promo_codes',
        'refund_requests',
        'partner_connections', 'partner_progress', 'partner_settings',
        'user_topic_progress', 'user_preferences',
    }

    if table_name not in allowed_tables_update:
        return jsonify({'error': f'Cannot update {table_name}'}), 403

    admin_only_update_tables = {
        'broadcast_messages', 'site_announcements', 'site_trust_snippets',
        'site_content_blocks', 'site_verification_codes', 'promo_codes',
        'pdf_download_events', 'answer_example_candidates', 'refund_requests',
        'ad_settings', 'seo_settings', 'seo_expansion_pages', 'seo_expansion_settings',
    }
    if table_name in admin_only_update_tables and user.get('role') not in ('admin', 'superadmin'):
        return jsonify({'error': 'Admin access required'}), 403

    eq_col = request.args.get('eq')
    eq_val = request.args.get('eqValue')

    if not eq_col or not eq_val:
        return jsonify({'error': 'eq and eqValue parameters required'}), 400

    if table_name in ('user_profiles',) and eq_col == 'user_id':
        if eq_val != user['id'] and user['role'] not in ('admin', 'superadmin'):
            return jsonify({'error': 'Can only update own profile'}), 403

    set_clauses = ', '.join(f"{k} = %s" for k in data.keys())
    values = list(data.values()) + [eq_val]

    try:
        result = db.execute_returning(
            f"UPDATE {table_name} SET {set_clauses} WHERE {eq_col} = %s RETURNING *",
            values
        )
        return jsonify({'data': result})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api_bp.route('/table/<table_name>', methods=['DELETE'])
@require_auth
def delete_table(table_name):
    user = request.current_user
    eq_col = request.args.get('eq')
    eq_val = request.args.get('eqValue')

    allowed_tables_delete = {
        'content_dismissals', 'site_announcements', 'site_trust_snippets',
        'site_content_blocks', 'broadcast_messages', 'promo_codes',
        'answer_example_candidates', 'partner_connections',
        'partner_progress', 'partner_settings', 'user_notifications',
    }

    if table_name not in allowed_tables_delete:
        return jsonify({'error': f'Cannot delete from {table_name}'}), 403

    admin_only_delete_tables = {
        'site_announcements', 'site_trust_snippets', 'site_content_blocks',
        'broadcast_messages', 'promo_codes', 'answer_example_candidates',
    }
    if table_name in admin_only_delete_tables and user.get('role') not in ('admin', 'superadmin'):
        return jsonify({'error': 'Admin access required'}), 403

    if not eq_col or not eq_val:
        return jsonify({'error': 'eq and eqValue parameters required'}), 400

    try:
        db.execute(f"DELETE FROM {table_name} WHERE {eq_col} = %s AND user_id = %s", (eq_val, user['id']))
        return jsonify({'data': None})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api_bp.route('/admin/system-status', methods=['GET'])
@require_admin
def admin_system_status():
    from datetime import datetime, timezone

    stripe_secret = os.getenv('STRIPE_SECRET_KEY', '')
    stripe_publishable = os.getenv('STRIPE_PUBLISHABLE_KEY', '') or os.getenv('VITE_STRIPE_PUBLISHABLE_KEY', '')
    stripe_webhook = os.getenv('STRIPE_WEBHOOK_SECRET', '')
    resend_api_key = os.getenv('RESEND_API_KEY', '')
    email_from = os.getenv('EMAIL_FROM') or os.getenv('RESEND_FROM_EMAIL') or ''

    if stripe_secret.startswith('sk_test_'):
        stripe_mode = 'test'
    elif stripe_secret.startswith('sk_live_'):
        stripe_mode = 'live'
    elif stripe_secret:
        stripe_mode = 'unknown'
    else:
        stripe_mode = 'not_configured'

    price_status = {
        'monthly': {
            'planType': 'monthly',
            'label': 'Premium Monthly',
            'configured': bool(os.getenv('STRIPE_PRICE_ID_MONTHLY')),
            'envVar': 'STRIPE_PRICE_ID_MONTHLY',
            'expectedAmount': 1999,
            'currency': 'usd',
            'mode': 'subscription',
        },
        'lifetime': {
            'planType': 'lifetime',
            'label': 'Lifetime Access',
            'configured': bool(os.getenv('STRIPE_PRICE_ID_LIFETIME')),
            'envVar': 'STRIPE_PRICE_ID_LIFETIME',
            'expectedAmount': 7999,
            'currency': 'usd',
            'mode': 'payment',
        },
        'interviewPass': {
            'planType': 'interviewPass',
            'label': '90-Day Interview Pass',
            'configured': bool(os.getenv('STRIPE_PRICE_ID_INTERVIEW_PASS')),
            'envVar': 'STRIPE_PRICE_ID_INTERVIEW_PASS',
            'expectedAmount': 3999,
            'currency': 'usd',
            'mode': 'payment',
        },
    }

    providers = [
        {
            'provider': 'openai',
            'label': 'OpenAI',
            'configured': bool(os.getenv('OPENAI_API_KEY')),
            'defaultModel': os.getenv('OPENAI_DEFAULT_MODEL', 'gpt-5-mini'),
            'modelCount': 3,
        },
        {
            'provider': 'anthropic',
            'label': 'Anthropic',
            'configured': bool(os.getenv('ANTHROPIC_API_KEY')),
            'defaultModel': os.getenv('ANTHROPIC_DEFAULT_MODEL', 'claude-3-5-sonnet-latest'),
            'modelCount': 2,
        },
        {
            'provider': 'deepseek',
            'label': 'DeepSeek',
            'configured': bool(os.getenv('DEEPSEEK_API_KEY')),
            'defaultModel': os.getenv('DEEPSEEK_DEFAULT_MODEL', 'deepseek-chat'),
            'modelCount': 2,
        },
        {
            'provider': 'nvidia',
            'label': 'NVIDIA',
            'configured': bool(os.getenv('NVIDIA_API_KEY')),
            'defaultModel': os.getenv('NVIDIA_DEFAULT_MODEL', 'meta/llama-3.1-8b-instruct'),
            'modelCount': 3,
        },
    ]

    auto_create_test_prices = (
        stripe_mode == 'test'
        and os.getenv('STRIPE_AUTO_CREATE_TEST_PRICES', 'true').lower() in ('1', 'true', 'yes')
    )
    checkout_ready = bool(stripe_secret) and (
        all(price['configured'] for price in price_status.values()) or auto_create_test_prices
    )

    return jsonify({
        'serverTime': datetime.now(timezone.utc).isoformat(),
        'environment': os.getenv('FLASK_ENV', 'production'),
        'frontendUrl': os.getenv('FRONTEND_URL', ''),
        'ai': {
            'defaultProvider': os.getenv('AI_DEFAULT_PROVIDER', 'nvidia' if os.getenv('NVIDIA_API_KEY') else 'openai'),
            'defaultModel': os.getenv('AI_DEFAULT_MODEL', os.getenv('NVIDIA_DEFAULT_MODEL', 'meta/llama-3.1-8b-instruct')),
            'providers': providers,
        },
        'stripe': {
            'mode': stripe_mode,
            'secretKeyConfigured': bool(stripe_secret),
            'publishableKeyConfigured': bool(stripe_publishable),
            'webhookConfigured': bool(stripe_webhook),
            'autoCreateTestPrices': auto_create_test_prices,
            'checkoutReady': checkout_ready,
            'webhookReady': bool(stripe_secret and stripe_webhook),
            'prices': price_status,
        },
        'database': {
            'urlConfigured': bool(os.getenv('DATABASE_URL')),
        },
        'email': {
            'provider': 'resend' if resend_api_key else ('smtp' if os.getenv('SMTP_HOST') else 'dev'),
            'resendConfigured': bool(resend_api_key),
            'smtpConfigured': bool(os.getenv('SMTP_HOST') and os.getenv('SMTP_USER')),
            'fromConfigured': bool(email_from),
            'fromAddress': email_from,
        },
    })


@api_bp.route('/process-refund', methods=['POST'])
@require_admin
def process_refund():
    import stripe
    user = request.current_user
    data = request.get_json()
    refund_request_id = data.get('refundRequestId')
    admin_notes = data.get('adminNotes')

    if not refund_request_id:
        return jsonify({'error': 'Refund request ID required'}), 400

    refund_request = db.query_one("SELECT * FROM refund_requests WHERE id = %s", (refund_request_id,))
    if not refund_request:
        return jsonify({'error': 'Refund request not found'}), 404

    if refund_request['eligibility_status'] == 'refunded':
        return jsonify({'error': 'Already refunded'}), 400

    if refund_request['eligibility_status'] not in ('eligible', 'approved'):
        return jsonify({'error': 'Not eligible'}), 400

    if not refund_request.get('stripe_payment_intent_id') and not refund_request.get('stripe_charge_id'):
        return jsonify({'error': 'No refundable Stripe payment reference found'}), 400

    stripe.api_key = os.getenv('STRIPE_SECRET_KEY', '')
    if not stripe.api_key:
        return jsonify({'error': 'Stripe secret key is not configured'}), 503

    refund_params = {
        'reason': 'requested_by_customer',
        'metadata': {
            'refund_request_id': str(refund_request_id),
            'processed_by': str(user['id']),
            'customer_reason': refund_request.get('reason') or '',
        },
    }
    if refund_request.get('stripe_payment_intent_id'):
        refund_params['payment_intent'] = refund_request['stripe_payment_intent_id']
    else:
        refund_params['charge'] = refund_request['stripe_charge_id']

    try:
        stripe_refund = stripe.Refund.create(
            **refund_params,
            idempotency_key=f"refund_request_{refund_request_id}",
        )
    except stripe.error.StripeError as e:
        db.execute(
            """UPDATE refund_requests SET eligibility_status = 'denied',
               admin_notes = %s, processed_by = %s, processed_at = now(), updated_at = now()
               WHERE id = %s""",
            (f"Stripe error: {str(e)}\n{admin_notes or ''}", user['id'], refund_request_id)
        )
        return jsonify({'error': f'Stripe refund failed: {str(e)}'}), 502

    db.execute(
        """UPDATE refund_requests SET eligibility_status = 'refunded',
           stripe_refund_id = %s, refunded_at = now(),
           processed_by = %s, processed_at = now(),
           admin_notes = %s, updated_at = now()
           WHERE id = %s""",
        (stripe_refund.id, user['id'], admin_notes, refund_request_id)
    )

    try:
        db.call_function('create_user_notification', (
            refund_request['user_id'], 'refund', 'Refund Processed',
            f"Your refund of ${refund_request['amount']} has been processed.",
            None, json.dumps({'refund_id': str(refund_request_id), 'amount': float(refund_request['amount'])})
        ))
    except Exception:
        pass

    return jsonify({'success': True, 'refundId': stripe_refund.id, 'message': 'Refund processed successfully'})


@api_bp.route('/trigger-rebuild', methods=['POST'])
@require_admin
def trigger_rebuild():
    import requests as http_requests
    user = request.current_user
    data = request.get_json() or {}
    coolify_url = os.getenv('COOLIFY_WEBHOOK_URL')

    if not coolify_url:
        return jsonify({'error': 'Rebuild not configured'}), 503

    from datetime import datetime, timezone
    triggered_at = datetime.now(timezone.utc).isoformat()
    reason = data.get('reason', 'admin_triggered')
    source = data.get('source', 'admin_dashboard')

    try:
        resp = http_requests.post(coolify_url, json={
            'triggered_at': triggered_at,
            'triggered_by': user['id'],
            'source': source,
            'reason': reason,
        }, timeout=10)
        resp.raise_for_status()

        db.call_function('record_rebuild_attempt', (
            user['id'], triggered_at, 'triggered', reason, source, None
        ))

        est_completion = datetime.now(timezone.utc).isoformat()
        return jsonify({
            'success': True,
            'message': 'Rebuild triggered successfully',
            'triggeredAt': triggered_at,
            'estimatedCompletion': est_completion,
        })
    except Exception as e:
        db.call_function('record_rebuild_attempt', (
            user['id'], triggered_at, 'error', reason, source, str(e)
        ))
        return jsonify({'error': f'Failed to trigger rebuild: {str(e)}'}), 502


import os as _os
