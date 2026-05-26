import os
import json
import uuid
import requests as http_requests
from flask import Blueprint, request, jsonify
from auth import optional_auth, require_auth, require_admin
import db
from support_service import (
    get_user_support_context,
    has_refund_signal,
    json_dumps,
    normalize_ticket_row,
    parse_jsonish,
)

ai_bp = Blueprint('ai', __name__)

OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', '')
ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY', '')
DEEPSEEK_API_KEY = os.getenv('DEEPSEEK_API_KEY', '')
NVIDIA_API_KEY = os.getenv('NVIDIA_API_KEY', '')

VALID_FEEDBACK_LABELS = {
    'clear_and_natural',
    'could_use_more_detail',
    'worth_reviewing_together',
    'a_little_vague',
    'review_gently',
}


@ai_bp.route('/interview-turn', methods=['POST'])
@optional_auth
def ai_interview_turn():
    user = request.current_user
    data = request.get_json() or {}

    provider = data.get('provider', 'openai')
    model = data.get('modelId') or data.get('model') or _default_model_for_provider(provider)
    topic_id = data.get('topicId')
    session_id = data.get('sessionId')

    limits = _check_usage_limits(user)
    if limits and not limits.get('allowed', False):
        return jsonify({
            'success': False,
            'error': {
                'code': 'PLAN_LIMIT_REACHED',
                'message': limits.get('reason', 'Usage limit reached'),
                'userMessage': limits.get('reason', 'Usage limit reached. Upgrade for unlimited practice.'),
                'upgradeRecommended': True,
            },
        }), 429

    if not session_id and user:
        session_id = _record_session_start(user, provider, model, topic_id)

    messages = data.get('messages')
    if not messages:
        messages = _build_interview_messages(data)

    try:
        response_text, actual_provider, actual_model, fallback_used, provider_errors = _call_provider_with_fallback(
            provider,
            model,
            messages,
        )
    except Exception as e:
        return jsonify({
            'success': False,
            'error': {
                'code': 'PROVIDER_ERROR',
                'message': f'AI provider error: {str(e)}',
                'userMessage': 'AI interview is temporarily unavailable. Please try again or choose another provider.',
            },
        }), 500

    _record_turn(user, session_id)

    normalized = _normalize_ai_response(response_text, actual_provider, actual_model, data)
    normalized['sessionId'] = str(session_id or data.get('anonymousId') or uuid.uuid4())
    normalized['turnsRemaining'] = _turns_remaining(limits)
    normalized['planType'] = limits.get('plan_type') if isinstance(limits, dict) else ('trial' if not user else None)
    normalized['requestedProvider'] = provider
    normalized['requestedModel'] = model
    normalized['providerFallback'] = fallback_used
    normalized['providerErrors'] = provider_errors[-2:]

    return jsonify({
        'success': True,
        'data': normalized,
    })


@ai_bp.route('/support-assist', methods=['POST'])
@require_auth
def support_assist():
    data = request.get_json() or {}
    category = (data.get('category') or 'other')[:40]
    subject = (data.get('subject') or '')[:200]
    message = (data.get('message') or '')[:4000]

    if not subject and not message:
        return jsonify({'error': 'Tell the assistant what you need help with first.'}), 400

    provider = data.get('provider') or (
        'nvidia' if NVIDIA_API_KEY else
        'openai' if OPENAI_API_KEY else
        'deepseek' if DEEPSEEK_API_KEY else
        'anthropic' if ANTHROPIC_API_KEY else
        'fallback'
    )
    model = data.get('modelId') or data.get('model') or _default_model_for_provider(provider)
    messages = _build_support_messages(category, subject, message)

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
    except Exception as e:
        normalized = _support_fallback_response(category, subject, message, str(e))

    return jsonify({'success': True, 'data': normalized})


