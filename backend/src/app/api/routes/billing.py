from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.models import User, Workspace
from app.db.session import get_db
from app.services import razorpay_service as rz

logger = logging.getLogger(__name__)

# IMPORTANT:
# DO NOT add prefix="/billing" here
# Prefix already added in main.py
router = APIRouter(tags=["billing"])


PLAN_MAP = {
    settings.RAZORPAY_PRO_PLAN_ID: "pro",
    settings.RAZORPAY_TEAM_PLAN_ID: "team",
}


# ---------------------------------------------------------------------------
# schemas
# ---------------------------------------------------------------------------

class SubscribeRequest(BaseModel):
    plan: str
    workspace_id: uuid.UUID


class SubscribeResponse(BaseModel):
    subscription_id: str
    razorpay_key_id: str
    amount: int
    currency: str
    plan: str


# ---------------------------------------------------------------------------
# subscribe
# ---------------------------------------------------------------------------

@router.post("/subscribe", response_model=SubscribeResponse)
async def subscribe(
    body: SubscribeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.plan not in ("pro", "team"):
        raise HTTPException(
            status_code=400,
            detail="plan must be 'pro' or 'team'",
        )

    result = await db.execute(
        select(Workspace).where(
            Workspace.id == body.workspace_id,
            Workspace.owner_id == current_user.id,
        )
    )

    workspace = result.scalar_one_or_none()

    if not workspace:
        raise HTTPException(
            status_code=404,
            detail="Workspace not found",
        )

    plan_id = (
        settings.RAZORPAY_PRO_PLAN_ID
        if body.plan == "pro"
        else settings.RAZORPAY_TEAM_PLAN_ID
    )

    try:
        subscription = rz.create_subscription(
            plan_id=plan_id,
            customer_email=current_user.email,
            customer_name=workspace.name,
        )

    except Exception as e:
        logger.error(
            "Razorpay subscription creation failed: %s",
            e,
        )

        raise HTTPException(
            status_code=502,
            detail="Failed to create subscription",
        )

    # Store directly on workspace
    workspace.razorpay_subscription_id = subscription["id"]
    workspace.subscription_status = "pending"

    await db.commit()

    amount = 160000 if body.plan == "pro" else 410000

    return SubscribeResponse(
        subscription_id=subscription["id"],
        razorpay_key_id=settings.RAZORPAY_KEY_ID,
        amount=amount,
        currency="INR",
        plan=body.plan,
    )


# ---------------------------------------------------------------------------
# webhook
# ---------------------------------------------------------------------------

@router.post(
    "/webhook",
    status_code=status.HTTP_200_OK,
)
async def razorpay_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    body = await request.body()

    signature = request.headers.get(
        "X-Razorpay-Signature",
        "",
    )

    if not rz.verify_webhook_signature(body, signature):
        raise HTTPException(
            status_code=400,
            detail="Invalid webhook signature",
        )

    event = json.loads(body)

    event_type = event.get("event")

    payload = event.get("payload", {})

    logger.info("Razorpay webhook: %s", event_type)

    if event_type == "subscription.activated":
        await _handle_activated(payload, db)

    elif event_type == "subscription.charged":
        await _handle_charged(payload, db)

    elif event_type in (
        "subscription.cancelled",
        "subscription.completed",
    ):
        await _handle_cancelled(payload, db)

    elif event_type == "payment.failed":
        await _handle_payment_failed(payload, db)

    return {"status": "ok"}


# ---------------------------------------------------------------------------
# cancel
# ---------------------------------------------------------------------------

@router.post("/cancel")
async def cancel_subscription(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Workspace).where(
            Workspace.id == workspace_id,
            Workspace.owner_id == current_user.id,
        )
    )

    workspace = result.scalar_one_or_none()

    if not workspace:
        raise HTTPException(
            status_code=404,
            detail="Workspace not found",
        )

    if not workspace.razorpay_subscription_id:
        raise HTTPException(
            status_code=400,
            detail="No active subscription",
        )

    try:
        rz.cancel_subscription(
            workspace.razorpay_subscription_id,
            cancel_at_cycle_end=True,
        )

    except Exception as e:
        logger.error(
            "Razorpay cancel failed: %s",
            e,
        )

        raise HTTPException(
            status_code=502,
            detail="Failed to cancel subscription",
        )

    workspace.subscription_status = "cancelling"

    await db.commit()

    return {
        "status": "cancelling",
        "message": "Subscription will cancel at period end",
    }


# ---------------------------------------------------------------------------
# status
# ---------------------------------------------------------------------------

@router.get("/status/{workspace_id}")
async def billing_status(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Workspace).where(
            Workspace.id == workspace_id,
            Workspace.owner_id == current_user.id,
        )
    )

    workspace = result.scalar_one_or_none()

    if not workspace:
        raise HTTPException(
            status_code=404,
            detail="Workspace not found",
        )

    return {
        "plan": workspace.plan,
        "status": workspace.subscription_status or "free",
        "current_period_end": workspace.current_period_end,
        "razorpay_subscription_id": workspace.razorpay_subscription_id,
    }


# ---------------------------------------------------------------------------
# webhook handlers
# ---------------------------------------------------------------------------

async def _get_workspace_by_subscription(
    subscription_id: str,
    db: AsyncSession,
):
    result = await db.execute(
        select(Workspace).where(
            Workspace.razorpay_subscription_id == subscription_id
        )
    )

    return result.scalar_one_or_none()


async def _handle_activated(
    payload: dict,
    db: AsyncSession,
):
    sub_data = payload.get("subscription", {}).get("entity", {})

    sub_id = sub_data.get("id")

    plan_id = sub_data.get("plan_id")

    if not sub_id:
        return

    workspace = await _get_workspace_by_subscription(
        sub_id,
        db,
    )

    if not workspace:
        return

    workspace.subscription_status = "active"

    current_end = sub_data.get("current_end")

    if current_end:
        workspace.current_period_end = datetime.fromtimestamp(
            current_end,
            tz=timezone.utc,
        )

    workspace.plan = PLAN_MAP.get(plan_id, "pro")

    await db.commit()


async def _handle_charged(
    payload: dict,
    db: AsyncSession,
):
    sub_data = payload.get("subscription", {}).get("entity", {})

    sub_id = sub_data.get("id")

    workspace = await _get_workspace_by_subscription(
        sub_id,
        db,
    )

    if not workspace:
        return

    workspace.subscription_status = "active"

    current_end = sub_data.get("current_end")

    if current_end:
        workspace.current_period_end = datetime.fromtimestamp(
            current_end,
            tz=timezone.utc,
        )

    await db.commit()


async def _handle_cancelled(
    payload: dict,
    db: AsyncSession,
):
    sub_data = payload.get("subscription", {}).get("entity", {})

    sub_id = sub_data.get("id")

    workspace = await _get_workspace_by_subscription(
        sub_id,
        db,
    )

    if not workspace:
        return

    workspace.subscription_status = "cancelled"

    workspace.plan = "free"

    await db.commit()


async def _handle_payment_failed(
    payload: dict,
    db: AsyncSession,
):
    sub_data = payload.get("subscription", {}).get("entity", {})

    sub_id = sub_data.get("id")

    workspace = await _get_workspace_by_subscription(
        sub_id,
        db,
    )

    if not workspace:
        return

    workspace.subscription_status = "past_due"

    await db.commit()