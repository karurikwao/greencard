import os
import json
import uuid
import stripe
from flask import Blueprint, request, jsonify
from auth import require_auth, require_admin, optional_auth
import db
from email_service import send_purchase_confirmation_email

stripe_bp = Blueprint('stripe', __name__)

stripe.api_key = os.getenv('STRIPE_SECRET_KEY', '')

PRICE_ENV_MAP = {
    'monthly': 'STRIPE_PRICE_ID_MONTHLY',
    'lifetime': 'STRIPE_PRICE_ID_LIFETIME',
    'interviewPass': 'STRIPE_PRICE_ID_INTERVIEW_PASS',
}

PLAN_PRICES = {
    'monthly': 1999,
    'lifetime': 7999,
    'interviewPass': 3999,
}

PLAN_LABELS = {
    'monthly': 'InterviewReady Premium Monthly',
    'lifetime': 'InterviewReady Lifetime Access',
    'interviewPass': 'InterviewReady 90-Day Interview Pass',
}


def _refresh_stripe_key():
    stripe.api_key = os.getenv('STRIPE_SECRET_KEY', '')
    return stripe.api_key


def _get_or_create_test_price(plan_type):
    secret_key = _refresh_stripe_key()
    if not secret_key.startswith('sk_test_'):
        return None

    lookup_key = f"interviewready_{plan_type}_test_v1"
    existing = stripe.Price.list(lookup_keys=[lookup_key], active=True, limit=1)
    if existing.data:
        return existing.data[0].id

    product = stripe.Product.create(
        name=PLAN_LABELS[plan_type],
        metadata={
            'app_source': 'interview_ready',
            'plan_type': plan_type,
            'environment': 'test',
        }
    )

    params = {
        'unit_amount': PLAN_PRICES[plan_type],
        'currency': 'usd',
        'product': product.id,
        'lookup_key': lookup_key,
        'metadata': {
            'app_source': 'interview_ready',
            'plan_type': plan_type,
            'environment': 'test',
        }
    }

    if plan_type == 'monthly':
        params['recurring'] = {'interval': 'month'}

    price = stripe.Price.create(**params)
    return price.id


def _get_price_id(plan_type):
    env_var = PRICE_ENV_MAP[plan_type]
    configured = os.getenv(env_var)
    if configured:
        return configured

    auto_create = os.getenv('STRIPE_AUTO_CREATE_TEST_PRICES', 'true').lower() in ('1', 'true', 'yes')
    if auto_create:
        try:
            return _get_or_create_test_price(plan_type)
        except stripe.error.StripeError:
            return None

    return None


@stripe_bp.route('/create-checkout-session', methods=['POST'])
@require_auth
def create_checkout_session():
    _refresh_stripe_key()
    user = request.current_user
    data = request.get_json()
    plan_type = data.get('planType')
    success_url = data.get('successUrl')
    cancel_url = data.get('cancelUrl')
    promo_code = data.get('promoCode')

    if plan_type not in PRICE_ENV_MAP:
        return jsonify({'error': 'Invalid plan type'}), 400

    if not stripe.api_key:
        return jsonify({'error': 'Stripe secret key is not configured', 'code': 'STRIPE_NOT_CONFIGURED'}), 503

    price_id = _get_price_id(plan_type)
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
    final_success_url = success_url or default_success
    if '{CHECKOUT_SESSION_ID}' not in final_success_url:
        separator = '&' if '?' in final_success_url else '?'
        final_success_url = f"{final_success_url}{separator}session_id={{CHECKOUT_SESSION_ID}}"

    is_subscription = plan_type == 'monthly'
    mode = 'subscription' if is_subscription else 'payment'

    session_params = {
        'customer': customer_id,
        'mode': mode,
        'success_url': final_success_url,
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


@stripe_bp.route('/confirm-checkout-session', methods=['POST'])
@require_auth
def confirm_checkout_session():
    _refresh_stripe_key()
    if not stripe.api_key:
        return jsonify({'error': 'Stripe secret key is not configured', 'code': 'STRIPE_NOT_CONFIGURED'}), 503

    user = request.current_user
    data = request.get_json() or {}
    session_id = data.get('sessionId')
    if not session_id:
        return jsonify({'error': 'Checkout session ID required'}), 400

    try:
        session = stripe.checkout.Session.retrieve(session_id)
    except stripe.error.StripeError as e:
        return jsonify({'error': f'Unable to retrieve checkout session: {str(e)}'}), 502

    metadata = session.get('metadata', {}) or {}
    session_user_id = metadata.get('user_id') or session.get('client_reference_id')
    if str(session_user_id) != str(user['id']):
        return jsonify({'error': 'Checkout session does not belong to the current user'}), 403

    if session.get('status') != 'complete' or session.get('payment_status') not in ('paid', 'no_payment_required'):
        return jsonify({'error': 'Checkout session is not complete yet', 'code': 'CHECKOUT_NOT_COMPLETE'}), 409

    try:
        _handle_checkout_completed(session)
    except Exception as e:
        return jsonify({'error': f'Unable to activate subscription: {str(e)}'}), 500

    return jsonify({
        'success': True,
        'planType': metadata.get('plan_type'),
        'sessionId': session_id,
    })


@stripe_bp.route('/create-customer-portal', methods=['POST'])
@require_auth
def create_customer_portal():
    _refresh_stripe_key()
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
    _refresh_stripe_key()
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
    provider_ref = subscription_id or payment_intent_id
    promo_code = metadata.get('promo_code')

    if not user_id or not plan_type:
        raise ValueError('Missing user_id or plan_type in session metadata')

    import json as json_mod
    now_iso = __import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat()

    existing_subscription = db.query_one(
        "SELECT plan_type, status, provider_subscription_id FROM user_subscriptions WHERE user_id = %s",
        (user_id,)
    )
    should_send_purchase_email = (
        not existing_subscription
        or existing_subscription.get('status') != 'active'
        or existing_subscription.get('plan_type') != plan_type
        or (provider_ref and existing_subscription.get('provider_subscription_id') != provider_ref)
    )

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

    if should_send_purchase_email:
        try:
            customer_details = session_data.get('customer_details', {}) or {}
            recipient = customer_details.get('email')
            if not recipient:
                user_row = db.query_one("SELECT email FROM users WHERE id = %s", (user_id,))
                recipient = user_row['email'] if user_row else None
            if recipient:
                send_purchase_confirmation_email(recipient, plan_type, session_data.get('id'))
        except Exception as e:
            print(f"Purchase confirmation email failed for user {user_id}: {e}")


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