@ai_bp.route('/support-ticket-draft', methods=['POST'])
@require_admin
def support_ticket_draft():
    data = request.get_json() or {}
    ticket_id = data.get('ticketId') or data.get('ticket_id')
    if not ticket_id:
        return jsonify({'error': 'ticketId is required'}), 400

    ticket = db.query_one(
        """
        SELECT t.*, u.email AS user_email
        FROM support_tickets t
        JOIN users u ON u.id = t.user_id
        WHERE t.id = %s
        """,
        (ticket_id,),
    )
    if not ticket:
        return jsonify({'error': 'Ticket not found'}), 404

    context = get_user_support_context(str(ticket['user_id']))
    triage = parse_jsonish(ticket.get('ai_triage'), {})
    refund_signal = has_refund_signal(
        ticket.get('category') or 'other',
        ticket.get('subject') or '',
        ticket.get('message') or '',
        triage,
    )
    provider = data.get('provider') or (
        'nvidia' if NVIDIA_API_KEY else
        'deepseek' if DEEPSEEK_API_KEY else
        'anthropic' if ANTHROPIC_API_KEY else
        'openai' if OPENAI_API_KEY else
        'fallback'
    )
    model = data.get('modelId') or data.get('model') or _default_model_for_provider(provider)
    messages = _build_admin_support_messages(ticket, context, refund_signal)

    try:
        response_text, actual_provider, actual_model, fallback_used, provider_errors = _call_provider_with_fallback(
            provider,
            model,
            messages,
        )
        normalized = _normalize_admin_support_response(response_text, actual_provider, actual_model)
        normalized['requestedProvider'] = provider
        normalized['requestedModel'] = model
        normalized['providerFallback'] = fallback_used
        normalized['providerErrors'] = provider_errors[-2:]
    except Exception as e:
        normalized = _admin_support_fallback_response(ticket, context, str(e))

    merged_triage = {
        **triage,
        'refundSignal': refund_signal,
        'adminDraft': {
            'provider': normalized.get('provider'),
            'model': normalized.get('model'),
            'urgency': normalized.get('urgency'),
            'refundEligibilityStatus': normalized.get('refundEligibilityStatus'),
            'retentionOfferRecommended': normalized.get('retentionOfferRecommended'),
        },
    }
    try:
        db.execute(
            """
            UPDATE support_tickets
            SET ai_summary = COALESCE(%s, ai_summary),
                ai_suggested_reply = %s,
                ai_triage = %s::jsonb,
                last_ai_assisted_at = now(),
                updated_at = now()
            WHERE id = %s
            """,
            (
                normalized.get('summary'),
                normalized.get('reply'),
                json_dumps(merged_triage),
                ticket_id,
            ),
        )
    except Exception:
        pass

    ticket['ai_triage'] = merged_triage
    normalized['ticket'] = normalize_ticket_row(ticket, context)
    return jsonify({'success': True, 'data': normalized})


def _default_model_for_provider(provider):
    return {
        'openai': os.getenv('OPENAI_DEFAULT_MODEL', 'gpt-5-mini'),
        'anthropic': os.getenv('ANTHROPIC_DEFAULT_MODEL', 'claude-3-haiku-20240307'),
        'deepseek': os.getenv('DEEPSEEK_DEFAULT_MODEL', 'deepseek-chat'),
        'nvidia': os.getenv('NVIDIA_DEFAULT_MODEL', 'meta/llama-3.1-8b-instruct'),
    }.get(provider, 'gpt-5-mini')


def _build_support_messages(category, subject, message):
    system_prompt = (
        "You are InterviewReady support assistant. Help users with billing, refunds, account access, "
        "technical problems, and app usage. Be factual, calm, and concise. Do not give legal advice. "
        "For unauthorized-transaction or unclear-purchase claims, tell the user to submit a refund "
        "request from the dashboard and to describe only accurate facts. Return only valid JSON with "
        "keys: reply, summary, suggestedTicketSubject, recommendedCategory, shouldCreateTicket, urgency."
    )
    user_prompt = f"""
Category: {category}
Subject: {subject or '(not provided)'}
User message:
{message or '(not provided)'}

Write a helpful support response and a short internal summary. recommendedCategory must be one of
billing, refund, technical, account, feature_request, other. urgency must be low, normal, or high.
"""
    return [
        {'role': 'system', 'content': system_prompt},
        {'role': 'user', 'content': user_prompt},
    ]


