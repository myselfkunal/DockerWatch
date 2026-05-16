"""
collector.py — reads raw stats from Docker daemon and returns clean dicts.

The Docker stats API returns raw counters, not percentages. CPU% has to be
calculated from the delta between two readings. This file handles all that math.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

import docker
from docker.errors import DockerException

logger = logging.getLogger(__name__)


def _cpu_percent(stats: dict[str, Any]) -> float:
    """
    Calculate CPU usage % from raw Docker stats.
    Docker gives cumulative CPU nanoseconds — we compute delta vs previous reading.
    Formula is the same one `docker stats` CLI uses internally.
    """
    cpu_delta = (
        stats["cpu_stats"]["cpu_usage"]["total_usage"]
        - stats["precpu_stats"]["cpu_usage"]["total_usage"]
    )
    system_delta = (
        stats["cpu_stats"]["system_cpu_usage"]
        - stats["precpu_stats"]["system_cpu_usage"]
    )
    num_cpus = stats["cpu_stats"].get("online_cpus") or len(
        stats["cpu_stats"]["cpu_usage"].get("percpu_usage", [1])
    )

    if system_delta <= 0 or cpu_delta < 0:
        return 0.0

    return round((cpu_delta / system_delta) * num_cpus * 100.0, 2)


def _network_io(stats: dict[str, Any]) -> tuple[int, int]:
    """Return (rx_bytes, tx_bytes) summed across all network interfaces."""
    networks = stats.get("networks", {})
    rx = sum(iface.get("rx_bytes", 0) for iface in networks.values())
    tx = sum(iface.get("tx_bytes", 0) for iface in networks.values())
    return rx, tx


def _block_io(stats: dict[str, Any]) -> tuple[int, int]:
    """Return (read_bytes, write_bytes) from block I/O stats."""
    io_service = stats.get("blkio_stats", {}).get("io_service_bytes_recursive") or []
    read_bytes = 0
    write_bytes = 0
    for entry in io_service:
        op = entry.get("op", "").lower()
        if op == "read":
            read_bytes += entry.get("value", 0)
        elif op == "write":
            write_bytes += entry.get("value", 0)
    return read_bytes, write_bytes


class DockerCollector:
    def __init__(self) -> None:
        try:
            self._client = docker.from_env()
            self._client.ping()
            logger.info("Connected to Docker daemon")
        except DockerException as e:
            raise RuntimeError(
                "Cannot connect to Docker daemon. "
                "Is Docker running? Do you have permission to access /var/run/docker.sock?"
            ) from e

    def collect(self) -> list[dict[str, Any]]:
        """
        Collect metrics for all running containers.
        Returns a list of metric dicts ready to POST to the backend.
        """
        results = []

        try:
            containers = self._client.containers.list()  # only running containers
        except DockerException as e:
            logger.error("Failed to list containers: %s", e)
            return results

        for container in containers:
            try:
                # stream=False → single snapshot (blocking ~1s per container)
                raw = container.stats(stream=False)
                metric = self._parse(container, raw)
                if metric:
                    results.append(metric)
            except DockerException as e:
                logger.warning("Failed to collect stats for %s: %s", container.name, e)
                continue

        logger.debug("Collected metrics for %d containers", len(results))
        return results

    def _parse(self, container: Any, stats: dict[str, Any]) -> dict[str, Any] | None:
        """Parse raw Docker stats into a clean metric dict."""
        try:
            mem = stats.get("memory_stats", {})
            mem_usage = mem.get("usage", 0)
            # Docker includes file cache in usage — subtract it for real RSS
            mem_cache = mem.get("stats", {}).get("cache", 0)
            mem_rss = max(mem_usage - mem_cache, 0)
            mem_limit = mem.get("limit", 0)

            net_rx, net_tx = _network_io(stats)
            blk_read, blk_write = _block_io(stats)

            return {
                "time": datetime.now(timezone.utc).isoformat(),
                "docker_id": container.id[:12],
                "name": container.name.lstrip("/"),
                "image": container.image.tags[0] if container.image.tags else container.image.short_id,
                "status": container.status,
                "cpu_percent": _cpu_percent(stats),
                "mem_usage_bytes": mem_rss,
                "mem_limit_bytes": mem_limit,
                "net_rx_bytes": net_rx,
                "net_tx_bytes": net_tx,
                "blk_read_bytes": blk_read,
                "blk_write_bytes": blk_write,
            }
        except (KeyError, TypeError, ZeroDivisionError) as e:
            logger.warning("Failed to parse stats for %s: %s", container.name, e)
            return None