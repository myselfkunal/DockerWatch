"""
ingest.py — receives metric payloads from agents, auto-creates container
records if new, and bulk-inserts into the metrics hypertable.
"""
from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import select, text, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Container, Server
from app.db.session import get_db

logger = logging.getLogger(__name__)
router = APIRouter(tags=["ingest"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class ContainerMetric(BaseModel):
    # FIXED: datetime instead of str
    time: datetime
    docker_id: str
    name: str
    image: str
    status: str
    cpu_percent: float
    mem_usage_bytes: int
    mem_limit_bytes: int
    net_rx_bytes: int
    net_tx_bytes: int
    blk_read_bytes: int
    blk_write_bytes: int


class IngestPayload(BaseModel):
    metrics: list[ContainerMetric]


# ---------------------------------------------------------------------------
# API key auth (different from user JWT — this is machine-to-machine)
# ---------------------------------------------------------------------------

async def _get_server_from_api_key(request: Request, db: AsyncSession) -> Server:
    raw_key = request.headers.get("X-API-Key")

    if not raw_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing X-API-Key header",
        )

    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()

    result = await db.execute(
        select(Server).where(Server.api_key_hash == key_hash)
    )

    server = result.scalar_one_or_none()

    if not server:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
        )

    return server


# ---------------------------------------------------------------------------
# Ingest endpoint
# ---------------------------------------------------------------------------

@router.post("/ingest", status_code=status.HTTP_202_ACCEPTED)
async def ingest(
    payload: IngestPayload,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    if not payload.metrics:
        return {"accepted": 0}

    # Validate API key → identify server
    server = await _get_server_from_api_key(request, db)

    # Update server heartbeat
    await db.execute(
        update(Server)
        .where(Server.id == server.id)
        .values(last_seen_at=datetime.now(timezone.utc))
    )

    # -----------------------------------------------------------------------
    # Upsert containers
    # -----------------------------------------------------------------------

    container_id_map: dict[str, Any] = {}

    for metric in payload.metrics:
        stmt = (
            pg_insert(Container)
            .values(
                server_id=server.id,
                docker_id=metric.docker_id,
                name=metric.name,
                image=metric.image,
                last_status=metric.status,
                last_seen_at=datetime.now(timezone.utc),
            )
            .on_conflict_do_update(
                constraint="uq_container_server_docker",
                set_={
                    "name": metric.name,
                    "image": metric.image,
                    "last_status": metric.status,
                    "last_seen_at": datetime.now(timezone.utc),
                },
            )
            .returning(Container.id)
        )

        result = await db.execute(stmt)

        container_id_map[metric.docker_id] = result.scalar_one()

    # -----------------------------------------------------------------------
    # Bulk insert metrics
    # -----------------------------------------------------------------------

    if container_id_map:
        rows = [
            {
                "time": metric.time,  # now proper datetime object
                "container_id": container_id_map[metric.docker_id],
                "cpu_percent": metric.cpu_percent,
                "mem_usage_bytes": metric.mem_usage_bytes,
                "mem_limit_bytes": metric.mem_limit_bytes,
                "net_rx_bytes": metric.net_rx_bytes,
                "net_tx_bytes": metric.net_tx_bytes,
                "blk_read_bytes": metric.blk_read_bytes,
                "blk_write_bytes": metric.blk_write_bytes,
            }
            for metric in payload.metrics
            if metric.docker_id in container_id_map
        ]

        await db.execute(
            text("""
                INSERT INTO metrics
                    (
                        time,
                        container_id,
                        cpu_percent,
                        mem_usage_bytes,
                        mem_limit_bytes,
                        net_rx_bytes,
                        net_tx_bytes,
                        blk_read_bytes,
                        blk_write_bytes
                    )
                VALUES
                    (
                        :time,
                        :container_id,
                        :cpu_percent,
                        :mem_usage_bytes,
                        :mem_limit_bytes,
                        :net_rx_bytes,
                        :net_tx_bytes,
                        :blk_read_bytes,
                        :blk_write_bytes
                    )
                ON CONFLICT DO NOTHING
            """),
            rows,
        )

    await db.commit()

    logger.info(
        "Ingested %d metrics for server %s",
        len(payload.metrics),
        server.id,
    )

    return {"accepted": len(payload.metrics)}