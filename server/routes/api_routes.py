import json
import os
import uuid
from flask import Blueprint, request, jsonify
from auth import require_auth, require_admin, optional_auth
import db
from admin_settings import get_admin_setting, save_admin_setting, saved_ai_runtime_config, saved_welcome_message_config
from email_service import (
    send_dashboard_message_email,
    send_refund_alert_admin_email,
    send_support_reply_email,
    send_support_ticket_admin_email,
)
from support_service import (
    admin_recipients,
    get_user_support_context,
    has_cancel_signal,
    has_refund_signal,
    json_dumps,
    normalize_ticket_category,
    normalize_ticket_row,
    notify_admins,
    parse_jsonish,
    utc_now_iso,
)
from routes.ai_routes import (
    _build_support_messages,
    _call_provider_with_fallback,
    _default_model_for_provider,
    _normalize_support_response,
    _select_default_provider,
    _support_fallback_response,
)

api_bp = Blueprint('api', __name__)


def _mask_secret(value):
    value = str(value or '')
    if not value:
        return ''
    if len(value) <= 8:
        return '••••'
    return f"{value[:4]}••••{value[-4:]}"


def _public_ai_runtime_config(config=None):
    config = config if isinstance(config, dict) else saved_ai_runtime_config()
    providers = config.get('providers') if isinstance(config.get('providers'), dict) else {}
    public_providers = {}
    for provider_id, provider_config in providers.items():
        if not isinstance(provider_config, dict):
            continue
        api_key = provider_config.get('apiKey') or provider_config.get('api_key') or ''
        public_providers[provider_id] = {
            **{k: v for k, v in provider_config.items() if k not in {'apiKey', 'api_key'}},
            'apiKeyConfigured': bool(api_key),
            'apiKeyMasked': _mask_secret(api_key),
        }
    return {
        'defaultProvider': config.get('defaultProvider') or config.get('default_provider') or '',
        'defaultModel': config.get('defaultModel') or config.get('default_model') or '',
        'fallbackProviders': config.get('fallbackProviders') or config.get('fallback_providers') or [],
        'providers': public_providers,
    }


