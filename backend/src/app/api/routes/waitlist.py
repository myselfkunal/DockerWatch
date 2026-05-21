"""
waitlist.py — stores waitlist signups until billing goes live.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter
from pydantic import BaseModel, EmailStr
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends
from app.db.session import get_db

logger = logging.getLogger(__name__)
router = APIRouter(tags=["waitlist"])


class WaitlistRequest(BaseModel):
    email: EmailStr
    plan: str = "pro"


@router.post("/waitlist", status_code=201)
async def join_waitlist(
    body: WaitlistRequest,
    db: AsyncSession = Depends(get_db),
):
    """Store waitlist signup. No auth required."""
    try:
        await db.execute(
            text("""
                INSERT INTO waitlist (email, plan, created_at)
                VALUES (:email, :plan, :created_at)
                ON CONFLICT (email) DO UPDATE SET plan = :plan
            """),
            {
                "email": body.email,
                "plan": body.plan,
                "created_at": datetime.now(timezone.utc),
            },
        )
        await db.commit()
        logger.info("Waitlist signup: %s for %s plan", body.email, body.plan)
    except Exception as e:
        logger.error("Waitlist insert failed: %s", e)

    # Always return success — don't leak errors
    return {"status": "added"}