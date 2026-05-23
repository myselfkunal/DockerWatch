"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../layout";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://dockerwatch.mooo.com";

function Step({ num, title, done, children }: {
  num: string;
  title: string;
  done?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className={`card mb-3 overflow-hidden transition-all ${done ? "opacity-60" : ""}`}>
      <div
        className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-[var(--bg-3)] transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className={`w-7 h-7 rounded-full flex items-center justify-center mono text-xs font-semibold flex-shrink-0
          ${done
            ? "bg-[var(--green-dim)] text-[var(--green)] border border-[var(--green)]"
            : "bg-[var(--bg-3)] text-[var(--text-2)] border border-[var(--border)]"
          }`}>
          {done ? "✓" : num}
        </div>
        <span className={`mono text-sm font-semibold ${done ? "text-[var(--text-3)] line-through" : "text-[var(--text)]"}`}>
          {title}
        </span>
        <span className="ml-auto mono text-xs text-[var(--text-3)]">{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div className="px-5 pb-5 border-t border-[var(--border)]">
          {children}
        </div>
      )}
    </div>
  );
}

function Code({ children, copy = true }: { children: string; copy?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative group mt-2 mb-2">
      <pre className="bg-[var(--bg)] border border-[var(--border)] rounded px-4 py-3 mono text-xs text-[var(--green)] overflow-x-auto whitespace-pre-wrap break-all">
        {children}
      </pre>
      {copy && (
        <button
          onClick={() => {
            navigator.clipboard.writeText(children); 
            
            setCopied(true);
            setTimeout(() => {
              setCopied(false);
            }, 2000);
          }}
          className="absolute top-2 right-2 mono text-xs text-[var(--text-3)] hover:text-[var(--green)] transition-colors opacity-0 group-hover:opacity-100"
        >
          {copied ? "✓" : "copy"}
        </button>
      )}
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[var(--blue-dim)] border border-[var(--blue)] rounded px-4 py-3 mono text-xs text-[var(--text-2)] mt-3">
      💡 {children}
    </div>
  );
}

