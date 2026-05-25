import os
import json
import uuid
import stripe
from flask import Blueprint, request, jsonify
from auth import require_auth, require_admin, optional_auth
import db

stripe_bp = Blueprint('stripe', __name__)

stripe.api_key = os.getenv('STRIPE_SECRET_KEY', '')

PRICE_ID_MAP = {
    'monthly': os.getenv('STRIPE_PRICE_ID_MONTHLY'),
    'lifetime': os.getenv('STRIPE_PRICE_ID_LIFETIME'),
    'interviewPass': os.getenv('STRIPE_PRICE_ID_INTERVIEW_PASS'),
}

PLAN_PRICES = {
    'monthly': 1999,
    'lifetime': 7999,
    'interviewPass': 3999,
}


@stripe_bp.route('/create-checkout-session', methods=['POST'])
@require_auth
def create_checkout_session():
    user = request.current_user
    data = request.get_json()
    plan_type = data.get('planType')
    success_url = data.get('successUrl')
    cancel_url = data.get('cancelUrl')
    promo_code = data.get('promoCode')

    if plan_type not in PRICE_ID_MAP:
        return jsonify({'error': 'Invalid plan type'}), 400

    price_id = PRICE_ID_MAP[plan_type]
    if not price_id:
        return jsonify({'error': 'Payment not configured for this plan', 'code': 'PRICE_NOT_CONFIGURED'}), 503

    discount_info = None
    promo_validation = None
    if promo_code and promo_code.strip():
        promo_validation = db.call_function('validate_promo_code', (promo_code.strip().upper(),))
        if isinstance(promo_validation, list):
            promo_validation = promo_validation[0] if promo_validation else None
        if promo_validation and promo_validation.get('valid') and promo_validation.get('discount_percent'):
            original = PLAN_PRICES[plan_type]
            discount_amount = round(original * promo_validation['discount_percent'] / 100)
            discount_info = {
                'originalPrice': original / 100,
                'discountPercent': promo_validation['discount_percent'],
                'discountAmount': discount_amount / 100,
                'finalPrice': (original - discount_amount) / 100,
            }

    existing_sub = db.query_one(
        "SELECT provider_customer_id FROM user_subscriptions WHERE user_id = %s",
        (user['id'],)
    )
    customer_id = existing_sub['provider_customer_id'] if existing_sub else None

    if not customer_id:
        try:
            customer = stripe.Customer.create(
                email=user['email'],
                metadata={
                    'user_id': user['id'],
                    'app_source': 'interview_ready',
                    'promo_code': promo_validation.get('code', '') if promo_validation else '',
                }
            )
            customer_id = customer.id
            db.execute(
                """INSERT INTO user_subscriptions (user_id, provider, provider_customer_id, updated_at)
                   VALUES (%s, 'stripe', %s, now())
                   ON CONFLICT (user_id) DO UPDATE SET provider_customer_id = EXCLUDED.provider_customer_id, updated_at = now()""",
                (user['id'], customer_id)
            )
        except stripe.error.StripeError as e:
            return jsonify({'error': f'Failed to create customer: {str(e)}'}), 500

    frontend_url = os.getenv('FRONTEND_URL', request.headers.get('Origin', 'http://localhost:5173'))
    default_success = f"{frontend_url}/billing/success?session_id={{CHECKOUT_SESSION_ID}}"
    default_cancel = f"{frontend_url}/billing/cancel"

    is_subscription = plan_type == 'monthly'
    mode = 'subscription' if is_subscription else 'payment'

    session_params = {
        'customer': customer_id,
        'mode': mode,
        'success_url': success_url or default_success,
        'cancel_url': cancel_url or default_cancel,
        'line_items': [{'price': price_id, 'quantity': 1}],
        'client_reference_id': user['id'],
        'metadata': {
            'user_id': user['id'],
            'plan_type': plan_type,
            'app_source': 'interview_ready',
        }
    }

    if promo_validation and promo_validation.get('valid') and promo_validation.get('code'):
        session_params['metadata']['promo_code'] = promo_validation['code']
        session_params['metadata']['discount_percent'] = str(promo_validation.get('discount_percent', 0))
        session_params['metadata']['influencer_name'] = promo_validation.get('influencer_name', '')

    if not is_subscription:
        session_params['payment_intent_data'] = {
            'metadata': {
                'user_id': user['id'],
                'plan_type': plan_type,
                'app_source': 'interview_ready',
            }
        }

    try:
        session = stripe.checkout.Session.create(**session_params)
    except stripe.error.StripeError as e:
        return jsonify({'error': f'Failed to create checkout session: {str(e)}'}), 500

    if promo_code and promo_code.strip():
        try:
            db.call_function('record_referral_event', (
                user['id'], promo_code.strip().upper(), 'stripe_checkout', None, 'checkout', json.dumps({'plan_type': plan_type})
            ))
        except Exception:
            pass

    response = {
        'checkoutUrl': session.url,
        'sessionId': session.id,
    }
    if discount_info:
        response['appliedDiscount'] = discount_info

    return jsonify(response)


