"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../layout";
import { apiGetCost, CostSummary } from "../../../lib/api";

function usd(n: number) {
  return `$${n.toFixed(2)}`;
}

export default function CostPage() {
  const { token, workspaceId } = useAuth();
  const [cost, setCost] = useState<CostSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token || !workspaceId) return;
    apiGetCost(token, workspaceId)
      .then(setCost)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token, workspaceId]);

  if (loading) return (
    <div className="p-6 mono text-sm text-[var(--text-3)]">calculating costs...</div>
  );

  if (error) return (
    <div className="p-6 mono text-sm text-[var(--red)]">✗ {error}</div>
  );

  if (!cost) return null;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="mono text-xs text-[var(--text-3)] mb-0.5">
          $ dockerwatch cost --workspace=current --period=monthly
        </div>
        <h1 className="text-xl font-semibold text-[var(--text)]">Cost Analysis</h1>
        <p className="text-xs text-[var(--text-3)] mt-1">
          Based on 7-day average usage mapped to AWS EC2 on-demand pricing (us-east-1)
        </p>
      </div>

      {/* Big numbers */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card px-5 py-4">
          <div className="mono text-xs text-[var(--text-3)] uppercase mb-1">est. monthly spend</div>
          <div className="mono text-3xl font-semibold text-[var(--text)]">
            {usd(cost.total_monthly_usd)}
          </div>
          <div className="mono text-xs text-[var(--text-3)] mt-1">
            {cost.container_count} containers
          </div>
        </div>

        <div className={`card px-5 py-4 ${cost.total_wasted_usd > 0 ? "border-[var(--amber)]" : ""}`}>
          <div className="mono text-xs text-[var(--text-3)] uppercase mb-1">wasted spend</div>
          <div className={`mono text-3xl font-semibold ${cost.total_wasted_usd > 0 ? "text-[var(--amber)]" : "text-[var(--green)]"}`}>
            {usd(cost.total_wasted_usd)}
          </div>
          <div className="mono text-xs text-[var(--text-3)] mt-1">
            {cost.idle_container_count} idle containers
          </div>
        </div>

        <div className="card px-5 py-4">
          <div className="mono text-xs text-[var(--text-3)] uppercase mb-1">potential savings</div>
          <div className="mono text-3xl font-semibold text-[var(--green)]">
            {usd(cost.total_wasted_usd)}
            <span className="text-sm font-normal text-[var(--text-3)]">/mo</span>
          </div>
          <div className="mono text-xs text-[var(--text-3)] mt-1">
            if idle containers removed
          </div>
        </div>
      </div>

      {/* Savings recommendations */}
      {cost.top_savings.length > 0 && (
        <div className="card mb-6">
          <div className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-2">
            <span className="text-[var(--amber)]">⚠</span>
            <span className="mono text-xs font-semibold text-[var(--text)] uppercase tracking-wider">
              Savings Opportunities
            </span>
          </div>
          {cost.top_savings.map((s, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] last:border-0">
              <div>
                <div className="mono text-sm text-[var(--text)]">{s.container_name}</div>
                <div className="mono text-xs text-[var(--text-3)] mt-0.5">{s.reason}</div>
                <div className="mono text-xs text-[var(--text-2)] mt-0.5">→ {s.action}</div>
              </div>
              <div className="mono text-lg font-semibold text-[var(--amber)]">
                {usd(s.saving_usd)}<span className="text-xs font-normal text-[var(--text-3)]">/mo</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Per-container table */}
      <div className="card">
        <div className="px-4 py-3 border-b border-[var(--border)]">
          <span className="mono text-xs font-semibold text-[var(--text)] uppercase tracking-wider">
            Per-Container Breakdown
          </span>
        </div>

        {/* Table header */}
        <div className="grid grid-cols-6 px-4 py-2 border-b border-[var(--border)] bg-[var(--bg-3)]">
          {["container", "avg cpu", "avg mem", "instance", "monthly", "status"].map((h) => (
            <div key={h} className="mono text-xs text-[var(--text-3)] uppercase">{h}</div>
          ))}
        </div>

        {cost.containers.map((c) => (
          <div
            key={c.container_id}
            className={`grid grid-cols-6 px-4 py-3 border-b border-[var(--border)] last:border-0
              ${c.is_idle ? "bg-[var(--amber-dim)]" : "hover:bg-[var(--bg-3)]"}`}
          >
            <div className="mono text-sm text-[var(--text)]">{c.container_name}</div>
            <div className="mono text-sm text-[var(--text-2)]">{c.avg_cpu_percent}%</div>
            <div className="mono text-sm text-[var(--text-2)]">{c.avg_mem_gb.toFixed(2)} GB</div>
            <div className="mono text-xs text-[var(--text-2)] self-center">{c.estimated_instance}</div>
            <div className="mono text-sm font-semibold text-[var(--text)]">
              {usd(c.monthly_cost_usd)}
            </div>
            <div>
              {c.is_idle ? (
                <span className="mono text-xs text-[var(--amber)] bg-[var(--amber-dim)] px-2 py-0.5 rounded">
                  idle
                </span>
              ) : (
                <span className="mono text-xs text-[var(--green)] bg-[var(--green-dim)] px-2 py-0.5 rounded">
                  active
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}