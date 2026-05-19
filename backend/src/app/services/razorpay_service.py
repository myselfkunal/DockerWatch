"""
razorpay_service.py — wraps Razorpay API for subscription billing.

Razorpay subscription flow:
  1. Create a Plan (once, in dashboard or via API) — monthly recurring
  2. Create a Subscription for a customer → get subscription_id
  3. Frontend opens Razorpay checkout with subscription_id
  4. Customer pays → Razorpay fires webhook events
  5. We handle: subscription.activated, subscription.charged,
     subscription.cancelled, payment.failed

Razorpay docs: https://razorpay.com/docs/payments/subscriptions/
"""
from __future__ import annotations

import hashlib
import hmac
import json
import logging

import razorpay

from app.core.config import settings

logger = logging.getLogger(__name__)


def get_client() -> razorpay.Client:
    return razorpay.Client(
        auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
    )


# ---------------------------------------------------------------------------
# Plans  (created once — store plan IDs in .env)
# ---------------------------------------------------------------------------

def create_plan(name: str, amount_inr: int, interval: str = "monthly") -> dict:
    """
    Create a Razorpay plan. Run this once per pricing tier.
    amount_inr is in paise (₹1 = 100 paise), so ₹1600 = 160000.
    """
    client = get_client()
    plan = client.plan.create({
        "period": "monthly",
        "interval": 1,
        "item": {
            "name": name,
            "amount": amount_inr * 100,  # paise
            "currency": "INR",
            "description": f"DockerWatch {name} plan",
        },
    })
    return plan


# ---------------------------------------------------------------------------
# Subscriptions
# ---------------------------------------------------------------------------

def create_subscription(plan_id: str, customer_email: str, customer_name: str) -> dict:
    """
    Create a Razorpay subscription for a customer.
    Returns the subscription object — frontend uses subscription.id for checkout.
    """
    client = get_client()
    subscription = client.subscription.create({
        "plan_id": plan_id,
        "total_count": 120,        # max billing cycles (10 years — effectively unlimited)
        "quantity": 1,
        "customer_notify": 1,      # Razorpay emails the customer
        "notify_info": {
            "notify_email": customer_email,
        },
        "notes": {
            "customer_name": customer_name,
            "customer_email": customer_email,
        },
    })
    return subscription


def cancel_subscription(subscription_id: str, cancel_at_cycle_end: bool = True) -> dict:
    """Cancel a subscription. cancel_at_cycle_end=True means they keep access until period ends."""
    client = get_client()
    return client.subscription.cancel(
        subscription_id,
        {"cancel_at_cycle_end": 1 if cancel_at_cycle_end else 0}
    )


# ---------------------------------------------------------------------------
# Webhook signature verification
# ---------------------------------------------------------------------------

def verify_webhook_signature(body: bytes, signature: str) -> bool:
    """
    Razorpay signs webhooks with HMAC-SHA256.
    Always verify before processing — never trust unverified webhook data.
    """
    expected = hmac.new(
        settings.RAZORPAY_WEBHOOK_SECRET.encode(),
        body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)