@stripe_bp.route('/create-customer-portal', methods=['POST'])
@require_auth
def create_customer_portal():
    user = request.current_user

    existing_sub = db.query_one(
        "SELECT provider_customer_id FROM user_subscriptions WHERE user_id = %s",
        (user['id'],)
    )
    customer_id = existing_sub['provider_customer_id'] if existing_sub else None

    if not customer_id:
        return jsonify({'error': 'No Stripe customer found'}), 404

    frontend_url = os.getenv('FRONTEND_URL', request.headers.get('Origin', 'http://localhost:5173'))

    try:
        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=f"{frontend_url}/account",
        )
        return jsonify({'portalUrl': session.url, 'url': session.url})
    except stripe.error.StripeError as e:
        return jsonify({'error': f'Failed to create portal session: {str(e)}'}), 500


@stripe_bp.route('/webhook', methods=['POST'])
def stripe_webhook():
    payload = request.data
    sig_header = request.headers.get('Stripe-Signature', '')
    webhook_secret = os.getenv('STRIPE_WEBHOOK_SECRET', '')

    if not webhook_secret:
        return jsonify({'error': 'Webhook not configured'}), 503

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
    except stripe.error.SignatureVerificationError:
        return jsonify({'error': 'Invalid signature'}), 400
    except Exception:
        return jsonify({'error': 'Invalid payload'}), 400

    existing = db.query_one(
        "SELECT id FROM stripe_webhook_events WHERE stripe_event_id = %s",
        (event['id'],)
    )
    if existing:
        return jsonify({'message': 'Already processed'}), 200

    try:
        if event['type'] == 'checkout.session.completed':
            _handle_checkout_completed(event['data']['object'])
        elif event['type'] in ('customer.subscription.created', 'customer.subscription.updated'):
            _handle_subscription_updated(event['data']['object'])
        elif event['type'] == 'customer.subscription.deleted':
            _handle_subscription_deleted(event['data']['object'])
        elif event['type'] == 'invoice.paid':
            _handle_invoice_paid(event['data']['object'])
        elif event['type'] == 'invoice.payment_failed':
            _handle_payment_failed(event['data']['object'])

        db.execute(
            """INSERT INTO stripe_webhook_events (stripe_event_id, event_type, status, processed_at)
               VALUES (%s, %s, 'success', now())
               ON CONFLICT (stripe_event_id) DO NOTHING""",
            (event['id'], event['type'])
        )
    except Exception as e:
        db.execute(
            """INSERT INTO stripe_webhook_events (stripe_event_id, event_type, status, error_message, processed_at)
               VALUES (%s, %s, 'error', %s, now())
               ON CONFLICT (stripe_event_id) DO NOTHING""",
            (event['id'], event['type'], str(e))
        )
        return jsonify({'error': str(e)}), 500

    return jsonify({'message': 'OK'}), 200