def _normalize_support_response(response_text, provider, model, category):
    try:
        cleaned = response_text.strip()
        if cleaned.startswith('```'):
            cleaned = cleaned.strip('`')
            cleaned = cleaned.replace('json\n', '', 1).replace('json\r\n', '', 1)
        parsed = json.loads(cleaned)
    except Exception:
        parsed = {}

    if not isinstance(parsed, dict):
        parsed = {}

    reply = parsed.get('reply') or response_text.strip()
    if not reply:
        reply = _support_fallback_copy(category)

    recommended_category = parsed.get('recommendedCategory') or category or 'other'
    if recommended_category not in {'billing', 'refund', 'technical', 'account', 'feature_request', 'other'}:
        recommended_category = 'other'

    urgency = parsed.get('urgency') or 'normal'
    if urgency not in {'low', 'normal', 'high'}:
        urgency = 'normal'

    return {
        'reply': reply[:1800],
        'summary': (parsed.get('summary') or reply[:240])[:500],
        'suggestedTicketSubject': (parsed.get('suggestedTicketSubject') or 'Support request')[:120],
        'recommendedCategory': recommended_category,
        'shouldCreateTicket': bool(parsed.get('shouldCreateTicket', True)),
        'urgency': urgency,
        'provider': provider,
        'model': model,
        'fallback': False,
    }


def _support_fallback_copy(category):
    if category == 'refund':
        return (
            "I can help you start a refund review. Please submit the request from your dashboard, "
            "choose the reason that matches the facts, and include any charge date or receipt details you have."
        )
    if category == 'billing':
        return (
            "Please include what you were trying to buy, the email on the account, and any Stripe receipt "
            "or checkout message you saw. Support can then verify the payment and next step."
        )
    return (
        "Please share the page you were on, what you expected to happen, and what happened instead. "
        "Support can review it with that context."
    )


def _support_fallback_response(category, subject, message, error_message):
    reply = _support_fallback_copy(category)
    return {
        'reply': reply,
        'summary': f"{subject or category}: {(message or '')[:220]}",
        'suggestedTicketSubject': subject or 'Support request',
        'recommendedCategory': category if category in {'billing', 'refund', 'technical', 'account', 'feature_request', 'other'} else 'other',
        'shouldCreateTicket': True,
        'urgency': 'high' if category == 'refund' else 'normal',
        'provider': 'fallback',
        'model': None,
        'fallback': True,
        'error': error_message[:240],
    }


def _build_admin_support_messages(ticket, context, refund_signal):
    refund = context.get('refundEligibility') or {}
    offer = context.get('retentionOffer') or {}
    usage = context.get('usage') or {}
    subscription = context.get('subscription') or {}
    system_prompt = (
        "You are InterviewReady's admin support copilot. Draft factual, concise replies for a human "
        "admin to review before sending. Do not promise a refund, do not admit fault, and do not give "
        "legal advice. For unauthorized transaction claims, prioritize calm manual review. If a retention "
        "offer is eligible, mention it as an optional lower-cost alternative without pressure. Return only "
        "valid JSON with keys: reply, summary, urgency, refundEligibilityStatus, "
        "retentionOfferRecommended, notifyAdmin, internalNotes."
    )
    user_prompt = f"""
Ticket:
- User: {ticket.get('user_email')}
- Category: {ticket.get('category')}
- Subject: {ticket.get('subject')}
- Message: {ticket.get('message')}
- Existing AI summary: {ticket.get('ai_summary') or '(none)'}

Account context:
- Plan: {subscription.get('planLabel')} ({subscription.get('planType')}, {subscription.get('status')})
- Refund signal: {refund_signal}
- Refund eligibility signal: {refund.get('status')} - {refund.get('note')}
- Days since purchase: {refund.get('daysSincePurchase')}
- Usage: {usage.get('questionsCompleted', 0)} questions, {usage.get('mockInterviewsCompleted', 0)} mock interviews, {usage.get('totalPdfDownloads', 0)} PDF downloads
- Download review: {usage.get('downloadReviewFlag')} - {usage.get('downloadReviewNote')}
- Retention offer: {offer.get('eligible')} - {offer.get('label')} at ${offer.get('amount')}

Write a reply the admin can send after review. Keep it specific to this ticket.
"""
    return [
        {'role': 'system', 'content': system_prompt},
        {'role': 'user', 'content': user_prompt},
    ]


