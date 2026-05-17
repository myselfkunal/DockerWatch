"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../layout";
import { apiGetServers, ServerWithContainers, Container } from "../../lib/api";

function bytes(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + " GB";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + " MB";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + " KB";
  return n + " B";
}

function timeAgo(iso: string | null): string {
  if (!iso) return "never";

  const diff = (Date.now() - new Date(iso).getTime()) / 1000;

  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;

  return `${Math.floor(diff / 3600)}h ago`;
}

function StatusDot({ status }: { status: string }) {
  const cls =
    status === "running"
      ? "status-running"
      : status === "restarting"
      ? "status-restarting"
      : "status-stopped";

  return <span className={`status-dot ${cls}`} />;
}

function ContainerRow({
  c,
  onClick,
}: {
  c: Container;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-4 px-4 py-2.5 border-b border-[var(--border)]
                 hover:bg-[var(--bg-3)] cursor-pointer transition-colors group"
    >
      <StatusDot status={c.last_status || "stopped"} />

      <div className="flex-1 min-w-0">
        <span className="mono text-sm text-[var(--text)] group-hover:text-[var(--green)] transition-colors">
          {c.name}
        </span>

        <span className="mono text-xs text-[var(--text-3)] ml-2">
          {c.image || "unknown-image"}
        </span>
      </div>

      <div className="flex items-center gap-6 text-right">
        <div>
          <div className="mono text-xs text-[var(--text-3)] uppercase">
            status
          </div>

          <div
            className={`mono text-xs ${
              c.last_status === "running"
                ? "text-[var(--green)]"
                : "text-[var(--text-2)]"
            }`}
          >
            {c.last_status || "unknown"}
          </div>
        </div>

        <div>
          <div className="mono text-xs text-[var(--text-3)] uppercase">
            last seen
          </div>

          <div className="mono text-xs text-[var(--text-2)]">
            {timeAgo(c.last_seen_at)}
          </div>
        </div>

        <div className="mono text-xs text-[var(--text-3)] group-hover:text-[var(--text)] transition-colors">
          →
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { token, workspaceId } = useAuth();
  const router = useRouter();

  const [servers, setServers] = useState<ServerWithContainers[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    if (!token || !workspaceId) return;

    try {
      const data = await apiGetServers(token, workspaceId);

      const safeData = (data || []).map((server: any) => ({
        ...server,
        containers: Array.isArray(server.containers)
          ? server.containers
          : [],
      }));

      setServers(safeData);
      setError("");
    } catch (e: any) {
      setError(e.message || "Failed to load servers");
    } finally {
      setLoading(false);
    }
  }, [token, workspaceId, tick]);

  useEffect(() => {
    load();
  }, [load]);

  // auto refresh every 30s
  useEffect(() => {
    const id = setInterval(() => {
      setTick((t) => t + 1);
    }, 30000);

    return () => clearInterval(id);
  }, []);

  const allContainers = servers.flatMap(
    (s) => Array.isArray(s.containers) ? s.containers : []
  );

  const totalContainers = allContainers.length;

  const runningContainers = allContainers.filter(
    (c) => c?.last_status === "running"
  ).length;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="mono text-xs text-[var(--text-3)] mb-0.5">
            $ dockerwatch --workspace=current
          </div>

          <h1 className="text-xl font-semibold text-[var(--text)]">
            Overview
          </h1>
        </div>

        <button
          onClick={() => setTick((t) => t + 1)}
          className="mono text-xs text-[var(--text-3)] hover:text-[var(--green)] transition-colors"
        >
          ↺ refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "servers", value: servers.length },
          { label: "containers", value: totalContainers },
          { label: "running", value: runningContainers, accent: true },
        ].map((s) => (
          <div key={s.label} className="card px-4 py-3">
            <div className="mono text-xs text-[var(--text-3)] uppercase mb-1">
              {s.label}
            </div>

            <div
              className={`mono text-2xl font-semibold ${
                s.accent
                  ? "text-[var(--green)]"
                  : "text-[var(--text)]"
              }`}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="card p-8 text-center mono text-sm text-[var(--text-3)]">
          loading containers...
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="card p-4 mono text-xs text-[var(--red)] bg-[var(--red-dim)]">
          ✗ {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && servers.length === 0 && (
        <div className="card p-8 text-center">
          <div className="mono text-[var(--text-3)] text-sm mb-3">
            no servers connected
          </div>

          <div className="mono text-xs text-[var(--text-3)]">
            Go to Settings → Add Server to get your API key, then run:
          </div>

          <div className="mt-3 bg-[var(--bg)] border border-[var(--border)] rounded px-4 py-3 inline-block">
            <code className="mono text-xs text-[var(--green)]">
              pip install dockerwatch-agent && dockerwatch-agent start
              --api-key=YOUR_KEY
            </code>
          </div>
        </div>
      )}

      {/* Servers */}
      {servers.map((server) => {
        const containers = Array.isArray(server.containers)
          ? server.containers
          : [];

        return (
          <div key={server.id} className="card mb-4">
            {/* Server header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <span className="status-dot status-running" />

                <span className="mono font-semibold text-sm text-[var(--text)]">
                  {server.name}
                </span>
              </div>

              <div className="mono text-xs text-[var(--text-3)]">
                last seen {timeAgo(server.last_seen_at)}
              </div>
            </div>

            {/* Containers */}
            {containers.length === 0 ? (
              <div className="px-4 py-4 mono text-xs text-[var(--text-3)]">
                no containers detected
              </div>
            ) : (
              containers.map((c) => (
                <ContainerRow
                  key={c.id}
                  c={c}
                  onClick={() =>
                    router.push(`/dashboard/containers/${c.id}`)
                  }
                />
              ))
            )}
          </div>
        );
      })}
    </div>
  );
}