"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../layout";
import { apiGetWorkspaces, apiCreateServer, Workspace } from "../../../lib/api";

export default function SettingsPage() {
  const { token, workspaceId } = useAuth();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [serverName, setServerName] = useState("");
  const [newKey, setNewKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!token) return;
    apiGetWorkspaces(token).then((ws) => {
      const current = ws.find((w) => w.id === workspaceId);
      if (current) setWorkspace(current);
    });
  }, [token, workspaceId]);

  const createServer = async () => {
    if (!token || !workspaceId || !serverName.trim()) return;
    setLoading(true);
    try {
      const result = await apiCreateServer(token, workspaceId, serverName.trim());
      setNewKey(result.api_key);
      setServerName("");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const installCmd = newKey
    ? `pip install dockerwatch-agent && dockerwatch-agent start --api-key=${newKey} --api-url=${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}`
    : "";

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <div className="mono text-xs text-[var(--text-3)] mb-0.5">$ dockerwatch settings</div>
        <h1 className="text-xl font-semibold text-[var(--text)]">Settings</h1>
      </div>

      {/* Workspace info */}
      {workspace && (
        <div className="card p-4 mb-6">
          <div className="mono text-xs text-[var(--text-3)] uppercase mb-3">Workspace</div>
          <div className="flex items-center justify-between">
            <div>
              <div className="mono text-sm text-[var(--text)]">{workspace.name}</div>
              <div className="mono text-xs text-[var(--text-3)]">id: {workspace.id}</div>
            </div>
            <span className={`mono text-xs px-2 py-1 rounded border
              ${workspace.plan === "free"
                ? "border-[var(--border)] text-[var(--text-3)]"
                : "border-[var(--green)] text-[var(--green)] bg-[var(--green-dim)]"
              }`}>
              {workspace.plan}
            </span>
          </div>
        </div>
      )}

      {/* Add server */}
      <div className="card p-4 mb-6">
        <div className="mono text-xs text-[var(--text-3)] uppercase mb-3">Add Server</div>
        <p className="text-xs text-[var(--text-2)] mb-4">
          Each server gets a unique API key. Install the agent on that server using the key.
        </p>

        <div className="flex gap-2">
          <input
            type="text"
            value={serverName}
            onChange={(e) => setServerName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createServer()}
            placeholder="my-production-server"
            className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-2
                       mono text-sm text-[var(--text)] placeholder:text-[var(--text-3)]
                       focus:outline-none focus:border-[var(--green)] transition-colors"
          />
          <button
            onClick={createServer}
            disabled={loading || !serverName.trim()}
            className="bg-[var(--green)] text-black mono text-xs font-semibold px-4 py-2 rounded
                       hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "..." : "generate key"}
          </button>
        </div>

        {/* New API key — shown once */}
        {newKey && (
          <div className="mt-4 bg-[var(--bg)] border border-[var(--green)] rounded p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="mono text-xs text-[var(--green)] uppercase font-semibold">
                ✓ API Key — copy this now, it won't be shown again
              </span>
              <button
                onClick={copy}
                className="mono text-xs text-[var(--text-3)] hover:text-[var(--green)] transition-colors"
              >
                {copied ? "✓ copied" : "copy"}
              </button>
            </div>
            <code className="mono text-xs text-[var(--text)] break-all block mb-4">{newKey}</code>

            <div className="mono text-xs text-[var(--text-3)] mb-2">Install command:</div>
            <code className="mono text-xs text-[var(--green)] break-all block bg-[var(--bg-3)] p-3 rounded">
              {installCmd}
            </code>
          </div>
        )}
      </div>

      {/* Plan limits info */}
      <div className="card p-4">
        <div className="mono text-xs text-[var(--text-3)] uppercase mb-3">Plan limits</div>
        <div className="space-y-2">
          {[
            { plan: "free",  servers: 1,   history: "24h",  alerts: "email only", price: "$0" },
            { plan: "pro",   servers: 5,   history: "90d",  alerts: "slack + email", price: "$19/mo" },
            { plan: "team",  servers: "∞", history: "1yr",  alerts: "all channels", price: "$49/mo" },
          ].map((p) => (
            <div key={p.plan} className={`flex items-center gap-4 px-3 py-2 rounded
              ${workspace?.plan === p.plan ? "bg-[var(--green-dim)] border border-[var(--green)]" : "bg-[var(--bg-3)]"}`}>
              <div className="mono text-xs font-semibold text-[var(--text)] w-10">{p.plan}</div>
              <div className="mono text-xs text-[var(--text-2)] flex-1">
                {p.servers} server{p.servers !== 1 ? "s" : ""} · {p.history} history · {p.alerts}
              </div>
              <div className="mono text-xs text-[var(--text-3)]">{p.price}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}