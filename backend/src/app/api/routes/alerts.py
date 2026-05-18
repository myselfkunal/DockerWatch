"""
alerts.py — CRUD for alert rules + alert event history.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.models import AlertRule, Container, Server, User, Workspace
from app.db.session import get_db

router = APIRouter(prefix="/alert-rules", tags=["alerts"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class AlertRuleCreate(BaseModel):
    container_id: uuid.UUID | None = None   # None = all containers in workspace
    metric: str          # cpu_percent | mem_percent | net_rx_bytes | net_tx_bytes
    operator: str        # gt | lt | gte | lte
    threshold: float
    duration_minutes: int = 1
    channel: str         # email | slack | webhook
    channel_config: str | None = None  # JSON: {"slack_url": "..."} or {"email": "..."}


class AlertRuleOut(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    container_id: uuid.UUID | None
    metric: str
    operator: str
    threshold: float
    duration_minutes: int
    channel: str
    channel_config: str | None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


VALID_METRICS = {"cpu_percent", "mem_percent", "net_rx_bytes", "net_tx_bytes"}
VALID_OPERATORS = {"gt", "lt", "gte", "lte"}
VALID_CHANNELS = {"email", "slack", "webhook"}


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/workspaces/{workspace_id}/alert-rules", response_model=list[AlertRuleOut])
async def list_alert_rules(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _assert_owns_workspace(workspace_id, current_user.id, db)
    result = await db.execute(
        select(AlertRule).where(AlertRule.workspace_id == workspace_id)
    )
    return result.scalars().all()


@router.post(
    "/workspaces/{workspace_id}/alert-rules",
    response_model=AlertRuleOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_alert_rule(
    workspace_id: uuid.UUID,
    body: AlertRuleCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _assert_owns_workspace(workspace_id, current_user.id, db)

    # Validate inputs
    if body.metric not in VALID_METRICS:
        raise HTTPException(400, f"metric must be one of {VALID_METRICS}")
    if body.operator not in VALID_OPERATORS:
        raise HTTPException(400, f"operator must be one of {VALID_OPERATORS}")
    if body.channel not in VALID_CHANNELS:
        raise HTTPException(400, f"channel must be one of {VALID_CHANNELS}")

    # Verify container belongs to this workspace (if scoped)
    if body.container_id:
        await _assert_container_in_workspace(body.container_id, workspace_id, db)

    rule = AlertRule(
        workspace_id=workspace_id,
        container_id=body.container_id,
        metric=body.metric,
        operator=body.operator,
        threshold=body.threshold,
        duration_minutes=body.duration_minutes,
        channel=body.channel,
        channel_config=body.channel_config,
    )
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return rule


@router.put("/workspaces/{workspace_id}/alert-rules/{rule_id}", response_model=AlertRuleOut)
async def update_alert_rule(
    workspace_id: uuid.UUID,
    rule_id: uuid.UUID,
    body: AlertRuleCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _assert_owns_workspace(workspace_id, current_user.id, db)
    rule = await _get_rule(rule_id, workspace_id, db)

    rule.metric = body.metric
    rule.operator = body.operator
    rule.threshold = body.threshold
    rule.duration_minutes = body.duration_minutes
    rule.channel = body.channel
    rule.channel_config = body.channel_config
    rule.container_id = body.container_id

    await db.commit()
    await db.refresh(rule)
    return rule


@router.delete(
    "/workspaces/{workspace_id}/alert-rules/{rule_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_alert_rule(
    workspace_id: uuid.UUID,
    rule_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _assert_owns_workspace(workspace_id, current_user.id, db)
    rule = await _get_rule(rule_id, workspace_id, db)
    await db.delete(rule)
    await db.commit()


@router.patch(
    "/workspaces/{workspace_id}/alert-rules/{rule_id}/toggle",
    response_model=AlertRuleOut,
)
async def toggle_alert_rule(
    workspace_id: uuid.UUID,
    rule_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _assert_owns_workspace(workspace_id, current_user.id, db)
    rule = await _get_rule(rule_id, workspace_id, db)
    rule.is_active = not rule.is_active
    await db.commit()
    await db.refresh(rule)
    return rule


# Alert event history
@router.get("/workspaces/{workspace_id}/alert-events")
async def list_alert_events(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _assert_owns_workspace(workspace_id, current_user.id, db)
    since = datetime.now(timezone.utc) - timedelta(days=7)

    result = await db.execute(
        text("""
            SELECT
                ae.id, ae.rule_id, ae.container_id, ae.metric,
                ae.value, ae.threshold, ae.fired_at, ae.resolved_at,
                c.name AS container_name
            FROM alert_events ae
            LEFT JOIN containers c ON c.id = ae.container_id
            JOIN alert_rules ar ON ar.id = ae.rule_id
            WHERE ar.workspace_id = :workspace_id
              AND ae.fired_at >= :since
            ORDER BY ae.fired_at DESC
            LIMIT 100
        """),
        {"workspace_id": workspace_id, "since": since},
    )
    rows = result.mappings().all()
    return [dict(r) for r in rows]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _assert_owns_workspace(workspace_id, user_id, db):
    result = await db.execute(
        select(Workspace).where(
            Workspace.id == workspace_id,
            Workspace.owner_id == user_id,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Workspace not found")


async def _get_rule(rule_id, workspace_id, db):
    result = await db.execute(
        select(AlertRule).where(
            AlertRule.id == rule_id,
            AlertRule.workspace_id == workspace_id,
        )
    )
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Alert rule not found")
    return rule


async def _assert_container_in_workspace(container_id, workspace_id, db):
    result = await db.execute(
        text("""
            SELECT c.id FROM containers c
            JOIN servers s ON s.id = c.server_id
            WHERE c.id = :cid AND s.workspace_id = :wid
        """),
        {"cid": container_id, "wid": workspace_id},
    )
    if not result.one_or_none():
        raise HTTPException(status_code=404, detail="Container not found in workspace")