def _create_dashboard_message(user_id, title, message, metadata=None, send_email=False):
    user_row = db.query_one("SELECT email FROM users WHERE id = %s", (user_id,))
    if not user_row:
        return False
    notification_id = db.call_function('create_user_notification', (
        user_id,
        'broadcast',
        title,
        message,
        '/messages',
        json_dumps({
            **(metadata or {}),
            'rich_content': True,
            'direct_message': True,
        }),
    ))
    if send_email and user_row.get('email'):
        try:
            send_dashboard_message_email(user_row['email'], title, message, None, str(notification_id or user_id))
        except Exception:
            pass
    return True


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
        'get_user_tickets_with_replies': {'p_user_id': lambda: user['id']},
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
        'support_tickets',
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
    plunk_api_key = os.getenv('PLUNK_SECRET_KEY', '') or os.getenv('PLUNK_API_KEY', '')
    email_from = os.getenv('PLUNK_FROM_EMAIL') or os.getenv('EMAIL_FROM') or ''

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

    def ai_env_value(*names):
        for name in names:
            value = os.getenv(name, '').strip()
            if value:
                return value
        return ''

    def normalize_provider_id(value):
        provider_id = str(value or '').strip().lower().replace(' ', '_')
        allowed = set('abcdefghijklmnopqrstuvwxyz0123456789_-')
        if not provider_id or any(char not in allowed for char in provider_id):
            return ''
        return provider_id

    def safe_int(value, fallback):
        try:
            return int(value)
        except Exception:
            return fallback

    def compatible_provider_statuses():
        statuses = []
        raw_config = ai_env_value(
            'AI_OPENAI_COMPATIBLE_PROVIDERS',
            'OPENAI_COMPATIBLE_PROVIDERS',
            'CUSTOM_LLM_PROVIDERS',
        )
        if not raw_config:
            return statuses

        try:
            parsed = json.loads(raw_config)
        except Exception:
            return statuses

        entries = parsed.get('providers') if isinstance(parsed, dict) else parsed
        if not isinstance(entries, list):
            return statuses

        reserved = {'openai', 'anthropic', 'deepseek', 'nvidia', 'fallback', 'unified'}
        for entry in entries:
            if not isinstance(entry, dict):
                continue
            provider_id = normalize_provider_id(entry.get('provider') or entry.get('id'))
            if not provider_id or provider_id in reserved:
                continue

            api_key_env = entry.get('apiKeyEnvVar') or entry.get('apiKeyEnv') or f'{provider_id.upper()}_API_KEY'
            base_url_env = entry.get('baseUrlEnvVar') or entry.get('baseUrlEnv') or f'{provider_id.upper()}_BASE_URL'
            default_model_env = (
                entry.get('defaultModelEnvVar')
                or entry.get('defaultModelEnv')
                or f'{provider_id.upper()}_DEFAULT_MODEL'
            )
            api_key_configured = bool(ai_env_value(api_key_env) or entry.get('apiKey'))
            base_url = ai_env_value(base_url_env) or str(entry.get('baseUrl') or entry.get('base_url') or '')
            default_model = ai_env_value(default_model_env) or str(entry.get('defaultModel') or 'auto')
            models = entry.get('models') if isinstance(entry.get('models'), list) else []
            statuses.append({
                'provider': provider_id,
                'label': str(entry.get('label') or provider_id.replace('_', ' ').title()),
                'configured': api_key_configured and bool(base_url),
                'defaultModel': default_model,
                'modelCount': len(models) or safe_int(entry.get('modelCount'), 1),
                'apiKeyConfigured': api_key_configured,
                'baseUrlConfigured': bool(base_url),
                'baseUrl': base_url,
                'apiKeyEnvVar': api_key_env,
                'baseUrlEnvVar': base_url_env,
                'defaultModelEnvVar': default_model_env,
                'openAICompatible': True,
                'configurationHint': 'OpenAI-compatible provider from AI_OPENAI_COMPATIBLE_PROVIDERS.',
            })
        return statuses

    unified_key = ai_env_value('UNIFIED_LLM_API_KEY', 'FREELLM_API_KEY', 'OPENAI_COMPATIBLE_API_KEY')
    unified_base_url = ai_env_value('UNIFIED_LLM_BASE_URL', 'FREELLM_BASE_URL', 'OPENAI_COMPATIBLE_BASE_URL')
    unified_default_model = ai_env_value(
        'UNIFIED_LLM_DEFAULT_MODEL',
        'FREELLM_DEFAULT_MODEL',
        'OPENAI_COMPATIBLE_DEFAULT_MODEL',
        'AI_DEFAULT_MODEL',
    ) or 'auto'

    providers = [
        {
            'provider': 'unified',
            'label': 'Unified LLM Proxy',
            'configured': bool(unified_key and unified_base_url),
            'defaultModel': unified_default_model,
            'modelCount': safe_int(os.getenv('UNIFIED_LLM_MODEL_COUNT', '3'), 3),
            'apiKeyConfigured': bool(unified_key),
            'baseUrlConfigured': bool(unified_base_url),
            'baseUrl': unified_base_url,
            'apiKeyEnvVar': 'UNIFIED_LLM_API_KEY',
            'baseUrlEnvVar': 'UNIFIED_LLM_BASE_URL',
            'defaultModelEnvVar': 'UNIFIED_LLM_DEFAULT_MODEL',
            'openAICompatible': True,
            'configurationHint': 'Use this for OpenAI-compatible gateways, routers, and self-hosted LLM proxies.',
        },
        {
            'provider': 'openai',
            'label': 'OpenAI',
            'configured': bool(os.getenv('OPENAI_API_KEY')),
            'defaultModel': os.getenv('OPENAI_DEFAULT_MODEL', 'gpt-5-mini'),
            'modelCount': 3,
            'apiKeyEnvVar': 'OPENAI_API_KEY',
        },
        {
            'provider': 'anthropic',
            'label': 'Anthropic',
            'configured': bool(os.getenv('ANTHROPIC_API_KEY')),
            'defaultModel': os.getenv('ANTHROPIC_DEFAULT_MODEL', 'claude-3-haiku-20240307'),
            'modelCount': 3,
            'apiKeyEnvVar': 'ANTHROPIC_API_KEY',
        },
        {
            'provider': 'deepseek',
            'label': 'DeepSeek',
            'configured': bool(os.getenv('DEEPSEEK_API_KEY')),
            'defaultModel': os.getenv('DEEPSEEK_DEFAULT_MODEL', 'deepseek-chat'),
            'modelCount': 2,
            'apiKeyEnvVar': 'DEEPSEEK_API_KEY',
        },
        {
            'provider': 'nvidia',
            'label': 'NVIDIA',
            'configured': bool(os.getenv('NVIDIA_API_KEY')),
            'defaultModel': os.getenv('NVIDIA_DEFAULT_MODEL', 'meta/llama-3.1-8b-instruct'),
            'modelCount': 3,
            'apiKeyEnvVar': 'NVIDIA_API_KEY',
        },
    ]
    providers.extend(compatible_provider_statuses())

    saved_ai = saved_ai_runtime_config()
    saved_providers = saved_ai.get('providers') if isinstance(saved_ai.get('providers'), dict) else {}
    for provider in providers:
        saved_provider = saved_providers.get(provider['provider']) if isinstance(saved_providers, dict) else None
        if not isinstance(saved_provider, dict):
            continue
        saved_key = saved_provider.get('apiKey') or saved_provider.get('api_key') or ''
        saved_base_url = saved_provider.get('baseUrl') or saved_provider.get('base_url') or ''
        saved_model = saved_provider.get('defaultModel') or saved_provider.get('default_model') or ''
        if saved_key:
            provider['apiKeyConfigured'] = True
        if saved_base_url:
            provider['baseUrlConfigured'] = True
            provider['baseUrl'] = saved_base_url
        if saved_model:
            provider['defaultModel'] = saved_model
        provider['managedInAdmin'] = True
        provider['configured'] = bool(
            provider.get('apiKeyConfigured') and (
                not provider.get('openAICompatible') or provider.get('baseUrlConfigured') or provider.get('baseUrl')
            )
        )

    default_provider = saved_ai.get('defaultProvider') or saved_ai.get('default_provider') or os.getenv('AI_DEFAULT_PROVIDER')
    if not default_provider:
        default_provider = 'unified' if unified_key and unified_base_url else ('nvidia' if os.getenv('NVIDIA_API_KEY') else 'openai')
    default_model = saved_ai.get('defaultModel') or saved_ai.get('default_model') or os.getenv('AI_DEFAULT_MODEL')
    if not default_model:
        provider_match = next((p for p in providers if p.get('provider') == default_provider), None)
        default_model = provider_match.get('defaultModel') if provider_match else (
            unified_default_model if default_provider == 'unified'
            else os.getenv('NVIDIA_DEFAULT_MODEL', 'meta/llama-3.1-8b-instruct')
        )

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
            'defaultProvider': default_provider,
            'defaultModel': default_model,
            'providers': providers,
            'settings': _public_ai_runtime_config(saved_ai),
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
            'provider': 'plunk' if plunk_api_key else 'dev',
            'plunkConfigured': bool(plunk_api_key),
            'fromConfigured': bool(email_from),
            'fromAddress': email_from,
            'apiUrl': os.getenv('PLUNK_API_URL', 'https://next-api.useplunk.com/v1/send'),
        },
    })


