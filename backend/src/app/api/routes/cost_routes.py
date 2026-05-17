"""
cost_routes.py — exposes cost estimates and savings recommendations via API.
"""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.models import User, Workspace
from app.db.session import get_db
from app.services.cost import build_cost_summary, estimate_container_cost

router = APIRouter(tags=["cost"])


@router.get("/workspaces/{workspace_id}/cost")
async def get_workspace_cost(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    The killer feature.
    Returns estimated monthly cost per container + total + savings opportunities.
    Based on 7-day average CPU and memory usage.
    """

    # ------------------------------------------------------------------
    # Verify workspace ownership
    # ------------------------------------------------------------------
    ws_result = await db.execute(
        select(Workspace).where(
            Workspace.id == workspace_id,
            Workspace.owner_id == current_user.id,
        )
    )

    workspace = ws_result.scalar_one_or_none()

    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found",
        )

    # ------------------------------------------------------------------
    # Fetch all containers inside workspace
    # ------------------------------------------------------------------
    containers_result = await db.execute(
        text("""
            SELECT
                c.id,
                c.name
            FROM containers c
            JOIN servers s
              ON s.id = c.server_id
            WHERE s.workspace_id = :workspace_id
        """),
        {
            "workspace_id": workspace_id,
        },
    )

    containers = containers_result.all()

    # Empty workspace case
    if not containers:
        return {
            "total_monthly_usd": 0,
            "total_wasted_usd": 0,
            "container_count": 0,
            "idle_container_count": 0,
            "containers": [],
            "top_savings": [],
        }

    # ------------------------------------------------------------------
    # Fetch 7-day average CPU + memory stats per container
    # ------------------------------------------------------------------
    container_ids = [row.id for row in containers]

    stats_result = await db.execute(
        text("""
            SELECT
                container_id,
                avg(cpu_percent)               AS avg_cpu,
                avg(mem_usage_bytes)::bigint   AS avg_mem
            FROM metrics
            WHERE container_id = ANY(:ids)
              AND time >= now() - interval '7 days'
            GROUP BY container_id
        """),
        {
            "ids": container_ids,
        },
    )

    stats_by_id = {
        str(row.container_id): (
            float(row.avg_cpu or 0),
            int(row.avg_mem or 0),
        )
        for row in stats_result
    }

    # ------------------------------------------------------------------
    # Build estimates per container
    # ------------------------------------------------------------------
    estimates = []

    for container in containers:
        cid = str(container.id)

        avg_cpu, avg_mem = stats_by_id.get(
            cid,
            (0.0, 0),
        )

        estimate = estimate_container_cost(
            container_id=cid,
            container_name=container.name,
            avg_cpu_percent=avg_cpu,
            avg_mem_bytes=avg_mem,
        )

        estimates.append(estimate)

    # ------------------------------------------------------------------
    # Build final summary
    # ------------------------------------------------------------------
    summary = build_cost_summary(estimates)

    # ------------------------------------------------------------------
    # Serialize response
    # ------------------------------------------------------------------
    return {
        "total_monthly_usd": summary.total_monthly_usd,
        "total_wasted_usd": summary.total_wasted_usd,
        "container_count": summary.container_count,
        "idle_container_count": summary.idle_container_count,
        "top_savings": summary.top_savings,
        "containers": [
            {
                "container_id": e.container_id,
                "container_name": e.container_name,
                "avg_cpu_percent": e.avg_cpu_percent,
                "avg_mem_gb": e.avg_mem_gb,
                "estimated_instance": e.estimated_instance,
                "monthly_cost_usd": e.monthly_cost_usd,
                "is_idle": e.is_idle,
                "savings_if_removed_usd": e.savings_if_removed_usd,
            }
            for e in summary.containers
        ],
    }