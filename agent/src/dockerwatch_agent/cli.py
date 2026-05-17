"""
cli.py — command-line interface for the DockerWatch agent.
Installed as `dockerwatch-agent` via pyproject.toml entry_points.
"""
import logging
import os

import click

from dockerwatch_agent.agent import Agent

DEFAULT_API_URL = "https://api.dockerwatch.io"


def _setup_logging(verbose: bool) -> None:
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        level=level,
    )


@click.group()
def main():
    """DockerWatch Agent — monitor your containers and track costs."""
    pass


@main.command()
@click.option(
    "--api-key",
    envvar="DOCKERWATCH_API_KEY",
    required=True,
    help="Your DockerWatch server API key (or set DOCKERWATCH_API_KEY env var)",
)
@click.option(
    "--api-url",
    envvar="DOCKERWATCH_API_URL",
    default=DEFAULT_API_URL,
    show_default=True,
    help="DockerWatch backend URL (override for self-hosted)",
)
@click.option("--verbose", "-v", is_flag=True, help="Enable debug logging")
def start(api_key: str, api_url: str, verbose: bool):
    """Start the agent and begin shipping metrics."""
    _setup_logging(verbose)

    click.echo(f"Starting DockerWatch agent → {api_url}")
    click.echo("Press Ctrl+C to stop\n")

    try:
        agent = Agent(api_url=api_url, api_key=api_key)
        agent.start()
    except RuntimeError as e:
        click.echo(f"Error: {e}", err=True)
        raise SystemExit(1)


@main.command()
@click.option("--api-key", envvar="DOCKERWATCH_API_KEY", required=True)
@click.option("--api-url", envvar="DOCKERWATCH_API_URL", default=DEFAULT_API_URL)
def test(api_key: str, api_url: str):
    """Collect one snapshot and print it — without sending to the backend."""
    _setup_logging(verbose=True)
    from dockerwatch_agent.collector import DockerCollector
    import json

    collector = DockerCollector()
    metrics = collector.collect()

    if not metrics:
        click.echo("No running containers found.")
        return

    click.echo(f"\nFound {len(metrics)} container(s):\n")
    click.echo(json.dumps(metrics, indent=2))