def _normalize_admin_support_response(response_text, provider, model):
    try:
        cleaned = response_text.strip()
        if cleaned.startswith('```'):
            cleaned = cleaned.strip('`')
            cleaned = cleaned.replace('json\n', '', 1).replace('json\r\n', '', 1)
        parsed = json.loads(cleaned)
    except Exception:
        parsed = {}

    if not isinstance(parsed, dict):
        parsed = {}

    reply = parsed.get('reply') or response_text.strip()
    summary = parsed.get('summary') or reply[:240]
    urgency = parsed.get('urgency') or 'normal'
    if urgency not in {'low', 'normal', 'high'}:
        urgency = 'normal'

    return {
        'reply': reply[:2200],
        'summary': summary[:600],
        'urgency': urgency,
        'refundEligibilityStatus': parsed.get('refundEligibilityStatus') or 'review',
        'retentionOfferRecommended': bool(parsed.get('retentionOfferRecommended', False)),
        'notifyAdmin': bool(parsed.get('notifyAdmin', urgency == 'high')),
        'internalNotes': (parsed.get('internalNotes') or '')[:900],
        'provider': provider,
        'model': model,
        'fallback': False,
    }


def _admin_support_fallback_response(ticket, context, error_message):
    refund = context.get('refundEligibility') or {}
    offer = context.get('retentionOffer') or {}
    reply = (
        "Thanks for reaching out. I reviewed your message and we can help with this from support. "
        "If this is about a refund or an unauthorized charge, we will review the Stripe payment record, "
        "the account usage history, and the refund policy before making a decision."
    )
    if offer.get('eligible'):
        reply += (
            f" If your goal is to reduce cost rather than fully leave, we may also be able to offer "
            f"the {offer.get('label')} at ${float(offer.get('amount') or 0):.2f}."
        )
    return {
        'reply': reply,
        'summary': f"{ticket.get('subject')}: {(ticket.get('message') or '')[:220]}",
        'urgency': 'high' if ticket.get('category') == 'refund' else 'normal',
        'refundEligibilityStatus': refund.get('status') or 'review',
        'retentionOfferRecommended': bool(offer.get('eligible')),
        'notifyAdmin': ticket.get('category') == 'refund',
        'internalNotes': f'Fallback response used because AI provider failed: {error_message[:240]}',
        'provider': 'fallback',
        'model': None,
        'fallback': True,
    }


def _provider_configured(provider):
    return {
        'openai': bool(OPENAI_API_KEY),
        'anthropic': bool(ANTHROPIC_API_KEY),
        'deepseek': bool(DEEPSEEK_API_KEY),
        'nvidia': bool(NVIDIA_API_KEY),
    }.get(provider, False)


def _provider_priority(preferred_provider):
    configured_order = [
        item.strip()
        for item in os.getenv('AI_FALLBACK_PROVIDERS', 'nvidia,deepseek,anthropic,openai').split(',')
        if item.strip()
    ]
    ordered = []
    if preferred_provider and preferred_provider != 'fallback':
        ordered.append(preferred_provider)
    for provider in configured_order:
        if provider not in ordered:
            ordered.append(provider)
    return ordered


def _call_provider(provider, model, messages):
    if provider == 'anthropic':
        return _call_anthropic(model, messages)
    if provider == 'deepseek':
        return _call_deepseek(model, messages)
    if provider == 'nvidia':
        return _call_nvidia(model, messages)
    if provider == 'openai':
        return _call_openai(model, messages)
    raise ValueError(f'Unsupported AI provider: {provider}')


