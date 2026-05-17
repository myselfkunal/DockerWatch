"""
agent.py — main polling loop.
Collects metrics every 30s and ships them to the backend.
"""
from __future__ import annotations

import logging
import signal
import sys

from apscheduler.schedulers.blocking import BlockingScheduler

from dockerwatch_agent.collector import DockerCollector
from dockerwatch_agent.sender import MetricSender

logger = logging.getLogger(__name__)

INTERVAL_SECONDS = 30


class Agent:
    def __init__(self, api_url: str, api_key: str) -> None:
        self._collector = DockerCollector()  # raises if Docker unreachable
        self._sender = MetricSender(api_url, api_key)
        self._scheduler = BlockingScheduler()

    def _tick(self) -> None:
        """Called every INTERVAL_SECONDS — collect + send."""
        metrics = self._collector.collect()
        if metrics:
            ok = self._sender.send(metrics)
            if not ok:
                logger.warning("Metrics not delivered this cycle — will retry next tick")
        else:
            logger.debug("No running containers found")

    def start(self) -> None:
        logger.info("DockerWatch agent starting (interval: %ds)", INTERVAL_SECONDS)

        # Run once immediately so the user sees data right away
        self._tick()

        self._scheduler.add_job(
            self._tick,
            trigger="interval",
            seconds=INTERVAL_SECONDS,
            id="collect_and_send",
            max_instances=1,       # don't pile up if a tick takes too long
            coalesce=True,
        )

        # Graceful shutdown on SIGINT / SIGTERM
        def _shutdown(sig, frame):
            logger.info("Shutting down DockerWatch agent...")
            self._scheduler.shutdown(wait=False)
            self._sender.close()
            sys.exit(0)

        signal.signal(signal.SIGINT, _shutdown)
        signal.signal(signal.SIGTERM, _shutdown)

        try:
            self._scheduler.start()
        except (KeyboardInterrupt, SystemExit):
            pass
        finally:
            self._sender.close()