@api_bp.route('/admin/ai-settings', methods=['GET', 'POST'])
@require_admin
def admin_ai_settings_endpoint():
    user = request.current_user
    if request.method == 'GET':
        return jsonify({'success': True, 'settings': _public_ai_runtime_config()})

    data = request.get_json() or {}
    providers = data.get('providers') if isinstance(data.get('providers'), dict) else {}
    sanitized_providers = {}
    existing = saved_ai_runtime_config()
    existing_providers = existing.get('providers') if isinstance(existing.get('providers'), dict) else {}

    for provider_id, provider_config in providers.items():
        if not isinstance(provider_config, dict):
            continue
        provider_key = str(provider_id or '').strip().lower()
        if not provider_key:
            continue
        previous = existing_providers.get(provider_key) if isinstance(existing_providers, dict) else {}
        previous = previous if isinstance(previous, dict) else {}
        api_key = provider_config.get('apiKey')
        if not api_key and (provider_config.get('keepExistingApiKey') or provider_config.get('apiKeyConfigured')):
            api_key = previous.get('apiKey') or previous.get('api_key')
        sanitized = {
            'enabled': bool(provider_config.get('enabled', True)),
            'defaultModel': str(provider_config.get('defaultModel') or provider_config.get('default_model') or '').strip(),
        }
        base_url = str(provider_config.get('baseUrl') or provider_config.get('base_url') or '').strip()
        if base_url:
            sanitized['baseUrl'] = base_url
        if api_key:
            sanitized['apiKey'] = str(api_key).strip()
        sanitized_providers[provider_key] = sanitized

    fallback = data.get('fallbackProviders') or data.get('fallback_providers') or []
    if isinstance(fallback, str):
        fallback = [item.strip() for item in fallback.split(',') if item.strip()]
    if not isinstance(fallback, list):
        fallback = []

    saved = save_admin_setting('ai_runtime_config', {
        'defaultProvider': str(data.get('defaultProvider') or data.get('default_provider') or '').strip().lower(),
        'defaultModel': str(data.get('defaultModel') or data.get('default_model') or '').strip(),
        'fallbackProviders': [str(item).strip().lower() for item in fallback if str(item).strip()],
        'providers': sanitized_providers,
    }, user.get('id'))
    return jsonify({'success': True, 'settings': _public_ai_runtime_config(saved)})


@api_bp.route('/admin/welcome-messages', methods=['GET', 'POST'])
@require_admin
def admin_welcome_messages_endpoint():
    user = request.current_user
    defaults = {
        'signupEnabled': True,
        'upgradeEnabled': True,
        'sendEmail': True,
        'signupTitle': 'Welcome to InterviewReady',
        'signupMessage': 'Your free account is ready. Start with your dashboard, build your timeline, and save questions for later review.',
        'upgradeTitle': 'Premium access unlocked',
        'upgradeMessage': 'Thank you for upgrading. Your premium downloads, partner sync, and Robin practice access are now available in your dashboard.',
    }
    current = {**defaults, **(saved_welcome_message_config() or {})}
    if request.method == 'GET':
        return jsonify({'success': True, 'settings': current})

    data = request.get_json() or {}
    saved = save_admin_setting('welcome_messages', {
        'signupEnabled': bool(data.get('signupEnabled', current['signupEnabled'])),
        'upgradeEnabled': bool(data.get('upgradeEnabled', current['upgradeEnabled'])),
        'sendEmail': bool(data.get('sendEmail', current['sendEmail'])),
        'signupTitle': str(data.get('signupTitle') or current['signupTitle'])[:200],
        'signupMessage': str(data.get('signupMessage') or current['signupMessage'])[:6000],
        'upgradeTitle': str(data.get('upgradeTitle') or current['upgradeTitle'])[:200],
        'upgradeMessage': str(data.get('upgradeMessage') or current['upgradeMessage'])[:6000],
    }, user.get('id'))
    return jsonify({'success': True, 'settings': {**defaults, **(saved or {})}})