def _call_provider_with_fallback(preferred_provider, preferred_model, messages):
    errors = []
    for provider in _provider_priority(preferred_provider):
        if not _provider_configured(provider):
            errors.append({
                'provider': provider,
                'message': 'API key is not configured',
            })
            continue
        model = preferred_model if provider == preferred_provider else _default_model_for_provider(provider)
        try:
            return _call_provider(provider, model, messages), provider, model, provider != preferred_provider, errors
        except Exception as exc:
            errors.append({
                'provider': provider,
                'message': str(exc)[:240],
            })
    raise ValueError('No configured AI provider was able to complete the request')


def _check_usage_limits(user):
    if not user:
        return {'allowed': True, 'plan_type': 'trial'}
    try:
        limits = db.call_function('check_ai_usage_limits', (user['id'],))
        if isinstance(limits, list):
            return limits[0] if limits else {'allowed': True}
        if isinstance(limits, dict):
            return limits
    except Exception:
        return {'allowed': True}
    return {'allowed': True}


def _record_session_start(user, provider, model, topic_id):
    try:
        return db.call_function('record_ai_session_start', (user['id'], provider, model, topic_id))
    except Exception:
        return None


def _record_turn(user, session_id):
    if not user or not session_id:
        return
    try:
        db.call_function('record_ai_turn', (user['id'], session_id, 1))
    except Exception:
        pass


def _turns_remaining(limits):
    if not isinstance(limits, dict):
        return None
    for key in ('turns_remaining', 'remaining_turns', 'turnsRemaining'):
        if key in limits:
            return limits[key]
    return None


def _build_interview_messages(data):
    question = data.get('questionContext') or {}
    topic = data.get('topicContext') or {}
    category = data.get('categoryContext') or {}
    previous_turns = data.get('previousTurns') or []
    user_answer = data.get('userAnswer') or ''
    turn_number = data.get('turnNumber', 1)
    max_turns = data.get('maxTurns', 10)
    question_prompt = _context_text(question, ('prompt', 'question', 'text'), 'the current question')
    sample_answer = _context_text(question, ('sampleAnswer', 'sample_answer'), '')
    officer_looking_for = question.get('officerLookingFor', []) if isinstance(question, dict) else []
    avoid_this = question.get('avoidThis', []) if isinstance(question, dict) else []
    category_name = _context_text(category, ('name', 'title', 'id'), 'Unknown')
    topic_title = _context_text(topic, ('title', 'name', 'id'), 'Unknown')
    topic_description = _context_text(topic, ('description',), '')

    system_prompt = (
        "You are Robin, a calm and practical USCIS marriage green card interview coach. "
        "Give supportive, non-legal coaching. Stay grounded in the supplied question, topic, "
        "and answer. Return only valid JSON with keys: feedbackSummary, feedbackLabel, "
        "followUpQuestion, suggestedReviewTopics, suggestedQuestionIds. feedbackLabel must be "
        "one of clear_and_natural, could_use_more_detail, worth_reviewing_together, "
        "a_little_vague, review_gently."
    )

    prior = "\n".join(
        f"- AI: {turn.get('aiQuestion', '')}\n  User: {turn.get('userAnswer', '')}\n  Feedback: {turn.get('feedbackLabel', '')}"
        for turn in previous_turns[-4:]
    )

    user_prompt = f"""
Interview mode: {data.get('interviewMode', 'standard')}
Turn: {turn_number} of {max_turns}
Category: {category_name}
Topic: {topic_title}
Topic description: {topic_description}

Current USCIS-style question:
{question_prompt}

Reference sample answer:
{sample_answer}

Officer may be looking for:
{json.dumps(officer_looking_for)}

Things to avoid:
{json.dumps(avoid_this)}

Previous turns:
{prior or 'None yet.'}

User answer:
{user_answer or '(No answer yet. This is the opening turn.)'}

Write concise feedback. If this is the opening turn, briefly introduce the question and set
feedbackLabel to clear_and_natural. Always include a natural follow-up question.
"""

    return [
        {'role': 'system', 'content': system_prompt},
        {'role': 'user', 'content': user_prompt},
    ]


def _context_text(value, keys, fallback):
    if isinstance(value, dict):
        for key in keys:
            candidate = value.get(key)
            if candidate:
                return str(candidate)
        return fallback
    if isinstance(value, str) and value.strip():
        return value.strip()
    return fallback


