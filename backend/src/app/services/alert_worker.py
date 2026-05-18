"""
alert_worker.py — background job that evaluates alert rules every 60s.

Logic per rule:
  1. Fetch the rule's metric for the relevant container(s) over the last
     `duration_minutes` window.
  2. Check if the condition (metric operator threshold) has held for the
     entire window.
  3. If yes AND no open alert_event exists → fire alert + create event.
  4. If condition clears AND open event exists → mark event as resolved.

Dedup guarantee: we never fire the same rule twice while the condition
is still active (resolved_at IS NULL). Only fires again after resolution.
"""
from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timedelta, timezone

import httpx
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.db.models import AlertRule

logger = logging.getLogger(__name__)

OPERATORS = {
    "gt":  lambda v, t: v > t,
    "lt":  lambda v, t: v < t,
    "gte": lambda v, t: v >= t,
    "lte": lambda v, t: v <= t,
}

# Metric SQL expressions — what we aggregate from the metrics table
METRIC_SQL = {
    "cpu_percent":  "avg(cpu_percent)",
    "mem_percent":  "avg(mem_usage_bytes::float / NULLIF(mem_limit_bytes, 0) * 100)",
    "net_rx_bytes": "max(net_rx_bytes)",
    "net_tx_bytes": "max(net_tx_bytes)",
}


class AlertWorker:
    def __init__(self, session_factory: async_sessionmaker) -> None:
        self._session_factory = session_factory
        self._http = httpx.AsyncClient(timeout=10)

    async def run(self) -> None:
        """Called every 60s by APScheduler."""
        logger.debug("Alert worker tick")
        async with self._session_factory() as db:
            try:
                await self._evaluate_all(db)
            except Exception as e:
                logger.error("Alert worker error: %s", e, exc_info=True)

    async def _evaluate_all(self, db: AsyncSession) -> None:
        result = await db.execute(
            select(AlertRule).where(AlertRule.is_active.is_(True))
        )
        rules = result.scalars().all()

        for rule in rules:
            try:
                await self._evaluate_rule(rule, db)
            except Exception as e:
                logger.warning("Failed evaluating rule %s: %s", rule.id, e)

    async def _evaluate_rule(self, rule: AlertRule, db: AsyncSession) -> None:
        since = datetime.now(timezone.utc) - timedelta(minutes=rule.duration_minutes)
        metric_expr = METRIC_SQL.get(rule.metric)
        if not metric_expr:
            return

        # Get all containers in scope
        if rule.container_id:
            container_ids = [rule.container_id]
        else:
            rows = await db.execute(
                text("""
                    SELECT c.id FROM containers c
                    JOIN servers s ON s.id = c.server_id
                    WHERE s.workspace_id = :wid
                """),
                {"wid": rule.workspace_id},
            )
            container_ids = [r[0] for r in rows]

        if not container_ids:
            return

        for container_id in container_ids:
            # Get metric value over the window
            row = await db.execute(
                text(f"""
                    SELECT {metric_expr} AS value
                    FROM metrics
                    WHERE container_id = :cid
                      AND time >= :since
                """),
                {"cid": container_id, "since": since},
            )
            result = row.one()
            value = result.value

            if value is None:
                continue

            condition_met = OPERATORS[rule.operator](float(value), rule.threshold)

            # Check for open event (fired but not resolved)
            open_event = await db.execute(
                text("""
                    SELECT id FROM alert_events
                    WHERE rule_id = :rid
                      AND container_id = :cid
                      AND resolved_at IS NULL
                    LIMIT 1
                """),
                {"rid": rule.id, "cid": container_id},
            )
            open_row = open_event.one_or_none()

            if condition_met and not open_row:
                # Fire: create event + send notification
                event_id = uuid.uuid4()
                await db.execute(
                    text("""
                        INSERT INTO alert_events
                            (id, rule_id, container_id, metric, value, threshold)
                        VALUES
                            (:id, :rid, :cid, :metric, :value, :threshold)
                    """),
                    {
                        "id": event_id,
                        "rid": rule.id,
                        "cid": container_id,
                        "metric": rule.metric,
                        "value": float(value),
                        "threshold": rule.threshold,
                    },
                )
                await db.commit()

                await self._notify(rule, container_id, float(value), db)
                logger.info(
                    "Alert fired: rule=%s container=%s metric=%s value=%.2f threshold=%.2f",
                    rule.id, container_id, rule.metric, value, rule.threshold,
                )

            elif not condition_met and open_row:
                # Resolve: mark the open event as resolved
                await db.execute(
                    text("""
                        UPDATE alert_events
                        SET resolved_at = now()
                        WHERE id = :event_id
                    """),
                    {"event_id": open_row[0]},
                )
                await db.commit()
                logger.info(
                    "Alert resolved: rule=%s container=%s", rule.id, container_id
                )

    async def _notify(
        self,
        rule: AlertRule,
        container_id: uuid.UUID,
        value: float,
        db: AsyncSession,
    ) -> None:
        # Get container name for the message
        row = await db.execute(
            text("SELECT name FROM containers WHERE id = :cid"),
            {"cid": container_id},
        )
        result = row.one_or_none()
        container_name = result[0] if result else str(container_id)

        op_label = {"gt": ">", "lt": "<", "gte": ">=", "lte": "<="}[rule.operator]
        message = (
            f"🚨 DockerWatch Alert\n"
            f"Container: {container_name}\n"
            f"Metric: {rule.metric} {op_label} {rule.threshold} "
            f"(current: {value:.2f})"
        )

        if rule.channel == "slack":
            await self._send_slack(rule, message)
        elif rule.channel == "email":
            await self._send_email(rule, container_name, message)
        elif rule.channel == "webhook":
            await self._send_webhook(rule, container_name, value)

    async def _send_slack(self, rule: AlertRule, message: str) -> None:
        if not rule.channel_config:
            return
        try:
            config = json.loads(rule.channel_config)
            url = config.get("slack_url")
            if not url:
                return
            await self._http.post(url, json={"text": message})
            logger.info("Slack alert sent for rule %s", rule.id)
        except Exception as e:
            logger.error("Failed to send Slack alert: %s", e)

    async def _send_email(self, rule: AlertRule, container_name: str, message: str) -> None:
        try:
            import resend
            from app.core.config import settings
            if not settings.RESEND_API_KEY:
                return

            config = json.loads(rule.channel_config or "{}")
            to_email = config.get("email", settings.EMAIL_FROM)

            resend.api_key = settings.RESEND_API_KEY
            resend.Emails.send({
                "from": settings.EMAIL_FROM,
                "to": to_email,
                "subject": f"[DockerWatch] Alert: {container_name}",
                "text": message,
            })
            logger.info("Email alert sent for rule %s", rule.id)
        except Exception as e:
            logger.error("Failed to send email alert: %s", e)

    async def _send_webhook(self, rule: AlertRule, container_name: str, value: float) -> None:
        if not rule.channel_config:
            return
        try:
            config = json.loads(rule.channel_config)
            url = config.get("url")
            if not url:
                return
            payload = {
                "rule_id": str(rule.id),
                "container_name": container_name,
                "metric": rule.metric,
                "value": value,
                "threshold": rule.threshold,
                "fired_at": datetime.now(timezone.utc).isoformat(),
            }
            await self._http.post(url, json=payload)
            logger.info("Webhook alert sent for rule %s", rule.id)
        except Exception as e:
            logger.error("Failed to send webhook alert: %s", e)

    async def close(self) -> None:
        await self._http.aclose()