"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { useAuth } from "../../../layout";
import {
  apiGetContainerMetrics, apiGetContainerSummary,
  ContainerMetricsResponse, ContainerSummary, TimeRange,
} from "../../../../lib/api";

function bytes(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + " GB";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + " MB";
  return (n / 1e3).toFixed(0) + " KB";
}

function fmtTime(iso: string, range: TimeRange): string {
  const d = new Date(iso);
  if (range === "1h" || range === "6h") {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

const RANGES: TimeRange[] = ["1h", "6h", "24h", "7d", "30d"];

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card px-4 py-3">
      <div className="mono text-xs text-[var(--text-3)] uppercase mb-1">{label}</div>
      <div className="mono text-xl font-semibold text-[var(--text)]">{value}</div>
      {sub && <div className="mono text-xs text-[var(--text-3)] mt-0.5">{sub}</div>}
    </div>
  );
}

function Chart({
  data, dataKey, color, label, formatter,
}: {
  data: any[];
  dataKey: string;
  color: string;
  label: string;
  formatter?: (v: number) => string;
}) {
  return (
    <div className="card p-4">
      <div className="mono text-xs text-[var(--text-3)] uppercase mb-4">{label}</div>
      <ResponsiveContainer width="100%" height={140}>
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="time"
            tick={{ fill: "var(--text-3)", fontSize: 10, fontFamily: "IBM Plex Mono" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: "var(--text-3)", fontSize: 10, fontFamily: "IBM Plex Mono" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatter}
            width={55}
          />
          <Tooltip
            contentStyle={{
              background: "var(--bg-2)",
              border: "1px solid var(--border)",
              borderRadius: 4,
              fontFamily: "IBM Plex Mono",
              fontSize: 12,
            }}
            labelStyle={{ color: "var(--text-2)" }}
            itemStyle={{ color }}
            formatter={(v) => (formatter && typeof v === "number" ? formatter(v) : v)}
          />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 3, fill: color }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function ContainerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const router = useRouter();

  const [range, setRange] = useState<TimeRange>("24h");
  const [metrics, setMetrics] = useState<ContainerMetricsResponse | null>(null);
  const [summary, setSummary] = useState<ContainerSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !id) return;
    setLoading(true);
    Promise.all([
      apiGetContainerMetrics(token, id, range),
      apiGetContainerSummary(token, id),
    ]).then(([m, s]) => {
      setMetrics(m);
      setSummary(s);
    }).finally(() => setLoading(false));
  }, [token, id, range]);

  const chartData = (metrics?.points ?? []).map((p) => ({
    ...p,
    time: fmtTime(p.time, range),
    mem_percent: p.mem_limit_bytes > 0
      ? Math.round((p.mem_usage_bytes / p.mem_limit_bytes) * 100)
      : 0,
  }));

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="mono text-xs text-[var(--text-3)] hover:text-[var(--text)] transition-colors"
        >
          ← back
        </button>
        <div className="text-[var(--border)]">/</div>
        <div>
          <div className="mono text-xs text-[var(--text-3)]">container</div>
          <h1 className="mono font-semibold text-[var(--green)]">
            {metrics?.container_name ?? id}
          </h1>
        </div>

        {/* Range selector */}
        <div className="ml-auto flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`mono text-xs px-2.5 py-1 rounded transition-colors
                ${range === r
                  ? "bg-[var(--green-dim)] text-[var(--green)] border border-[var(--green)]"
                  : "text-[var(--text-3)] hover:text-[var(--text)] border border-transparent"
                }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Summary stats */}
      {summary && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          <StatCard
            label="avg cpu"
            value={`${summary.avg_cpu_percent}%`}
            sub={`max ${summary.max_cpu_percent}%`}
          />
          <StatCard
            label="avg memory"
            value={bytes(summary.avg_mem_bytes)}
            sub={`max ${bytes(summary.max_mem_bytes)}`}
          />
          <StatCard
            label="memory limit"
            value={bytes(summary.mem_limit_bytes)}
          />
          <StatCard
            label="mem utilisation"
            value={
              summary.mem_limit_bytes > 0
                ? `${Math.round((summary.avg_mem_bytes / summary.mem_limit_bytes) * 100)}%`
                : "—"
            }
          />
        </div>
      )}

      {loading && (
        <div className="card p-8 text-center mono text-sm text-[var(--text-3)]">
          loading metrics...
        </div>
      )}

      {!loading && chartData.length === 0 && (
        <div className="card p-8 text-center mono text-sm text-[var(--text-3)]">
          no data for this range yet
        </div>
      )}

      {!loading && chartData.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <Chart
            data={chartData}
            dataKey="cpu_percent"
            color="var(--green)"
            label="cpu usage %"
            formatter={(v) => `${v.toFixed(1)}%`}
          />
          <Chart
            data={chartData}
            dataKey="mem_percent"
            color="var(--blue)"
            label="memory utilisation %"
            formatter={(v) => `${v.toFixed(0)}%`}
          />
          <Chart
            data={chartData}
            dataKey="net_rx_bytes"
            color="var(--amber)"
            label="network rx"
            formatter={bytes}
          />
          <Chart
            data={chartData}
            dataKey="net_tx_bytes"
            color="var(--amber)"
            label="network tx"
            formatter={bytes}
          />
        </div>
      )}
    </div>
  );
}