def _normalize_ai_response(response_text, provider, model, data):
    parsed = None
    try:
        cleaned = response_text.strip()
        if cleaned.startswith('```'):
            cleaned = cleaned.strip('`')
            cleaned = cleaned.replace('json\n', '', 1).replace('json\r\n', '', 1)
        parsed = json.loads(cleaned)
    except Exception:
        parsed = None

    if isinstance(parsed, dict):
        label = parsed.get('feedbackLabel') or 'could_use_more_detail'
        if label not in VALID_FEEDBACK_LABELS:
            label = 'could_use_more_detail'
        return {
            'feedbackSummary': parsed.get('feedbackSummary') or response_text[:600],
            'feedbackLabel': label,
            'followUpQuestion': parsed.get('followUpQuestion') or _fallback_follow_up(data),
            'suggestedReviewTopics': parsed.get('suggestedReviewTopics') or [],
            'suggestedQuestionIds': parsed.get('suggestedQuestionIds') or [],
            'rawProvider': provider,
            'rawModel': model,
        }

    return {
        'feedbackSummary': response_text,
        'feedbackLabel': 'could_use_more_detail',
        'followUpQuestion': _fallback_follow_up(data),
        'suggestedReviewTopics': [],
        'suggestedQuestionIds': [],
        'rawProvider': provider,
        'rawModel': model,
    }


def _fallback_follow_up(data):
    question = data.get('questionContext') or {}
    prompt = _context_text(question, ('prompt', 'question', 'text'), 'this question')
    return f"What specific detail could you add to make your answer to \"{prompt}\" feel more natural?"


def _call_openai(model, messages):
    if not OPENAI_API_KEY:
        raise ValueError('OpenAI API key not configured')

    resp = http_requests.post(
        'https://api.openai.com/v1/chat/completions',
        headers={'Authorization': f'Bearer {OPENAI_API_KEY}', 'Content-Type': 'application/json'},
        json={'model': model, 'messages': messages, 'max_tokens': 500},
        timeout=30
    )
    resp.raise_for_status()
    return resp.json()['choices'][0]['message']['content']


def _call_openai_compatible(base_url, api_key, model, messages):
    if not api_key:
        raise ValueError('API key not configured')

    resp = http_requests.post(
        f'{base_url.rstrip("/")}/chat/completions',
        headers={'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json'},
        json={'model': model, 'messages': messages, 'max_tokens': 700, 'temperature': 0.25},
        timeout=90
    )
    resp.raise_for_status()
    return resp.json()['choices'][0]['message']['content']


def _call_anthropic(model, messages):
    if not ANTHROPIC_API_KEY:
        raise ValueError('Anthropic API key not configured')

    system_msg = ''
    user_messages = []
    for m in messages:
        if m.get('role') == 'system':
            system_msg = m['content']
        else:
            user_messages.append(m)

    resp = http_requests.post(
        'https://api.anthropic.com/v1/messages',
        headers={
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
        },
        json={
            'model': model or 'claude-3-haiku-20240307',
            'max_tokens': 500,
            'system': system_msg,
            'messages': user_messages,
        },
        timeout=30
    )
    resp.raise_for_status()
    return resp.json()['content'][0]['text']


def _call_deepseek(model, messages):
    if not DEEPSEEK_API_KEY:
        raise ValueError('DeepSeek API key not configured')

    resp = http_requests.post(
        'https://api.deepseek.com/v1/chat/completions',
        headers={'Authorization': f'Bearer {DEEPSEEK_API_KEY}', 'Content-Type': 'application/json'},
        json={'model': model or 'deepseek-chat', 'messages': messages, 'max_tokens': 500},
        timeout=30
    )
    resp.raise_for_status()
    return resp.json()['choices'][0]['message']['content']


def _call_nvidia(model, messages):
    return _call_openai_compatible(
        'https://integrate.api.nvidia.com/v1',
        NVIDIA_API_KEY,
        model or 'meta/llama-3.1-8b-instruct',
        messages,
    )