export default function GettingStartedPage() {
  const { token, workspaceId } = useAuth();
  const [apiKey, setApiKey] = useState("");
  const [serverName, setServerName] = useState("");
  const [creatingServer, setCreatingServer] = useState(false);
  const [hasContainers, setHasContainers] = useState(false);
  const [copied, setCopied] = useState(false);
  const [method, setMethod] = useState<"pip" | "docker" | "compose" | "systemd">("pip");

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  // Check if user already has containers (to mark steps as done)
  useEffect(() => {
    if (!token || !workspaceId) return;
    fetch(`${API}/workspaces/${workspaceId}/servers`, { headers })
      .then(r => r.json())
      .then(servers => {
        const containers = (servers ?? []).flatMap((s: any) => s.containers ?? []);
        setHasContainers(containers.length > 0);
      }).catch(() => { });
  }, [token, workspaceId, headers]);

  useEffect(() => {
    if (!serverName) {
      setServerName("my-server");
    }
  }, []);

  const createServer = async () => {
    if (!serverName.trim() || !token || !workspaceId) return;
    setCreatingServer(true);
    try {
      const res = await fetch(`${API}/workspaces/${workspaceId}/servers`, {
        method: "POST",
        headers,
        body: JSON.stringify({ name: serverName }),
      });
      const data = await res.json();
      setApiKey(data.api_key);
    } catch (e) {
      alert("Failed to create server — try again");
    } finally {
      setCreatingServer(false);
    }
  };

  const installCmd = `pip install dockerwatch-agent`;
  const startCmd = apiKey
    ? `dockerwatch-agent start --api-key=${apiKey} --api-url=${API}`
    : `dockerwatch-agent start --api-key=YOUR_API_KEY --api-url=${API}`;
  const startCmdDocker = apiKey
    ? `docker run -d \\\n  --name dockerwatch-agent \\\n  -e DOCKERWATCH_API_KEY=${apiKey} \\\n  -e DOCKERWATCH_API_URL=${API} \\\n  -v /var/run/docker.sock:/var/run/docker.sock:ro \\\n  --restart unless-stopped \\\n  ghcr.io/myselfkunal/dockerwatch-agent:latest`
    : `docker run -d \\\n  --name dockerwatch-agent \\\n  -e DOCKERWATCH_API_KEY=YOUR_API_KEY \\\n  -e DOCKERWATCH_API_URL=${API} \\\n  -v /var/run/docker.sock:/var/run/docker.sock:ro \\\n  --restart unless-stopped \\\n  ghcr.io/myselfkunal/dockerwatch-agent:latest`;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="mono text-xs text-[var(--text-3)] mb-0.5">$ dockerwatch --help</div>
        <h1 className="text-xl font-semibold text-[var(--text)] mb-1">Getting Started</h1>
        <p className="text-sm text-[var(--text-2)]">
          Connect your first server and start monitoring in under 2 minutes.
        </p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {["Create account", "Add server", "Install agent", "See data"].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`mono text-xs px-2.5 py-1 rounded ${(i === 0) || (i === 1 && apiKey) || (i <= 2 && hasContainers) || (i <= 3 && hasContainers)
                ? "bg-[var(--green-dim)] text-[var(--green)] border border-[var(--green)]"
                : "bg-[var(--bg-3)] text-[var(--text-3)] border border-[var(--border)]"
              }`}>{s}</div>
            {i < 3 && <span className="text-[var(--text-3)] text-xs">→</span>}
          </div>
        ))}
      </div>

      {/* Step 1 — Account */}
      <Step num="1" title="Create your account" done={true}>
        <p className="mono text-xs text-[var(--text-3)] mt-3">
          ✓ You're already signed in. This step is complete.
        </p>
      </Step>

      {/* Step 2 — Add server */}
      <Step num="2" title="Add a server" done={!!apiKey}>
        <p className="text-sm text-[var(--text-2)] mt-4 mb-4">
          Each server you want to monitor needs a unique API key. The agent uses this key to
          authenticate with DockerWatch and send metrics securely.
        </p>

        {!apiKey ? (
          <div>
            <label className="mono text-xs text-[var(--text-3)] uppercase block mb-2">
              Server name (e.g. "production-vps" or "home-server")
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={serverName}
                onChange={e => setServerName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && createServer()}
                placeholder="my-server"
                className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-2
                           mono text-sm text-[var(--text)] placeholder:text-[var(--text-3)]
                           focus:outline-none focus:border-[var(--green)] transition-colors"
              />
              <button
                onClick={createServer}
                disabled={creatingServer || !serverName.trim()}
                className="mono text-xs bg-[var(--green)] text-black font-semibold px-4 py-2
                           rounded hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {creatingServer ? "creating..." : "generate API key →"}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-[var(--bg)] border border-[var(--green)] rounded p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="mono text-xs text-[var(--green)] font-semibold">
                ✓ API key generated — copy it now
              </span>
              <button
                onClick={() => { navigator.clipboard.writeText(apiKey); setCopied(true); setTimeout(() => { setCopied(false); }, 2000); }}
                className="mono text-xs text-[var(--text-3)] hover:text-[var(--green)] transition-colors"
              >
                {copied ? "✓ copied" : "copy"}
              </button>
            </div>
            <code className="mono text-xs text-[var(--text)] break-all block">{apiKey}</code>
            <p className="mono text-xs text-[var(--red)] mt-2">
              ⚠ This key is shown once and never again. Copy it before proceeding.
            </p>
          </div>
        )}
      </Step>

      {/* Step 3 — Install agent */}
      <Step num="3" title="Install the agent on your server">
        <p className="text-sm text-[var(--text-2)] mt-4 mb-4">
          The agent is a lightweight Python process that collects Docker metrics every 30 seconds
          and sends them to DockerWatch. It uses under 50MB RAM and has zero impact on your containers.
        </p>

        {/* Tab switcher */}
        <div>
          <div className="flex gap-1 mb-4">
            {(["pip", "docker", "compose", "systemd"] as const).map(m => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={`mono text-xs px-3 py-1.5 rounded transition-colors ${method === m
                    ? "bg-[var(--green-dim)] text-[var(--green)] border border-[var(--green)]"
                    : "text-[var(--text-3)] border border-[var(--border)] hover:text-[var(--text)]"
                  }`}
              >
                {
                  m === "pip"
                    ? "pip install"
                    : m === "docker"
                      ? "docker run"
                      : m === "compose"
                        ? "docker compose"
                        : "systemd"
                }
              </button>
            ))}
          </div>

          {method === "pip" && (
            <div>
              <p className="mono text-xs text-[var(--text-3)] mb-2">
                Run on your server (requires Python 3.11+):
              </p>

              <Code>{installCmd}</Code>
              <Code>{`dockerwatch-agent --help`}</Code>

              <Code>{`nohup ${startCmd} > dockerwatch.log 2>&1 &`}</Code>

              <Note>
                Recommended for quick setup. Use systemd for production deployments.
              </Note>
            </div>
          )}

          {method === "docker" && (
            <div>
              <Code>{startCmdDocker}</Code>
            </div>
          )}

          {method === "compose" && (
            <div>
              <Code>{`dockerwatch-agent:
                    image: ghcr.io/myselfkunal/dockerwatch-agent:latest
                    environment:
                      - DOCKERWATCH_API_KEY=${apiKey || "YOUR_API_KEY"}
                      - DOCKERWATCH_API_URL=${API}

                    volumes:
                      - /var/run/docker.sock:/var/run/docker.sock:ro

                    restart: unless-stopped`}
              </Code>
            </div>
          )}

          {method === "systemd" && (
            <div>
              <Code>{`sudo tee /etc/systemd/system/dockerwatch-agent.service <<EOF
                    [Unit]
                    Description=DockerWatch Agent
                    After=network.target

                    [Service]
                    ExecStart=/home/$USER/.local/bin/dockerwatch-agent start --api-key=${apiKey || "YOUR_API_KEY"} --api-url=${API}
                    Restart=always

                    [Install]
                    WantedBy=multi-user.target
                    EOF

                    sudo systemctl daemon-reload
                    sudo systemctl enable dockerwatch-agent
                    sudo systemctl start dockerwatch-agent`}
              </Code>
            </div>
          )}
          <Note>
            Verify installation:

            <pre className="mt-2">
              {`dockerwatch-agent --help
        curl ${API}/health`}
            </pre>

            Containers appear in ~30 seconds.
          </Note>
        </div>
      </Step>

      {/* Step 4 — See data */}
      <Step num="4" title="See your containers" done={hasContainers}>
        {hasContainers ? (
          <div className="mt-4">
            <p className="mono text-xs text-[var(--green)] mb-3">
              ✓ Containers detected! Your agent is running and sending data.
            </p>
            <div className="flex gap-3">
              <a href="/dashboard"
                className="mono text-xs bg-[var(--green)] text-black font-semibold px-4 py-2 rounded hover:opacity-90 transition-opacity">
                → View dashboard
              </a>
              <a href="/dashboard/cost"
                className="mono text-xs border border-[var(--border)] text-[var(--text)] px-4 py-2 rounded hover:border-[var(--green)] hover:text-[var(--green)] transition-colors">
                → View cost analysis
              </a>
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <p className="text-sm text-[var(--text-2)] mb-3">
              Once the agent is running, your containers appear here within 30 seconds.
              The dashboard will show real-time CPU, memory, network, and cost data.
            </p>
            <div className="bg-[var(--bg-3)] border border-[var(--border)] rounded p-4">
              <div className="mono text-xs text-[var(--text-3)] mb-2">Waiting for agent connection...</div>
              <div className="flex gap-1">
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-[var(--green)] animate-pulse"
                    style={{ animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
            </div>
            <Note>
              Make sure your server can reach <code className="text-[var(--green)]">{API}</code>.
              If you're behind a firewall, open outbound HTTPS (443).
            </Note>
          </div>
        )}
      </Step>

      {/* Troubleshooting */}
      <div className="card p-5 mt-6">
        <div className="mono text-xs font-semibold text-[var(--text)] uppercase tracking-wider mb-4">
          Troubleshooting
        </div>
        <div className="space-y-4">
          {[
            {
              q: "pip install fails with 'command not found'",
              a: "Try pip3 install instead of pip. If Python isn't installed: sudo apt install python3-pip -y",
            },
            {
              q: "dockerwatch-agent: command not found after install",
              a: "The CLI wasn't added to PATH. Try: python3 -m dockerwatch_agent.cli start --api-key=...",
            },
            {
              q: "Agent starts but no containers appear",
              a: "Check that Docker is running (docker ps) and the agent has access to /var/run/docker.sock. On some systems you need: sudo usermod -aG docker $USER && newgrp docker",
            },
            {
              q: "Connection refused / cannot reach backend",
              a: `Make sure you can reach ${API}/health from your server: curl ${API}/health`,
            },
            {
              q: "Invalid API key error",
              a: "API keys are shown once. If you lost it, go to Settings → delete the server → create a new one → get a new key.",
            },
          ].map((item, i) => (
            <div key={i} className="border-b border-[var(--border)] pb-4 last:border-0 last:pb-0">
              <div className="mono text-xs font-semibold text-[var(--text)] mb-1">
                Q: {item.q}
              </div>
              <div className="mono text-xs text-[var(--text-3)]">
                A: {item.a}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Links */}
      <div className="flex gap-4 mt-6">
        <a
          href="https://github.com/myselfkunal/dockerwatch"
          target="_blank"
          rel="noopener noreferrer"
          className="mono text-xs text-[var(--text-3)] hover:text-[var(--green)] transition-colors"
        >
          ↗ GitHub
        </a>
        <a
          href="https://github.com/myselfkunal/dockerwatch/issues"
          target="_blank"
          rel="noopener noreferrer"
          className="mono text-xs text-[var(--text-3)] hover:text-[var(--green)] transition-colors"
        >
          ↗ Report an issue
        </a>
        <a
          href="https://github.com/myselfkunal/dockerwatch/blob/main/README.md"
          target="_blank"
          rel="noopener noreferrer"
          className="mono text-xs text-[var(--text-3)] hover:text-[var(--green)] transition-colors"
        >
          ↗ Full docs
        </a>
      </div>
    </div>
  );
}