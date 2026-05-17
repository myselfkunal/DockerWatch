"""
cost.py — estimates monthly infrastructure cost per container.

Methodology:
  1. Look at the container's average CPU% and memory usage over the last 7 days.
  2. Find the smallest AWS EC2 instance that could comfortably run it
     (we use 70% utilisation as the comfort threshold).
  3. Multiply the instance hourly price × 730 hours = monthly estimate.
  4. Flag containers where average CPU < 5% as "idle" — wasted spend.

This is an estimate, not a bill. We're clear about that in the UI.
The value isn't precision — it's surfacing the containers that are
costing money while doing nothing.
"""
from __future__ import annotations

from dataclasses import dataclass

# ---------------------------------------------------------------------------
# EC2 price table  (us-east-1 on-demand Linux, 2024 prices)
# Ordered smallest → largest so we always find the cheapest fit
# ---------------------------------------------------------------------------
@dataclass(frozen=True)
class EC2Instance:
    name: str
    vcpus: float
    memory_gb: float
    hourly_usd: float


EC2_INSTANCES: list[EC2Instance] = [
    EC2Instance("t3.nano",    0.2,  0.5,   0.0052),
    EC2Instance("t3.micro",   0.2,  1.0,   0.0104),
    EC2Instance("t3.small",   0.2,  2.0,   0.0208),
    EC2Instance("t3.medium",  0.4,  4.0,   0.0416),
    EC2Instance("t3.large",   0.8,  8.0,   0.0832),
    EC2Instance("t3.xlarge",  1.6,  16.0,  0.1664),
    EC2Instance("t3.2xlarge", 3.2,  32.0,  0.3328),
    EC2Instance("m5.xlarge",  4.0,  16.0,  0.192),
    EC2Instance("m5.2xlarge", 8.0,  32.0,  0.384),
    EC2Instance("m5.4xlarge", 16.0, 64.0,  0.768),
]

HOURS_PER_MONTH = 730
COMFORT_UTILISATION = 0.70  # size the instance so avg usage ≤ 70%
IDLE_CPU_THRESHOLD = 5.0    # avg CPU% below this → container is idle


@dataclass
class ContainerCostEstimate:
    container_id: str
    container_name: str
    avg_cpu_percent: float
    avg_mem_gb: float
    estimated_instance: str
    monthly_cost_usd: float
    is_idle: bool
    savings_if_removed_usd: float


def estimate_container_cost(
    container_id: str,
    container_name: str,
    avg_cpu_percent: float,
    avg_mem_bytes: int,
) -> ContainerCostEstimate:
    """
    Given average CPU% and memory usage, find the cheapest EC2 instance
    that could run this container and return a monthly cost estimate.
    """
    avg_mem_gb = avg_mem_bytes / (1024 ** 3)

    # Required capacity at comfort utilisation
    # e.g. if container uses avg 40% CPU, we need an instance where
    # 40% ≤ 70% of capacity → need at least 40/70 = 0.57 vCPUs
    required_vcpus = (avg_cpu_percent / 100) / COMFORT_UTILISATION
    required_mem_gb = avg_mem_gb / COMFORT_UTILISATION

    # Find smallest instance that satisfies both constraints
    matched = None
    for instance in EC2_INSTANCES:
        if instance.vcpus >= required_vcpus and instance.memory_gb >= required_mem_gb:
            matched = instance
            break

    # If nothing fits (very high usage), use the largest
    if matched is None:
        matched = EC2_INSTANCES[-1]

    monthly_cost = matched.hourly_usd * HOURS_PER_MONTH
    is_idle = avg_cpu_percent < IDLE_CPU_THRESHOLD

    return ContainerCostEstimate(
        container_id=container_id,
        container_name=container_name,
        avg_cpu_percent=round(avg_cpu_percent, 2),
        avg_mem_gb=round(avg_mem_gb, 3),
        estimated_instance=matched.name,
        monthly_cost_usd=round(monthly_cost, 2),
        is_idle=is_idle,
        savings_if_removed_usd=round(monthly_cost, 2) if is_idle else 0.0,
    )


@dataclass
class WorkspaceCostSummary:
    total_monthly_usd: float
    total_wasted_usd: float
    container_count: int
    idle_container_count: int
    containers: list[ContainerCostEstimate]
    top_savings: list[dict]  # top 3 actionable recommendations


def build_cost_summary(estimates: list[ContainerCostEstimate]) -> WorkspaceCostSummary:
    total = sum(e.monthly_cost_usd for e in estimates)
    wasted = sum(e.savings_if_removed_usd for e in estimates)
    idle_count = sum(1 for e in estimates if e.is_idle)

    # Top savings opportunities — idle containers sorted by cost desc
    idle = sorted(
        [e for e in estimates if e.is_idle],
        key=lambda e: e.monthly_cost_usd,
        reverse=True,
    )
    top_savings = [
        {
            "container_name": e.container_name,
            "reason": f"Idle container — avg CPU {e.avg_cpu_percent}%",
            "saving_usd": e.savings_if_removed_usd,
            "action": "Consider stopping or removing this container",
        }
        for e in idle[:3]
    ]

    return WorkspaceCostSummary(
        total_monthly_usd=round(total, 2),
        total_wasted_usd=round(wasted, 2),
        container_count=len(estimates),
        idle_container_count=idle_count,
        containers=estimates,
        top_savings=top_savings,
    )