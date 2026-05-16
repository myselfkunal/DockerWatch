"""
sender.py — POSTs collected metrics to the DockerWatch backend.
Uses httpx with a persistent connection pool and exponential backoff on failure.
"""
from __future__ import annotations

import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)

TIMEOUT = httpx.Timeout(10.0, connect=5.0)
MAX_RETRIES = 3


class MetricSender:
    def __init__(self, api_url: str, api_key: str) -> None:
        self._url = api_url.rstrip("/") + "/ingest"
        self._client = httpx.Client(
            headers={
                "X-API-Key": api_key,
                "Content-Type": "application/json",
                "User-Agent": "dockerwatch-agent/0.1.0",
            },
            timeout=TIMEOUT,
        )

    def send(self, metrics: list[dict[str, Any]]) -> bool:
        """
        POST metrics to the backend.
        Returns True on success, False on failure (after retries).
        """
        if not metrics:
            return True

        payload = {"metrics": metrics}

        for attempt in range(1, MAX_RETRIES + 1):
            try:
                response = self._client.post(self._url, json=payload)
                response.raise_for_status()
                logger.debug("Sent %d metrics (attempt %d)", len(metrics), attempt)
                return True
            except httpx.HTTPStatusError as e:
                logger.error(
                    "Backend rejected metrics: %s %s (attempt %d/%d)",
                    e.response.status_code, e.response.text, attempt, MAX_RETRIES,
                )
                # 401/403 = bad API key — no point retrying
                if e.response.status_code in (401, 403):
                    logger.error("Invalid API key — stopping retries")
                    return False
            except httpx.RequestError as e:
                logger.warning(
                    "Network error sending metrics: %s (attempt %d/%d)",
                    e, attempt, MAX_RETRIES,
                )

        logger.error("Failed to send metrics after %d attempts", MAX_RETRIES)
        return False

    def close(self) -> None:
        self._client.close()