@api_bp.route('/admin/users', methods=['GET', 'POST'])
@require_admin
def admin_users():
    limit = request.args.get('limit', 100, type=int) or 100
    limit = max(1, min(limit, 250))

    users_sql = """
        WITH ticket_stats AS (
            SELECT
                user_id,
                COUNT(*) AS total_tickets,
                COUNT(*) FILTER (WHERE status = 'open') AS open_tickets,
                MAX(created_at)::text AS last_ticket_at
            FROM support_tickets
            GROUP BY user_id
        ),
        partner_stats AS (
            SELECT
                owner_user_id AS user_id,
                COUNT(*) FILTER (WHERE status = 'connected') AS connected_partners,
                COUNT(*) FILTER (WHERE status = 'pending') AS pending_partners
            FROM (
                SELECT user_id AS owner_user_id, status FROM partner_connections
                UNION ALL
                SELECT partner_id AS owner_user_id, status FROM partner_connections
            ) all_partner_connections
            GROUP BY owner_user_id
        )
        SELECT
            u.id::text AS id,
            u.email,
            u.created_at::text AS joined_at,
            u.updated_at::text AS updated_at,
            COALESCE(
                NULLIF(p.display_name, ''),
                NULLIF(TRIM(CONCAT_WS(' ', p.first_name, p.last_name)), ''),
                u.email
            ) AS display_name,
            COALESCE(p.role, 'user') AS role,
            COALESCE(p.is_active, true) AS is_active,
            COALESCE(s.plan_type, 'trial') AS plan_type,
            COALESCE(s.status, 'trialing') AS subscription_status,
            s.provider,
            s.provider_customer_id,
            s.provider_subscription_id,
            s.trial_ends_at::text AS trial_ends_at,
            s.current_period_ends_at::text AS current_period_ends_at,
            s.ends_at::text AS ends_at,
            COALESCE(ds.total_downloads, 0) AS total_downloads,
            COALESCE(ds.unique_pdfs_downloaded, 0) AS unique_pdfs_downloaded,
            ds.last_download_at::text AS last_download_at,
            COALESCE(ts.total_tickets, 0) AS total_tickets,
            COALESCE(ts.open_tickets, 0) AS open_tickets,
            ts.last_ticket_at,
            COALESCE(ps.connected_partners, 0) AS connected_partners,
            COALESCE(ps.pending_partners, 0) AS pending_partners
        FROM users u
        LEFT JOIN user_profiles p ON p.user_id = u.id
        LEFT JOIN user_subscriptions s ON s.user_id = u.id
        LEFT JOIN pdf_download_summaries ds ON ds.user_id = u.id
        LEFT JOIN ticket_stats ts ON ts.user_id = u.id
        LEFT JOIN partner_stats ps ON ps.user_id = u.id
        ORDER BY u.created_at DESC
        LIMIT %s
    """

    totals_sql = """
        WITH ticket_stats AS (
            SELECT user_id, COUNT(*) FILTER (WHERE status = 'open') AS open_tickets
            FROM support_tickets
            GROUP BY user_id
        )
        SELECT
            COUNT(*) AS total_users,
            COUNT(*) FILTER (
                WHERE COALESCE(s.plan_type, 'trial') <> 'trial'
                AND COALESCE(s.status, 'trialing') IN ('active', 'canceled', 'grace_period')
            ) AS paid_users,
            COUNT(*) FILTER (WHERE COALESCE(s.status, 'trialing') = 'trialing') AS trial_users,
            COUNT(*) FILTER (WHERE COALESCE(ts.open_tickets, 0) > 0) AS users_with_open_tickets
        FROM users u
        LEFT JOIN user_subscriptions s ON s.user_id = u.id
        LEFT JOIN ticket_stats ts ON ts.user_id = u.id
    """

    try:
        rows = db.query_all(users_sql, (limit,))
        totals = db.query_one(totals_sql) or {}
        return jsonify({
            'users': rows,
            'totals': {
                'totalUsers': totals.get('total_users', 0),
                'paidUsers': totals.get('paid_users', 0),
                'trialUsers': totals.get('trial_users', 0),
                'usersWithOpenTickets': totals.get('users_with_open_tickets', 0),
            },
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api_bp.route('/admin/users/<user_id>/message', methods=['POST'])
@require_admin
def admin_send_user_message(user_id):
    data = request.get_json() or {}
    title = (data.get('title') or '').strip()[:200]
    message = (data.get('message') or '').strip()[:10000]
    send_email = bool(data.get('sendEmail', data.get('send_email', True)))

    if not title or not message:
        return jsonify({'error': 'Title and message are required'}), 400

    try:
        ok = _create_dashboard_message(
            user_id,
            title,
            message,
            {'created_from': 'admin_user_management', 'rich_content': True},
            send_email,
        )
        if not ok:
            return jsonify({'error': 'User not found'}), 404
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


def _support_ticket_with_user(ticket_id):
    return db.query_one(
        """
        SELECT t.*, u.email AS user_email
        FROM support_tickets t
        JOIN users u ON u.id = t.user_id
        WHERE t.id = %s
        """,
        (ticket_id,),
    )


def _send_support_admin_emails(ticket, context, refund_signal):
    sent = 0
    for recipient in admin_recipients():
        email = recipient.get('email')
        if not email:
            continue
        try:
            send_support_ticket_admin_email(email, ticket, context)
            if refund_signal:
                send_refund_alert_admin_email(email, ticket, context)
            sent += 1
        except Exception:
            pass
    return sent


def _support_conversation_item(role, content, source='support_ai', metadata=None):
    return {
        'role': role,
        'content': str(content or '').strip()[:2400],
        'source': source,
        'createdAt': utc_now_iso(),
        'metadata': metadata or {},
    }


def _support_bool(value, default=False):
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {'1', 'true', 'yes', 'y'}
    if value is None:
        return default
    return bool(value)


def _run_support_ai(category, subject, message, context, conversation):
    provider = _select_default_provider()
    model = _default_model_for_provider(provider)
    messages = _build_support_messages(category, subject, message, context, conversation)
    try:
        response_text, actual_provider, actual_model, fallback_used, provider_errors = _call_provider_with_fallback(
            provider,
            model,
            messages,
        )
        normalized = _normalize_support_response(response_text, actual_provider, actual_model, category)
        normalized['requestedProvider'] = provider
        normalized['requestedModel'] = model
        normalized['providerFallback'] = fallback_used
        normalized['providerErrors'] = provider_errors[-2:]
        return normalized
    except Exception as e:
        return _support_fallback_response(category, subject, message, str(e))


def _support_needs_admin(ai_response, category, refund_signal, cancel_signal):
    urgency = str((ai_response or {}).get('urgency') or '').lower()
    can_resolve = _support_bool((ai_response or {}).get('canResolve'), True)
    needs_review = _support_bool((ai_response or {}).get('needsAdminReview'), False)
    should_create_ticket = _support_bool((ai_response or {}).get('shouldCreateTicket'), False)
    return bool(
        urgency == 'high'
        or needs_review
        or not can_resolve
        or refund_signal
        or cancel_signal
        or (category in {'billing', 'refund'} and should_create_ticket)
    )


def _serialize_broadcast(row):
    row = row or {}
    created_at = row.get('created_at')
    updated_at = row.get('updated_at')
    scheduled_at = row.get('scheduled_at')
    return {
        'id': str(row.get('id') or ''),
        'title': row.get('title') or '',
        'message': row.get('message') or '',
        'audienceType': row.get('audience_type') or 'all_users',
        'isActive': bool(row.get('is_active', True)),
        'sentCount': int(row.get('sent_count') or 0),
        'scheduledAt': scheduled_at.isoformat() if hasattr(scheduled_at, 'isoformat') else scheduled_at,
        'sendEmail': bool(row.get('send_email', True)),
        'createdBy': str(row.get('created_by') or '') or None,
        'createdAt': created_at.isoformat() if hasattr(created_at, 'isoformat') else created_at,
        'updatedAt': updated_at.isoformat() if hasattr(updated_at, 'isoformat') else updated_at,
    }


def _broadcast_recipients(audience_type):
    return db.query_all(
        """
        SELECT u.id::text AS user_id, u.email,
               COALESCE(s.plan_type, 'trial') AS plan_type,
               COALESCE(s.status, 'trialing') AS subscription_status
        FROM users u
        LEFT JOIN user_subscriptions s ON s.user_id = u.id
        WHERE COALESCE(u.email, '') <> ''
          AND CASE %s
            WHEN 'all_users' THEN true
            WHEN 'trial_users' THEN s.user_id IS NULL OR COALESCE(s.plan_type, 'trial') = 'trial' OR COALESCE(s.status, 'trialing') = 'trialing'
            WHEN 'premium_users' THEN COALESCE(s.plan_type, 'trial') IN ('monthly', 'lifetime', 'interviewPass') AND COALESCE(s.status, 'active') IN ('active', 'canceled', 'grace_period')
            WHEN 'expired_users' THEN COALESCE(s.status, '') IN ('expired', 'canceled', 'past_due') OR (s.current_period_ends_at < now() AND COALESCE(s.status, '') <> 'active')
            WHEN 'free_users' THEN s.user_id IS NULL OR COALESCE(s.plan_type, 'trial') = 'trial'
            ELSE true
          END
        LIMIT 2000
        """,
        (audience_type or 'all_users',),
    )


def _publish_broadcast_row(row):
    if not row or not row.get('is_active', True):
        return 0

    count = 0
    for recipient in _broadcast_recipients(row.get('audience_type') or 'all_users'):
        try:
            db.call_function('create_user_notification', (
                recipient['user_id'],
                'broadcast',
                row.get('title') or 'Dashboard message',
                row.get('message') or '',
                '/messages',
                json_dumps({
                    'broadcast_id': str(row.get('id') or ''),
                    'audience_type': row.get('audience_type') or 'all_users',
                    'rich_content': True,
                }),
            ))
            count += 1
            if row.get('send_email', True):
                send_dashboard_message_email(
                    recipient['email'],
                    row.get('title') or 'New InterviewReady dashboard message',
                    row.get('message') or '',
                    None,
                    str(row.get('id') or ''),
                )
        except Exception:
            continue

    try:
        db.execute(
            """
            UPDATE broadcast_messages
            SET sent_count = %s, updated_at = now()
            WHERE id = %s
            """,
            (count, row.get('id')),
        )
    except Exception:
        pass
    return count


def _publish_due_broadcast_rows():
    rows = db.query_all(
        """
        SELECT id, title, message, audience_type, is_active, sent_count,
               scheduled_at, send_email, created_by, created_at, updated_at
        FROM broadcast_messages
        WHERE is_active = true
          AND COALESCE(sent_count, 0) = 0
          AND scheduled_at IS NOT NULL
          AND scheduled_at <= now()
        ORDER BY scheduled_at ASC
        LIMIT 25
        """
    )
    total = 0
    for row in rows:
        total += _publish_broadcast_row(row)
    return rows, total


@api_bp.route('/admin/broadcasts', methods=['GET', 'POST'])
@require_admin
def admin_broadcasts_endpoint():
    user = request.current_user
    if request.method == 'GET':
      _publish_due_broadcast_rows()
      rows = db.query_all(
          """
          SELECT id, title, message, audience_type, is_active, sent_count,
                 scheduled_at, send_email, created_by, created_at, updated_at
          FROM broadcast_messages
          ORDER BY created_at DESC
          LIMIT 200
          """
      )
      return jsonify({'success': True, 'broadcasts': [_serialize_broadcast(row) for row in rows]})

    data = request.get_json() or {}
    title = (data.get('title') or '').strip()[:200]
    message = (data.get('message') or '').strip()[:10000]
    audience_type = (data.get('audienceType') or data.get('audience_type') or 'all_users').strip()
    if audience_type not in {'all_users', 'trial_users', 'premium_users', 'expired_users', 'free_users'}:
        audience_type = 'all_users'
    scheduled_at = data.get('scheduledAt') or data.get('scheduled_at') or None
    send_email = bool(data.get('sendEmail', data.get('send_email', True)))
    publish_now = bool(data.get('publishNow', data.get('publish_now', True)))

    if not title or not message:
        return jsonify({'error': 'Title and message are required'}), 400

    try:
        row = db.execute_returning(
            """
            INSERT INTO broadcast_messages (
              title, message, audience_type, is_active, scheduled_at,
              send_email, created_by, metadata
            )
            VALUES (%s, %s, %s, true, %s, %s, %s, %s::jsonb)
            RETURNING id, title, message, audience_type, is_active, sent_count,
                      scheduled_at, send_email, created_by, created_at, updated_at
            """,
            (
                title,
                message,
                audience_type,
                scheduled_at,
                send_email,
                user['id'],
                json_dumps({'rich_content': True, 'created_from': 'admin_portal'}),
            ),
        )
        sent_count = _publish_broadcast_row(row) if publish_now else 0
        if sent_count:
            row = db.query_one(
                """
                SELECT id, title, message, audience_type, is_active, sent_count,
                       scheduled_at, send_email, created_by, created_at, updated_at
                FROM broadcast_messages
                WHERE id = %s
                """,
                (row['id'],),
            )
        return jsonify({'success': True, 'broadcast': _serialize_broadcast(row), 'sentCount': sent_count})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api_bp.route('/admin/broadcasts/<broadcast_id>/publish', methods=['POST'])
@require_admin
def publish_admin_broadcast(broadcast_id):
    row = db.query_one(
        """
        SELECT id, title, message, audience_type, is_active, sent_count,
               scheduled_at, send_email, created_by, created_at, updated_at
        FROM broadcast_messages
        WHERE id = %s
        """,
        (broadcast_id,),
    )
    if not row:
        return jsonify({'error': 'Broadcast not found'}), 404
    try:
        sent_count = _publish_broadcast_row(row)
        return jsonify({'success': True, 'sentCount': sent_count})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api_bp.route('/admin/broadcasts/publish-due', methods=['POST'])
@require_admin
def publish_due_admin_broadcasts():
    rows, total = _publish_due_broadcast_rows()
    return jsonify({'success': True, 'published': len(rows), 'sentCount': total})


@api_bp.route('/broadcasts/publish-due', methods=['POST'])
@require_auth
def publish_due_user_broadcasts():
    rows, total = _publish_due_broadcast_rows()
    return jsonify({'success': True, 'published': len(rows), 'sentCount': total})


@api_bp.route('/support/tickets', methods=['POST'])
@require_auth
def create_support_ticket_endpoint():
    user = request.current_user
    data = request.get_json() or {}
    subject = (data.get('subject') or '').strip()[:200]
    category = normalize_ticket_category((data.get('category') or 'other').strip())
    message = (data.get('message') or '').strip()[:6000]
    ai_summary = (data.get('aiSummary') or data.get('ai_summary') or None)
    ai_suggested_reply = (data.get('aiSuggestedReply') or data.get('ai_suggested_reply') or None)
    ai_triage = parse_jsonish(data.get('aiTriage') or data.get('ai_triage'), {})

    if not subject or not message:
        return jsonify({'error': 'Subject and message are required'}), 400

    context = get_user_support_context(user['id'])
    conversation = ai_triage.get('supportConversation')
    if not isinstance(conversation, list):
        conversation = []
    if not conversation:
        conversation.append(_support_conversation_item('user', message, 'user', {'initial': True}))

    ai_response = None
    if not ai_suggested_reply:
        ai_response = _run_support_ai(category, subject, message, context, conversation)
        ai_summary = ai_response.get('summary') or ai_summary
        ai_suggested_reply = ai_response.get('reply') or ai_suggested_reply
        if category == 'other' and ai_response.get('recommendedCategory'):
            category = normalize_ticket_category(ai_response.get('recommendedCategory'))
        if not subject and ai_response.get('suggestedTicketSubject'):
            subject = ai_response.get('suggestedTicketSubject')
    else:
        ai_response = {
            'reply': ai_suggested_reply,
            'summary': ai_summary,
            'urgency': ai_triage.get('urgency') or 'normal',
            'recommendedCategory': ai_triage.get('recommendedCategory') or category,
            'provider': ai_triage.get('provider'),
            'model': ai_triage.get('model'),
            'fallback': ai_triage.get('fallback', False),
            'canResolve': ai_triage.get('canResolve', True),
            'needsAdminReview': ai_triage.get('needsAdminReview', False),
            'shouldCreateTicket': ai_triage.get('shouldCreateTicket', True),
        }

    if ai_suggested_reply and not any(item.get('role') == 'assistant' for item in conversation if isinstance(item, dict)):
        conversation.append(_support_conversation_item(
            'assistant',
            ai_suggested_reply,
            'support_ai',
            {
                'urgency': ai_response.get('urgency'),
                'provider': ai_response.get('provider'),
                'model': ai_response.get('model'),
                'fallback': bool(ai_response.get('fallback', False)),
            },
        ))

    refund_signal = has_refund_signal(category, subject, message, ai_triage)
    cancel_signal = has_cancel_signal(category, subject, message, ai_triage)
    needs_admin_review = _support_needs_admin(ai_response, category, refund_signal, cancel_signal)
    ai_triage.update({
        'refundSignal': refund_signal,
        'cancelSignal': cancel_signal,
        'urgency': ai_response.get('urgency') or ai_triage.get('urgency') or 'normal',
        'recommendedCategory': ai_response.get('recommendedCategory') or category,
        'canResolve': _support_bool(ai_response.get('canResolve'), True),
        'needsAdminReview': needs_admin_review,
        'adminUrgent': needs_admin_review,
        'shouldCreateTicket': _support_bool(ai_response.get('shouldCreateTicket'), True),
        'escalationReason': ai_response.get('escalationReason') or (
            'AI marked this ticket for admin review.'
            if needs_admin_review else ''
        ),
        'supportConversation': conversation,
        'refundEligibilityStatus': (context.get('refundEligibility') or {}).get('status'),
        'retentionOfferEligible': bool((context.get('retentionOffer') or {}).get('eligible')),
    })

    try:
        ticket_id = db.call_function('create_support_ticket', (
            user['id'],
            subject,
            category,
            message,
            ai_summary,
            ai_suggested_reply,
            json_dumps(ai_triage),
        ))
        ticket = _support_ticket_with_user(ticket_id)
        if not ticket:
            return jsonify({'error': 'Ticket was created but could not be loaded'}), 500

        notify_count = notify_admins(
            'Urgent Support Ticket' if needs_admin_review else ('Refund Review Ticket' if refund_signal else 'New Support Ticket'),
            f'{user["email"]}: {subject}',
            {
                'ticket_id': str(ticket_id),
                'user_id': user['id'],
                'category': category,
                'refund_signal': refund_signal,
                'cancel_signal': cancel_signal,
                'admin_urgent': needs_admin_review,
                'urgency': ai_triage.get('urgency'),
                'ai_can_resolve': ai_triage.get('canResolve'),
                'escalation_reason': ai_triage.get('escalationReason'),
                'refund_eligibility': context.get('refundEligibility'),
                'retention_offer': context.get('retentionOffer'),
            },
            'refund' if refund_signal else 'support',
        )
        normalized = normalize_ticket_row(ticket, context)
        email_count = _send_support_admin_emails(normalized, context, refund_signal)

        return jsonify({
            'success': True,
            'ticket': normalized,
            'adminNotificationsCreated': notify_count,
            'adminEmailsSent': email_count,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api_bp.route('/support/tickets/<ticket_id>/reply', methods=['POST'])
@require_auth
def user_reply_support_ticket(ticket_id):
    user = request.current_user
    data = request.get_json() or {}
    message = (data.get('message') or '').strip()[:4000]
    if not message:
        return jsonify({'error': 'Reply message is required'}), 400

    ticket = _support_ticket_with_user(ticket_id)
    if not ticket or str(ticket.get('user_id')) != str(user['id']):
        return jsonify({'error': 'Ticket not found'}), 404

    context = get_user_support_context(user['id'])
    category = normalize_ticket_category(ticket.get('category') or 'other')
    subject = ticket.get('subject') or 'Support request'
    ai_triage = parse_jsonish(ticket.get('ai_triage'), {})
    conversation = ai_triage.get('supportConversation')
    if not isinstance(conversation, list):
        conversation = [
            _support_conversation_item('user', ticket.get('message') or '', 'user', {'initial': True})
        ]
        if ticket.get('ai_suggested_reply'):
            conversation.append(_support_conversation_item(
                'assistant',
                ticket.get('ai_suggested_reply'),
                'support_ai',
                {'restored': True},
            ))

    conversation.append(_support_conversation_item('user', message, 'user'))
    ai_response = _run_support_ai(category, subject, message, context, conversation)
    ai_reply = ai_response.get('reply') or 'Thanks. I sent this to support for review.'
    conversation.append(_support_conversation_item(
        'assistant',
        ai_reply,
        'support_ai',
        {
            'urgency': ai_response.get('urgency'),
            'provider': ai_response.get('provider'),
            'model': ai_response.get('model'),
            'fallback': bool(ai_response.get('fallback', False)),
        },
    ))

    refund_signal = has_refund_signal(category, subject, message, ai_triage)
    cancel_signal = has_cancel_signal(category, subject, message, ai_triage)
    needs_admin_review = _support_needs_admin(ai_response, category, refund_signal, cancel_signal)
    ai_triage.update({
        'refundSignal': bool(ai_triage.get('refundSignal') or refund_signal),
        'cancelSignal': bool(ai_triage.get('cancelSignal') or cancel_signal),
        'urgency': ai_response.get('urgency') or ai_triage.get('urgency') or 'normal',
        'recommendedCategory': ai_response.get('recommendedCategory') or category,
        'canResolve': _support_bool(ai_response.get('canResolve'), True),
        'needsAdminReview': bool(ai_triage.get('needsAdminReview') or needs_admin_review),
        'adminUrgent': bool(ai_triage.get('adminUrgent') or needs_admin_review),
        'shouldCreateTicket': _support_bool(ai_response.get('shouldCreateTicket'), True),
        'escalationReason': ai_response.get('escalationReason') or ai_triage.get('escalationReason') or '',
        'supportConversation': conversation,
    })

    try:
        refreshed = db.execute_returning(
            """
            UPDATE support_tickets
            SET ai_summary = COALESCE(%s, ai_summary),
                ai_suggested_reply = %s,
                ai_triage = %s::jsonb,
                last_ai_assisted_at = now(),
                status = CASE WHEN status = 'closed' THEN 'open' ELSE status END,
                closed_at = CASE WHEN status = 'closed' THEN NULL ELSE closed_at END,
                updated_at = now()
            WHERE id = %s AND user_id = %s
            RETURNING *
            """,
            (
                ai_response.get('summary'),
                ai_reply,
                json_dumps(ai_triage),
                ticket_id,
                user['id'],
            ),
        )
        if not refreshed:
            return jsonify({'error': 'Ticket could not be updated'}), 500

        try:
            db.call_function('create_user_notification', (
                user['id'],
                'support',
                'AI Support Replied',
                ai_reply[:900],
                '/messages',
                json_dumps({'ticket_id': ticket_id, 'support_ai_reply': True, 'rich_content': True}),
            ))
        except Exception:
            pass

        refreshed['user_email'] = ticket['user_email']
        normalized = normalize_ticket_row(refreshed, context)
        notify_count = 0
        email_count = 0
        if needs_admin_review:
            notify_count = notify_admins(
                'Urgent Support Follow-up',
                f'{user["email"]}: {subject}',
                {
                    'ticket_id': ticket_id,
                    'user_id': user['id'],
                    'category': category,
                    'admin_urgent': True,
                    'urgency': ai_triage.get('urgency'),
                    'escalation_reason': ai_triage.get('escalationReason'),
                },
                'refund' if refund_signal else 'support',
            )
            email_count = _send_support_admin_emails(normalized, context, refund_signal)

        return jsonify({
            'success': True,
            'ticket': normalized,
            'reply': ai_reply,
            'adminNotificationsCreated': notify_count,
            'adminEmailsSent': email_count,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api_bp.route('/admin/support/tickets', methods=['GET', 'POST'])
@require_admin
def admin_support_tickets():
    data = request.get_json(silent=True) or {}
    status_filter = request.args.get('status') or data.get('status') or 'active'
    limit = request.args.get('limit', data.get('limit', 100), type=int) if request.method == 'GET' else int(data.get('limit', 100) or 100)
    limit = max(1, min(limit, 250))

    conditions = []
    params = []
    if status_filter == 'active':
        conditions.append("t.status IN ('open', 'replied')")
    elif status_filter in ('open', 'replied', 'closed'):
        conditions.append('t.status = %s')
        params.append(status_filter)

    where_sql = f"WHERE {' AND '.join(conditions)}" if conditions else ''
    rows = db.query_all(
        f"""
        SELECT t.*, u.email AS user_email
        FROM support_tickets t
        JOIN users u ON u.id = t.user_id
        {where_sql}
        ORDER BY
          CASE t.status WHEN 'open' THEN 0 WHEN 'replied' THEN 1 ELSE 2 END,
          t.created_at DESC
        LIMIT %s
        """,
        params + [limit],
    )

    tickets = []
    for row in rows:
        context = get_user_support_context(str(row['user_id']))
        tickets.append(normalize_ticket_row(row, context))

    return jsonify({
        'tickets': tickets,
        'counts': {
            'open': sum(1 for ticket in tickets if ticket['status'] == 'open'),
            'replied': sum(1 for ticket in tickets if ticket['status'] == 'replied'),
            'closed': sum(1 for ticket in tickets if ticket['status'] == 'closed'),
            'refundSignals': sum(1 for ticket in tickets if ticket.get('refundSignal')),
        },
    })


@api_bp.route('/admin/support/tickets/<ticket_id>/reply', methods=['POST'])
@require_admin
def admin_reply_support_ticket(ticket_id):
    user = request.current_user
    data = request.get_json() or {}
    reply = (data.get('reply') or '').strip()
    if not reply:
        return jsonify({'error': 'Reply is required'}), 400

    ticket = _support_ticket_with_user(ticket_id)
    if not ticket:
        return jsonify({'error': 'Ticket not found'}), 404

    try:
        updated = db.call_function('reply_to_support_ticket', (ticket_id, user['id'], reply))
        if not updated:
            return jsonify({'error': 'Ticket could not be updated'}), 500
        refreshed = _support_ticket_with_user(ticket_id)
        try:
            send_support_reply_email(refreshed['user_email'], refreshed, reply)
        except Exception:
            pass
        context = get_user_support_context(str(refreshed['user_id']))
        return jsonify({'success': True, 'ticket': normalize_ticket_row(refreshed, context)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api_bp.route('/admin/support/tickets/<ticket_id>/close', methods=['POST'])
@require_admin
def admin_close_support_ticket(ticket_id):
    ticket = _support_ticket_with_user(ticket_id)
    if not ticket:
        return jsonify({'error': 'Ticket not found'}), 404

    try:
        refreshed = db.execute_returning(
            """
            UPDATE support_tickets
            SET status = 'closed', closed_at = now(), updated_at = now()
            WHERE id = %s
            RETURNING *
            """,
            (ticket_id,),
        )
        try:
            db.call_function('create_user_notification', (
                str(ticket['user_id']),
                'support',
                'Support Ticket Closed',
                f'Your support ticket "{ticket["subject"]}" has been closed.',
                None,
                json_dumps({'ticket_id': ticket_id}),
            ))
        except Exception:
            pass
        refreshed['user_email'] = ticket['user_email']
        context = get_user_support_context(str(refreshed['user_id']))
        return jsonify({'success': True, 'ticket': normalize_ticket_row(refreshed, context)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api_bp.route('/admin/memory-status', methods=['GET'])
@require_admin
def admin_memory_status():
    try:
        answer_stats = db.query_one(
            """
            SELECT
              COUNT(*) AS total_candidates,
              COUNT(*) FILTER (WHERE review_status = 'pending') AS pending_review,
              COUNT(*) FILTER (WHERE review_status = 'approved') AS approved_count,
              COUNT(*) FILTER (WHERE approved_for_publication = true) AS approved_for_publication,
              COUNT(*) FILTER (WHERE published_slug IS NOT NULL) AS published_examples,
              COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) AS captured_today
            FROM answer_example_candidates
            """
        ) or {}
        page_stats = db.query_one(
            """
            SELECT
              COUNT(*) AS total_pages,
              COUNT(*) FILTER (WHERE status = 'approved') AS approved_pages,
              COUNT(*) FILTER (WHERE is_published = true) AS published_pages,
              COUNT(*) FILTER (WHERE include_in_sitemap = true) AS sitemap_pages,
              COUNT(*) FILTER (WHERE noindex_override = true) AS noindex_pages
            FROM seo_expansion_pages
            """
        ) or {}
        question_stats = db.query_one(
            """
            SELECT
              COUNT(*) AS tracked_question_states,
              COUNT(DISTINCT user_id) AS users_with_question_state
            FROM question_states
            WHERE COALESCE(comfort_status, 'not-seen') <> 'not-seen'
               OR is_saved_for_later = true
            """
        ) or {}
        agent_memory_stats = db.query_one(
            """
            SELECT
              COUNT(*) AS total_entries,
              COUNT(DISTINCT user_id) AS users_with_agent_memory,
              COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) AS captured_today
            FROM dashboard_agent_memory
            """
        ) or {}
        plan_rows = db.query_all(
            """
            SELECT plan_type, name, max_turns_per_session, max_sessions_per_day,
                   can_use_ai, can_choose_provider, can_choose_model
            FROM plan_config
            ORDER BY CASE plan_type
              WHEN 'trial' THEN 0 WHEN 'monthly' THEN 1
              WHEN 'interviewPass' THEN 2 WHEN 'lifetime' THEN 3 ELSE 4 END
            """
        )
        return jsonify({
            'answerCandidates': answer_stats,
            'seoExpansionPages': page_stats,
            'questionStateIndex': question_stats,
            'dashboardAgentMemory': agent_memory_stats,
            'planLimits': plan_rows,
            'notes': [
                'AI interview answers are sanitized and stored as answer_example_candidates for manual admin review.',
                'Robin chat questions and answers are saved in dashboard_agent_memory with searchable indexes.',
                'Approved answer candidates can be promoted later, but original private answers are not published automatically.',
                'SEO expansion pages remain noindex/sitemap-gated until approved and published.',
            ],
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


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