def _handle_checkout_completed(session_data):
    metadata = session_data.get('metadata', {})
    user_id = metadata.get('user_id')
    plan_type = metadata.get('plan_type')
    customer_id = session_data.get('customer')
    subscription_id = session_data.get('subscription')
    payment_intent_id = session_data.get('payment_intent')
    promo_code = metadata.get('promo_code')

    if not user_id or not plan_type:
        raise ValueError('Missing user_id or plan_type in session metadata')

    import json as json_mod
    now_iso = __import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat()

    meta = {}
    if promo_code:
        meta['promo_code'] = promo_code
        meta['discount_percent'] = int(metadata.get('discount_percent', 0))

    db.call_function('create_or_update_subscription', (
        user_id, plan_type, 'active', 'stripe', customer_id,
        subscription_id or payment_intent_id,
        None,
        __import__('datetime').datetime.now(__import__('datetime').timezone.utc) + __import__('datetime').timedelta(days=90) if plan_type == 'interviewPass' else None,
        json_mod.dumps(meta)
    ))

    if promo_code:
        try:
            db.call_function('record_referral_event', (
                user_id, promo_code, 'stripe_checkout', None, 'purchase',
                json_mod.dumps({'plan_type': plan_type, 'session_id': session_data.get('id')})
            ))
        except Exception:
            pass


def _handle_subscription_updated(subscription_data):
    customer_id = subscription_data.get('customer')
    subscription_id = subscription_data.get('id')
    status = subscription_data.get('status')
    period_end = subscription_data.get('current_period_end')
    cancel_at_end = subscription_data.get('cancel_at_period_end', False)

    sub = db.query_one(
        "SELECT user_id, status FROM user_subscriptions WHERE provider_customer_id = %s",
        (customer_id,)
    )
    if not sub:
        return

    status_map = {
        'active': 'canceled' if cancel_at_end else 'active',
        'trialing': 'active',
        'canceled': 'canceled',
        'past_due': 'past_due',
        'unpaid': 'unpaid',
        'paused': 'grace_period',
    }
    our_status = status_map.get(status, 'active')

    if period_end:
        from datetime import datetime, timezone
        period_end_dt = datetime.fromtimestamp(period_end, tz=timezone.utc).isoformat()
    else:
        period_end_dt = None

    db.execute(
        """UPDATE user_subscriptions SET status = %s, provider_subscription_id = %s,
           current_period_ends_at = %s, updated_at = now() WHERE user_id = %s""",
        (our_status, subscription_id, period_end_dt, sub['user_id'])
    )


def _handle_subscription_deleted(subscription_data):
    customer_id = subscription_data.get('customer')
    sub = db.query_one(
        "SELECT user_id FROM user_subscriptions WHERE provider_customer_id = %s",
        (customer_id,)
    )
    if not sub:
        return

    db.execute(
        "UPDATE user_subscriptions SET status = 'expired', ends_at = now(), updated_at = now() WHERE user_id = %s",
        (sub['user_id'],)
    )


def _handle_invoice_paid(invoice_data):
    customer_id = invoice_data.get('customer')
    subscription_id = invoice_data.get('subscription')
    if not subscription_id:
        return

    sub = db.query_one(
        "SELECT user_id FROM user_subscriptions WHERE provider_customer_id = %s",
        (customer_id,)
    )
    if not sub:
        return

    period_end = invoice_data.get('period_end')
    if period_end:
        from datetime import datetime, timezone
        period_end_dt = datetime.fromtimestamp(period_end, tz=timezone.utc).isoformat()
    else:
        period_end_dt = None

    db.execute(
        """UPDATE user_subscriptions SET status = 'active', current_period_ends_at = %s, updated_at = now()
           WHERE user_id = %s""",
        (period_end_dt, sub['user_id'])
    )


def _handle_payment_failed(invoice_data):
    customer_id = invoice_data.get('customer')
    sub = db.query_one(
        "SELECT user_id FROM user_subscriptions WHERE provider_customer_id = %s",
        (customer_id,)
    )
    if not sub:
        return

    db.execute(
        "UPDATE user_subscriptions SET status = 'past_due', payment_failed_at = now(), updated_at = now() WHERE user_id = %s",
        (sub['user_id'],)
    )
