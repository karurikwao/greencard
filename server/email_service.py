import hashlib
import html as html_tools
import os
from typing import Dict, List, Optional

import requests


RESEND_EMAILS_URL = 'https://api.resend.com/emails'

PLAN_LABELS = {
    'monthly': 'Premium Monthly',
    'lifetime': 'Lifetime Access',
    'interviewPass': '90-Day Interview Pass',
}

PLAN_SUMMARIES = {
    'monthly': '$19.99 per month',
    'lifetime': '$79.99 one-time',
    'interviewPass': '$39.99 one-time',
}


def _frontend_url() -> str:
    return os.getenv('FRONTEND_URL', 'http://localhost:5173').rstrip('/')


def _from_address() -> str:
    return os.getenv('EMAIL_FROM') or os.getenv('RESEND_FROM_EMAIL') or 'InterviewReady <onboarding@resend.dev>'


def _idempotency_key(*parts: str) -> str:
    source = '|'.join(part or '' for part in parts)
    digest = hashlib.sha256(source.encode('utf-8')).hexdigest()
    return f'interviewready-{digest}'


def send_email(
    to_email: str,
    subject: str,
    html_body: str,
    text_body: Optional[str] = None,
    tags: Optional[List[Dict[str, str]]] = None,
    idempotency_key: Optional[str] = None,
) -> Dict[str, object]:
    api_key = os.getenv('RESEND_API_KEY', '').strip()

    if not api_key:
        print(f'[DEV] Email skipped: RESEND_API_KEY is not configured for "{subject}" to {to_email}')
        return {'success': True, 'skipped': True}

    payload = {
        'from': _from_address(),
        'to': [to_email],
        'subject': subject,
        'html': html_body,
    }
    if text_body:
        payload['text'] = text_body
    if tags:
        payload['tags'] = tags

    headers = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json',
    }
    if idempotency_key:
        headers['Idempotency-Key'] = idempotency_key[:256]

    timeout_seconds = float(os.getenv('RESEND_TIMEOUT_SECONDS', '5'))

    try:
        response = requests.post(RESEND_EMAILS_URL, json=payload, headers=headers, timeout=timeout_seconds)
        if response.status_code >= 400:
            print(f'Resend email failed ({response.status_code}) for "{subject}": {response.text[:500]}')
            return {'success': False, 'error': response.text[:500], 'status_code': response.status_code}

        data = response.json()
        return {'success': True, 'id': data.get('id')}
    except requests.RequestException as exc:
        print(f'Resend email request failed for "{subject}": {exc}')
        return {'success': False, 'error': str(exc)}


def send_welcome_email(to_email: str, first_name: Optional[str] = None) -> Dict[str, object]:
    name = html_tools.escape((first_name or '').strip() or 'there')
    dashboard_url = f'{_frontend_url()}/dashboard'

    html_body = f"""
    <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
      <h1 style="font-size: 24px; margin-bottom: 12px;">Welcome to InterviewReady</h1>
      <p>Hi {name},</p>
      <p>Your spouse green card interview prep account is ready. Your free trial is active, so you can start practicing questions, saving progress, and exploring premium tools.</p>
      <p>
        <a href="{dashboard_url}" style="display: inline-block; background: #0f172a; color: #ffffff; padding: 12px 18px; border-radius: 6px; text-decoration: none;">
          Open your dashboard
        </a>
      </p>
      <p style="color: #475569; font-size: 14px;">If you did not create this account, you can ignore this email.</p>
    </div>
    """
    text_body = (
        f'Hi {first_name or "there"},\n\n'
        'Your InterviewReady account is ready and your free trial is active.\n'
        f'Open your dashboard: {dashboard_url}\n'
    )
    return send_email(
        to_email,
        'Welcome to InterviewReady',
        html_body,
        text_body,
        tags=[{'name': 'category', 'value': 'welcome'}],
        idempotency_key=_idempotency_key('welcome', to_email),
    )


def send_purchase_confirmation_email(
    to_email: str,
    plan_type: str,
    checkout_session_id: Optional[str] = None,
) -> Dict[str, object]:
    plan_label = PLAN_LABELS.get(plan_type, 'Premium Access')
    plan_summary = PLAN_SUMMARIES.get(plan_type, 'Paid access')
    dashboard_url = f'{_frontend_url()}/dashboard'
    billing_url = f'{_frontend_url()}/account'

    html_body = f"""
    <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
      <h1 style="font-size: 24px; margin-bottom: 12px;">Your premium access is active</h1>
      <p>Thank you for upgrading to <strong>{html_tools.escape(plan_label)}</strong>.</p>
      <p>Your plan: {html_tools.escape(plan_summary)}. Premium question sets, PDFs, AI practice, and partner collaboration are now unlocked on your account.</p>
      <p>
        <a href="{dashboard_url}" style="display: inline-block; background: #0f172a; color: #ffffff; padding: 12px 18px; border-radius: 6px; text-decoration: none;">
          Continue practicing
        </a>
      </p>
      <p style="color: #475569; font-size: 14px;">You can review billing and account settings here: <a href="{billing_url}">{billing_url}</a></p>
    </div>
    """
    text_body = (
        f'Thank you for upgrading to {plan_label}.\n'
        f'Your plan: {plan_summary}.\n'
        f'Continue practicing: {dashboard_url}\n'
        f'Billing and account settings: {billing_url}\n'
    )
    return send_email(
        to_email,
        'Your InterviewReady premium access is active',
        html_body,
        text_body,
        tags=[{'name': 'category', 'value': 'purchase_confirmation'}],
        idempotency_key=_idempotency_key('purchase', checkout_session_id or to_email, plan_type),
    )


def send_password_reset_message(to_email: str, reset_url: str) -> Dict[str, object]:
    escaped_url = html_tools.escape(reset_url, quote=True)
    html_body = f"""
    <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
      <h1 style="font-size: 24px; margin-bottom: 12px;">Reset your password</h1>
      <p>Use the secure link below to reset your InterviewReady password.</p>
      <p>
        <a href="{escaped_url}" style="display: inline-block; background: #0f172a; color: #ffffff; padding: 12px 18px; border-radius: 6px; text-decoration: none;">
          Reset password
        </a>
      </p>
      <p style="color: #475569; font-size: 14px;">This link expires in 1 hour. If you did not request a reset, you can ignore this email.</p>
    </div>
    """
    text_body = f'Click the link to reset your password: {reset_url}\nThis link expires in 1 hour.'
    return send_email(
        to_email,
        'Reset your InterviewReady password',
        html_body,
        text_body,
        tags=[{'name': 'category', 'value': 'password_reset'}],
        idempotency_key=_idempotency_key('password_reset', to_email, reset_url),
    )
