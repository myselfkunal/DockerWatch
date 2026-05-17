"""
metrics.py — query endpoints for the dashboard.
All time-series queries use raw SQL with time_bucket for downsampling.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.models import Container, Server, User, Workspace
from app.db.session import get_db

router = APIRouter(tags=["metrics"])


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class ContainerOut(BaseModel):
    id: uuid.UUID
    server_id: uuid.UUID
    docker_id: str
    name: str
    image: str
    last_status: str
    last_seen_at: datetime | None

    model_config = {"from_attributes": True}


class ServerWithContainers(BaseModel):
    id: uuid.UUID
    name: str
    last_seen_at: datetime | None
    containers: list[ContainerOut]

    model_config = {"from_attributes": True}


class MetricPoint(BaseModel):
    time: datetime
    cpu_percent: float
    mem_usage_bytes: int
    mem_limit_bytes: int
    net_rx_bytes: int
    net_tx_bytes: int
    blk_read_bytes: int
    blk_write_bytes: int


class ContainerMetricsResponse(BaseModel):
    container_id: uuid.UUID
    container_name: str
    resolution_seconds: int
    points: list[MetricPoint]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

# Map time range → bucket size for downsampling
# Keeps response payload small while preserving shape
RESOLUTION_MAP: dict[str, tuple[int, str]] = {
    "1h":  (60,    "1 minute"),
    "6h":  (300,   "5 minutes"),
    "24h": (600,   "10 minutes"),
    "7d":  (3600,  "1 hour"),
    "30d": (14400, "4 hours"),
}

RANGE_MAP: dict[str, timedelta] = {
    "1h":  timedelta(hours=1),
    "6h":  timedelta(hours=6),
    "24h": timedelta(hours=24),
    "7d":  timedelta(days=7),
    "30d": timedelta(days=30),
}


async def _assert_workspace_access(
    workspace_id: uuid.UUID,
    user: User,
    db: AsyncSession,
) -> Workspace:
    result = await db.execute(
        select(Workspace).where(
            Workspace.id == workspace_id,
            Workspace.owner_id == user.id,
        )
    )

    workspace = result.scalar_one_or_none()

    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found",
        )

    return workspace


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get(
    "/workspaces/{workspace_id}/servers",
    response_model=list[ServerWithContainers],
)
async def list_servers_with_containers(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns all servers + their containers for dashboard overview."""

    await _assert_workspace_access(workspace_id, current_user, db)

    result = await db.execute(
        select(Server).where(Server.workspace_id == workspace_id)
    )

    servers = result.scalars().all()

    output = []

    for server in servers:
        containers_result = await db.execute(
            select(Container).where(Container.server_id == server.id)
        )

        containers = containers_result.scalars().all()

        output.append(
            ServerWithContainers(
                id=server.id,
                name=server.name,
                last_seen_at=server.last_seen_at,
                containers=[
                    ContainerOut.model_validate(c)
                    for c in containers
                ],
            )
        )

    return output


@router.get(
    "/containers/{container_id}/metrics",
    response_model=ContainerMetricsResponse,
)
async def get_container_metrics(
    container_id: uuid.UUID,
    range: Literal["1h", "6h", "24h", "7d", "30d"] = Query(default="24h"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns downsampled time-series metrics for a single container.
    Uses TimescaleDB time_bucket for efficient aggregation.
    """

    # Verify ownership
    container = await _get_container_for_user(
        container_id,
        current_user,
        db,
    )

    resolution_seconds, bucket = RESOLUTION_MAP[range]

    since = datetime.now(timezone.utc) - RANGE_MAP[range]

    # IMPORTANT:
    # asyncpg breaks when binding interval strings into time_bucket()
    # so the bucket is injected directly from our trusted map.
    rows = await db.execute(
        text(f"""
            SELECT
                time_bucket(INTERVAL '{bucket}', time) AS time,
                avg(cpu_percent)                     AS cpu_percent,
                avg(mem_usage_bytes)::bigint         AS mem_usage_bytes,
                max(mem_limit_bytes)::bigint         AS mem_limit_bytes,
                max(net_rx_bytes)::bigint            AS net_rx_bytes,
                max(net_tx_bytes)::bigint            AS net_tx_bytes,
                max(blk_read_bytes)::bigint          AS blk_read_bytes,
                max(blk_write_bytes)::bigint         AS blk_write_bytes
            FROM metrics
            WHERE container_id = :container_id
              AND time >= :since
            GROUP BY 1
            ORDER BY 1 ASC
        """),
        {
            "container_id": container_id,
            "since": since,
        },
    )

    points = [
        MetricPoint(
            time=row.time,
            cpu_percent=round(row.cpu_percent or 0, 2),
            mem_usage_bytes=row.mem_usage_bytes or 0,
            mem_limit_bytes=row.mem_limit_bytes or 0,
            net_rx_bytes=row.net_rx_bytes or 0,
            net_tx_bytes=row.net_tx_bytes or 0,
            blk_read_bytes=row.blk_read_bytes or 0,
            blk_write_bytes=row.blk_write_bytes or 0,
        )
        for row in rows
    ]

    return ContainerMetricsResponse(
        container_id=container_id,
        container_name=container.name,
        resolution_seconds=resolution_seconds,
        points=points,
    )


@router.get("/containers/{container_id}/summary")
async def get_container_summary(
    container_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """24h average stats for dashboard overview cards."""

    await _get_container_for_user(
        container_id,
        current_user,
        db,
    )

    since = datetime.now(timezone.utc) - timedelta(hours=24)

    row = await db.execute(
        text("""
            SELECT
                avg(cpu_percent)              AS avg_cpu,
                max(cpu_percent)              AS max_cpu,
                avg(mem_usage_bytes)::bigint  AS avg_mem,
                max(mem_usage_bytes)::bigint  AS max_mem,
                max(mem_limit_bytes)::bigint  AS mem_limit
            FROM metrics
            WHERE container_id = :container_id
              AND time >= :since
        """),
        {
            "container_id": container_id,
            "since": since,
        },
    )

    result = row.one()

    return {
        "avg_cpu_percent": round(result.avg_cpu or 0, 2),
        "max_cpu_percent": round(result.max_cpu or 0, 2),
        "avg_mem_bytes": result.avg_mem or 0,
        "max_mem_bytes": result.max_mem or 0,
        "mem_limit_bytes": result.mem_limit or 0,
    }


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

async def _get_container_for_user(
    container_id: uuid.UUID,
    user: User,
    db: AsyncSession,
) -> Container:
    """Verify container belongs to workspace owned by user."""

    result = await db.execute(
        text("""
            SELECT c.id, c.name, c.server_id
            FROM containers c
            JOIN servers s ON s.id = c.server_id
            JOIN workspaces w ON w.id = s.workspace_id
            WHERE c.id = :container_id
              AND w.owner_id = :user_id
        """),
        {
            "container_id": container_id,
            "user_id": user.id,
        },
    )

    row = result.one_or_none()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Container not found",
        )

    result2 = await db.execute(
        select(Container).where(Container.id == container_id)
    )

    return result2.scalar_one()