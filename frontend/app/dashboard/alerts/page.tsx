"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../layout";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface AlertRule {
  id: string;
  container_id: string | null;
  metric: string;
  operator: string;
  threshold: number;
  duration_minutes: number;
  channel: string;
  channel_config: string | null;
  is_active: boolean;
}

interface AlertEvent {
  id: string;
  container_name: string;
  metric: string;
  value: number;
  threshold: number;
  fired_at: string;
  resolved_at: string | null;
}

interface Container {
  id: string;
  name: string;
}

const METRICS = ["cpu_percent", "mem_percent", "net_rx_bytes", "net_tx_bytes"];
const OPERATORS = ["gt", "lt", "gte", "lte"];
const OP_LABELS: Record<string, string> = {
  gt: ">",
  lt: "<",
  gte: "≥",
  lte: "≤",
};

const CHANNELS = ["email", "slack", "webhook"];

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;

  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;

  return `${Math.floor(diff / 86400)}d ago`;
}

export default function AlertsPage() {
  const { token, workspaceId } = useAuth();

  const [rules, setRules] = useState<AlertRule[]>([]);
  const [events, setEvents] = useState<AlertEvent[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form state
  const [containerId, setContainerId] = useState("");
  const [metric, setMetric] = useState("cpu_percent");
  const [operator, setOperator] = useState("gt");
  const [threshold, setThreshold] = useState("80");
  const [duration, setDuration] = useState("5");
  const [channel, setChannel] = useState("email");
  const [channelConfig, setChannelConfig] = useState("");

  const [saving, setSaving] = useState(false);

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const load = async () => {
    if (!token || !workspaceId) return;

    try {
      setLoading(true);

      // Load rules + events
      const [rulesRes, eventsRes, serversRes] = await Promise.all([
        fetch(
          `${API}/alert-rules/workspaces/${workspaceId}/alert-rules`,
          { headers }
        ),
        fetch(
          `${API}/alert-rules/workspaces/${workspaceId}/alert-events`,
          { headers }
        ),
        fetch(
          `${API}/workspaces/${workspaceId}/servers`,
          { headers }
        ),
      ]);

      const rulesData = await rulesRes.json();
      const eventsData = await eventsRes.json();
      const serversData = await serversRes.json();

      setRules(Array.isArray(rulesData) ? rulesData : []);
      setEvents(Array.isArray(eventsData) ? eventsData : []);

      // Flatten containers from servers
      const allContainers: Container[] = [];

      if (Array.isArray(serversData)) {
        serversData.forEach((server: any) => {
          if (Array.isArray(server.containers)) {
            server.containers.forEach((c: any) => {
              allContainers.push({
                id: c.id,
                name: c.name,
              });
            });
          }
        });
      }

      setContainers(allContainers);
    } catch (err) {
      console.error("Failed loading alerts page:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token, workspaceId]);

  const createRule = async () => {
    if (!token || !workspaceId) return;

    try {
      setSaving(true);

      let config = null;

      if (channel === "slack" && channelConfig) {
        config = JSON.stringify({ slack_url: channelConfig });
      } else if (channel === "email" && channelConfig) {
        config = JSON.stringify({ email: channelConfig });
      } else if (channel === "webhook" && channelConfig) {
        config = JSON.stringify({ url: channelConfig });
      }

      const res = await fetch(
        `${API}/alert-rules/workspaces/${workspaceId}/alert-rules`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            container_id: containerId || null,
            metric,
            operator,
            threshold: parseFloat(threshold),
            duration_minutes: parseInt(duration),
            channel,
            channel_config: config,
          }),
        }
      );

      if (!res.ok) {
        const err = await res.text();
        console.error(err);
        alert("Failed creating rule");
        return;
      }

      setShowForm(false);
      setChannelConfig("");
      setContainerId("");

      await load();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const toggleRule = async (rule: AlertRule) => {
    await fetch(
      `${API}/alert-rules/workspaces/${workspaceId}/alert-rules/${rule.id}/toggle`,
      {
        method: "PATCH",
        headers,
      }
    );

    load();
  };

  const deleteRule = async (id: string) => {
    await fetch(
      `${API}/alert-rules/workspaces/${workspaceId}/alert-rules/${id}`,
      {
        method: "DELETE",
        headers,
      }
    );

    load();
  };

  const channelPlaceholder: Record<string, string> = {
    slack: "https://hooks.slack.com/services/...",
    email: "alerts@yourcompany.com",
    webhook: "https://yourserver.com/webhook",
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="mono text-xs text-[var(--text-3)] mb-0.5">
            $ dockerwatch alerts --list
          </div>

          <h1 className="text-xl font-semibold text-[var(--text)]">
            Alerts
          </h1>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="mono text-xs bg-[var(--green)] text-black font-semibold px-4 py-2 rounded hover:opacity-90 transition-opacity"
        >
          + new rule
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card p-5 mb-6">
          <div className="mono text-xs text-[var(--text-3)] uppercase mb-4">
            New Alert Rule
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">

            {/* Container */}
            <div>
              <label className="mono text-xs text-[var(--text-3)] uppercase block mb-1.5">
                Container
              </label>

              <select
                value={containerId}
                onChange={(e) => setContainerId(e.target.value)}
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-2 mono text-sm"
              >
                <option value="">All Containers</option>

                {containers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Metric */}
            <div>
              <label className="mono text-xs text-[var(--text-3)] uppercase block mb-1.5">
                Metric
              </label>

              <select
                value={metric}
                onChange={(e) => setMetric(e.target.value)}
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-2 mono text-sm"
              >
                {METRICS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Operator */}
            <div>
              <label className="mono text-xs text-[var(--text-3)] uppercase block mb-1.5">
                Operator
              </label>

              <select
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-2 mono text-sm"
              >
                {OPERATORS.map((o) => (
                  <option key={o} value={o}>
                    {OP_LABELS[o]} ({o})
                  </option>
                ))}
              </select>
            </div>

            {/* Threshold */}
            <div>
              <label className="mono text-xs text-[var(--text-3)] uppercase block mb-1.5">
                Threshold
              </label>

              <input
                type="number"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-2 mono text-sm"
              />
            </div>

            {/* Duration */}
            <div>
              <label className="mono text-xs text-[var(--text-3)] uppercase block mb-1.5">
                Duration (minutes)
              </label>

              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-2 mono text-sm"
              />
            </div>

            {/* Channel */}
            <div>
              <label className="mono text-xs text-[var(--text-3)] uppercase block mb-1.5">
                Channel
              </label>

              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-2 mono text-sm"
              >
                {CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Config */}
            <div className="col-span-2">
              <label className="mono text-xs text-[var(--text-3)] uppercase block mb-1.5">
                Channel Config
              </label>

              <input
                type="text"
                value={channelConfig}
                onChange={(e) => setChannelConfig(e.target.value)}
                placeholder={channelPlaceholder[channel]}
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-2 mono text-sm"
              />
            </div>
          </div>

          <button
            onClick={createRule}
            disabled={saving}
            className="mono text-xs bg-[var(--green)] text-black font-semibold px-4 py-2 rounded hover:opacity-90"
          >
            {saving ? "saving..." : "create rule"}
          </button>
        </div>
      )}

      {/* Rules */}
      <div className="card mb-6">
        <div className="px-4 py-3 border-b border-[var(--border)]">
          <span className="mono text-xs font-semibold uppercase">
            Active Rules ({rules.length})
          </span>
        </div>

        {loading && (
          <div className="p-6 mono text-xs text-center">
            loading...
          </div>
        )}

        {!loading && rules.length === 0 && (
          <div className="p-6 mono text-xs text-center text-[var(--text-3)]">
            no alert rules yet
          </div>
        )}

        {rules.map((rule) => (
          <div
            key={rule.id}
            className="flex items-center gap-4 px-4 py-3 border-b border-[var(--border)]"
          >
            <div className="flex-1">
              <div className="mono text-sm">
                {rule.metric} {OP_LABELS[rule.operator]} {rule.threshold}
              </div>

              <div className="mono text-xs text-[var(--text-3)]">
                duration: {rule.duration_minutes}m → {rule.channel}
              </div>
            </div>

            <button
              onClick={() => toggleRule(rule)}
              className="mono text-xs px-2 py-1 border rounded"
            >
              {rule.is_active ? "active" : "paused"}
            </button>

            <button
              onClick={() => deleteRule(rule.id)}
              className="mono text-xs text-red-400"
            >
              delete
            </button>
          </div>
        ))}
      </div>

      {/* Events */}
      <div className="card">
        <div className="px-4 py-3 border-b border-[var(--border)]">
          <span className="mono text-xs font-semibold uppercase">
            Recent Events
          </span>
        </div>

        {events.length === 0 && (
          <div className="p-6 mono text-xs text-center text-[var(--text-3)]">
            no alert events yet
          </div>
        )}

        {events.map((ev) => (
          <div
            key={ev.id}
            className="flex items-center gap-4 px-4 py-3 border-b border-[var(--border)]"
          >
            <div className="flex-1">
              <div className="mono text-sm">
                {ev.container_name} → {ev.metric}
              </div>

              <div className="mono text-xs text-[var(--text-3)]">
                value: {ev.value} / threshold: {ev.threshold}
              </div>

              <div className="mono text-xs text-[var(--text-3)]">
                fired {timeAgo(ev.fired_at)}
              </div>
            </div>

            <div className="mono text-xs text-[var(--amber)]">
              firing
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}