"use client";

import Link from "next/link";
import { useAuth } from "./layout";

export default function LandingPage() {
  const { token } = useAuth();

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0a",
      color: "#e2e2e2",
      fontFamily: "'IBM Plex Sans', -apple-system, sans-serif",
    }}>

      {/* Nav */}
      <nav style={{
        borderBottom: "1px solid #1c1c1c",
        padding: "0 24px",
        height: 56,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        maxWidth: 1100,
        margin: "0 auto",
        width: "100%",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#00d084", fontFamily: "monospace", fontWeight: 600, fontSize: 15 }}>
            DockerWatch
          </span>
          <span style={{
            fontSize: 11, padding: "2px 7px", borderRadius: 99,
            background: "#003d26", color: "#00d084", fontFamily: "monospace",
          }}>v0.1.0</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <a href="#features" style={{ fontSize: 13, color: "#888", textDecoration: "none" }}>Features</a>
          <a href="#pricing" style={{ fontSize: 13, color: "#888", textDecoration: "none" }}>Pricing</a>
          <a
            href="https://github.com/myselfkunal/dockerwatch"
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 13, color: "#888", textDecoration: "none" }}
          >GitHub</a>
          {token ? (
            <Link href="/dashboard" style={{
              fontSize: 13, padding: "6px 16px", borderRadius: 6,
              background: "#00d084", color: "#000", fontWeight: 600,
              textDecoration: "none", fontFamily: "monospace",
            }}>Dashboard →</Link>
          ) : (
            <Link href="/auth/register" style={{
              fontSize: 13, padding: "6px 16px", borderRadius: 6,
              background: "#00d084", color: "#000", fontWeight: 600,
              textDecoration: "none", fontFamily: "monospace",
            }}>Start free →</Link>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "80px 24px 64px" }}>
        <div style={{ maxWidth: 680 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "#111", border: "1px solid #1c1c1c",
            borderRadius: 99, padding: "4px 12px", marginBottom: 28,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00d084", display: "inline-block" }}/>
            <span style={{ fontSize: 12, color: "#888", fontFamily: "monospace" }}>
              Open source · MIT · pip install dockerwatch-agent
            </span>
          </div>

          <h1 style={{
            fontSize: 52, fontWeight: 600, lineHeight: 1.1,
            margin: "0 0 20px", color: "#f0f0f0", letterSpacing: -1,
          }}>
            Know what your<br />
            <span style={{ color: "#00d084" }}>containers cost you</span>
          </h1>

          <p style={{ fontSize: 17, color: "#888", lineHeight: 1.7, margin: "0 0 36px", maxWidth: 520 }}>
            DockerWatch monitors your Docker containers in real time and surfaces exactly which ones are wasting money — without the $300/mo Datadog bill.
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
            <Link href="/auth/register" style={{
              padding: "12px 28px", borderRadius: 6, background: "#00d084",
              color: "#000", fontWeight: 600, fontSize: 14, textDecoration: "none",
              fontFamily: "monospace",
            }}>
              Start monitoring free →
            </Link>
            <a
              href="https://github.com/myselfkunal/dockerwatch"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: "12px 28px", borderRadius: 6,
                border: "1px solid #2a2a2a", color: "#ccc",
                fontSize: 14, textDecoration: "none", fontFamily: "monospace",
              }}
            >
              ★ Star on GitHub
            </a>
          </div>

          <p style={{ fontSize: 12, color: "#444", fontFamily: "monospace" }}>
            Free tier · No credit card · 2 min setup
          </p>
        </div>
      </section>

      {/* Mock dashboard preview */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 80px" }}>
        <div style={{
          background: "#111", border: "1px solid #1c1c1c",
          borderRadius: 12, overflow: "hidden",
        }}>
          {/* Window bar */}
          <div style={{
            background: "#0d0d0d", borderBottom: "1px solid #1c1c1c",
            padding: "10px 16px", display: "flex", alignItems: "center", gap: 6,
          }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57" }}/>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e" }}/>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840" }}/>
            <span style={{ marginLeft: 10, fontSize: 11, color: "#444", fontFamily: "monospace" }}>
              dockerwatch — cost analysis
            </span>
          </div>

          {/* Dashboard content */}
          <div style={{ padding: 24 }}>
            {/* Stats row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
              {[
                { label: "est. monthly spend", value: "$47.20", sub: "8 containers" },
                { label: "wasted spend", value: "$23.80", sub: "3 idle containers", warn: true },
                { label: "potential savings", value: "$23.80/mo", green: true },
              ].map((s) => (
                <div key={s.label} style={{
                  background: "#0a0a0a", border: `1px solid ${s.warn ? "#3d2800" : "#1c1c1c"}`,
                  borderRadius: 6, padding: "14px 16px",
                }}>
                  <div style={{ fontSize: 10, color: "#555", fontFamily: "monospace", textTransform: "uppercase", marginBottom: 6 }}>
                    {s.label}
                  </div>
                  <div style={{
                    fontSize: 22, fontWeight: 600, fontFamily: "monospace",
                    color: s.green ? "#00d084" : s.warn ? "#f5a623" : "#e2e2e2",
                  }}>
                    {s.value}
                  </div>
                  {s.sub && <div style={{ fontSize: 11, color: "#444", marginTop: 4, fontFamily: "monospace" }}>{s.sub}</div>}
                </div>
              ))}
            </div>

            {/* Savings table */}
            <div style={{ background: "#0a0a0a", border: "1px solid #3d2800", borderRadius: 6, overflow: "hidden" }}>
              <div style={{
                padding: "10px 16px", borderBottom: "1px solid #1c1c1c",
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <span style={{ color: "#f5a623", fontSize: 13 }}>⚠</span>
                <span style={{ fontSize: 11, fontFamily: "monospace", color: "#e2e2e2", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Savings opportunities
                </span>
              </div>
              {[
                { name: "redis-cache", reason: "Idle — avg CPU 0.2%", saving: "$8.10/mo" },
                { name: "worker-staging", reason: "Idle — avg CPU 0.8%", saving: "$7.60/mo" },
                { name: "api-staging", reason: "Idle — avg CPU 1.1%", saving: "$8.10/mo" },
              ].map((r, i) => (
                <div key={r.name} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "12px 16px",
                  borderBottom: i < 2 ? "1px solid #1c1c1c" : "none",
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontFamily: "monospace", color: "#e2e2e2" }}>{r.name}</div>
                    <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{r.reason}</div>
                  </div>
                  <div style={{ fontSize: 14, fontFamily: "monospace", fontWeight: 600, color: "#f5a623" }}>
                    {r.saving}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <p style={{ textAlign: "center", fontSize: 12, color: "#333", fontFamily: "monospace", marginTop: 12 }}>
          ↑ real data from your containers — not a mock
        </p>
      </section>

      {/* Features */}
      <section id="features" style={{
        borderTop: "1px solid #1c1c1c", padding: "72px 24px",
        maxWidth: 1100, margin: "0 auto",
      }}>
        <h2 style={{ fontSize: 28, fontWeight: 600, textAlign: "center", marginBottom: 8, color: "#f0f0f0" }}>
          Everything you need, nothing you don't
        </h2>
        <p style={{ textAlign: "center", color: "#555", fontSize: 14, marginBottom: 48 }}>
          Built for developers who want answers, not another SaaS to configure.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, background: "#1c1c1c", borderRadius: 12, overflow: "hidden" }}>
          {[
            {
              icon: "◈",
              title: "Cost estimation",
              desc: "Maps your actual CPU and RAM usage to AWS EC2 pricing. Shows estimated monthly cost per container and flags idle ones.",
            },
            {
              icon: "⬡",
              title: "Real-time metrics",
              desc: "CPU %, memory usage, network I/O, disk I/O — per container, every 30 seconds. Time range from 1h to 30 days.",
            },
            {
              icon: "◉",
              title: "Smart alerts",
              desc: "Threshold + duration based rules. Notify via Slack webhook, email, or any webhook. Auto-resolves when condition clears.",
            },
            {
              icon: "▶",
              title: "2-minute install",
              desc: "pip install dockerwatch-agent then one command. Runs as a background service. Zero configuration required.",
            },
            {
              icon: "◌",
              title: "Lightweight agent",
              desc: "Under 50MB RAM. Uses the Docker stats API — no sidecar containers, no kernel modules, no system changes.",
            },
            {
              icon: "◎",
              title: "Self-hostable",
              desc: "Full Docker Compose setup in the repo. Run the entire stack on your own infra. MIT licensed, no lock-in.",
            },
          ].map((f) => (
            <div key={f.title} style={{
              background: "#0d0d0d", padding: "28px 24px",
            }}>
              <div style={{ fontSize: 20, color: "#00d084", marginBottom: 12 }}>{f.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#f0f0f0", marginBottom: 8 }}>{f.title}</div>
              <div style={{ fontSize: 13, color: "#666", lineHeight: 1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{
        borderTop: "1px solid #1c1c1c",
        padding: "72px 24px",
        maxWidth: 1100, margin: "0 auto",
      }}>
        <h2 style={{ fontSize: 28, fontWeight: 600, textAlign: "center", marginBottom: 48, color: "#f0f0f0" }}>
          Up and running in 2 minutes
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 40 }}>
          {[
            {
              step: "01",
              title: "Create a free account",
              desc: "Sign up, create a workspace, add your first server. No credit card needed.",
            },
            {
              step: "02",
              title: "Install the agent",
              desc: "One command on any server running Docker. Runs as a background process.",
              code: "pip install dockerwatch-agent\ndockerwatch-agent start \\\n  --api-key=YOUR_KEY",
            },
            {
              step: "03",
              title: "See your data",
              desc: "Real-time charts and cost breakdown appear within 30 seconds of the agent starting.",
            },
          ].map((s) => (
            <div key={s.step}>
              <div style={{
                fontSize: 32, fontWeight: 700, color: "#1c1c1c",
                fontFamily: "monospace", marginBottom: 12,
              }}>{s.step}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#f0f0f0", marginBottom: 8 }}>{s.title}</div>
              <div style={{ fontSize: 13, color: "#666", lineHeight: 1.6, marginBottom: s.code ? 12 : 0 }}>{s.desc}</div>
              {s.code && (
                <div style={{
                  background: "#0a0a0a", border: "1px solid #1c1c1c",
                  borderRadius: 6, padding: "12px 14px",
                }}>
                  <pre style={{
                    margin: 0, fontSize: 12, color: "#00d084",
                    fontFamily: "monospace", lineHeight: 1.6,
                  }}>{s.code}</pre>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Vs comparison */}
      <section style={{
        borderTop: "1px solid #1c1c1c",
        padding: "72px 24px",
        maxWidth: 1100, margin: "0 auto",
      }}>
        <h2 style={{ fontSize: 28, fontWeight: 600, textAlign: "center", marginBottom: 48, color: "#f0f0f0" }}>
          Why not just use Datadog?
        </h2>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                {["", "DockerWatch", "Datadog", "Prometheus + Grafana"].map((h, i) => (
                  <th key={h} style={{
                    padding: "12px 16px", textAlign: i === 0 ? "left" : "center",
                    fontFamily: "monospace", fontSize: 12, fontWeight: 600,
                    color: i === 1 ? "#00d084" : "#555",
                    borderBottom: "1px solid #1c1c1c",
                    background: i === 1 ? "#0d1a12" : "transparent",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["Setup time", "2 minutes", "Hours", "Half a day"],
                ["Cost intelligence", "✓ Built-in", "✗", "Manual PromQL"],
                ["Idle detection", "✓ Automatic", "✗", "Custom rules"],
                ["Price", "Free / ₹999/mo", "$300+/mo", "Your time"],
                ["Self-hostable", "✓", "✗", "✓"],
                ["Agent install", "pip install", "Agent + config", "5+ exporters"],
              ].map((row) => (
                <tr key={row[0]} style={{ borderBottom: "1px solid #111" }}>
                  {row.map((cell, i) => (
                    <td key={i} style={{
                      padding: "12px 16px",
                      textAlign: i === 0 ? "left" : "center",
                      color: i === 1 ? "#e2e2e2" : i === 0 ? "#888" : "#555",
                      background: i === 1 ? "#0d1a12" : "transparent",
                      fontFamily: i > 0 ? "monospace" : "inherit",
                      fontSize: 13,
                    }}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{
        borderTop: "1px solid #1c1c1c",
        padding: "72px 24px",
        maxWidth: 1100, margin: "0 auto",
      }}>
        <h2 style={{ fontSize: 28, fontWeight: 600, textAlign: "center", marginBottom: 8, color: "#f0f0f0" }}>
          Simple pricing
        </h2>
        <p style={{ textAlign: "center", color: "#555", fontSize: 14, marginBottom: 48 }}>
          Paid plans launching soon. Join the waitlist for early access + 30 days free.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, maxWidth: 860, margin: "0 auto" }}>
          {[
            {
              name: "Free",
              price: "₹0",
              period: "forever",
              features: ["1 server", "5 containers", "24h history", "Email alerts"],
              cta: "Get started",
              href: "/auth/register",
            },
            {
              name: "Pro",
              price: "₹999",
              period: "/month",
              features: ["5 servers", "Unlimited containers", "90d history", "Slack + email", "Weekly cost digest"],
              cta: "Join waitlist",
              href: "/dashboard/billing",
              featured: true,
            },
            {
              name: "Team",
              price: "₹4,100",
              period: "/month",
              features: ["Unlimited servers", "Unlimited containers", "1yr history", "All channels", "API access"],
              cta: "Join waitlist",
              href: "/dashboard/billing",
            },
          ].map((p) => (
            <div key={p.name} style={{
              background: "#0d0d0d",
              border: p.featured ? "1px solid #00d084" : "1px solid #1c1c1c",
              borderRadius: 10, padding: "28px 24px",
              display: "flex", flexDirection: "column",
            }}>
              {p.featured && (
                <div style={{
                  fontSize: 10, fontFamily: "monospace", color: "#00d084",
                  textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8,
                }}>Most popular</div>
              )}
              <div style={{ fontSize: 14, fontWeight: 600, color: "#f0f0f0", marginBottom: 6 }}>{p.name}</div>
              <div style={{ marginBottom: 20 }}>
                <span style={{ fontSize: 28, fontWeight: 700, fontFamily: "monospace", color: "#f0f0f0" }}>{p.price}</span>
                <span style={{ fontSize: 13, color: "#555" }}>{p.period}</span>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", flex: 1 }}>
                {p.features.map((f) => (
                  <li key={f} style={{
                    fontSize: 13, color: "#888", padding: "4px 0",
                    display: "flex", gap: 8, alignItems: "flex-start",
                  }}>
                    <span style={{ color: "#00d084", flexShrink: 0 }}>✓</span>{f}
                  </li>
                ))}
              </ul>
              <Link href={p.href} style={{
                display: "block", textAlign: "center",
                padding: "10px 0", borderRadius: 6, fontSize: 13,
                fontFamily: "monospace", fontWeight: 600, textDecoration: "none",
                background: p.featured ? "#00d084" : "transparent",
                color: p.featured ? "#000" : "#888",
                border: p.featured ? "none" : "1px solid #2a2a2a",
              }}>
                {p.cta} →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section style={{
        borderTop: "1px solid #1c1c1c",
        padding: "80px 24px",
        textAlign: "center",
      }}>
        <h2 style={{ fontSize: 32, fontWeight: 600, color: "#f0f0f0", marginBottom: 12 }}>
          Start monitoring in 2 minutes
        </h2>
        <p style={{ color: "#555", fontSize: 14, marginBottom: 32 }}>
          Free forever. No credit card. No lock-in.
        </p>
        <Link href="/auth/register" style={{
          display: "inline-block", padding: "14px 36px", borderRadius: 6,
          background: "#00d084", color: "#000", fontWeight: 600,
          fontSize: 14, textDecoration: "none", fontFamily: "monospace",
        }}>
          $ dockerwatch init --free →
        </Link>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: "1px solid #1c1c1c",
        padding: "32px 24px",
        maxWidth: 1100, margin: "0 auto",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <span style={{ fontFamily: "monospace", color: "#00d084", fontWeight: 600, fontSize: 14 }}>
            DockerWatch
          </span>
          <span style={{ color: "#333", fontSize: 12, marginLeft: 12 }}>
            Built by Kunal Shaw · KIIT Bhubaneswar
          </span>
        </div>
        <div style={{ display: "flex", gap: 20 }}>
          <a href="https://github.com/myselfkunal/dockerwatch" target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 12, color: "#444", textDecoration: "none" }}>GitHub</a>
          <Link href="/auth/login" style={{ fontSize: 12, color: "#444", textDecoration: "none" }}>Login</Link>
          <a href="https://github.com/myselfkunal/dockerwatch/issues" target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 12, color: "#444", textDecoration: "none" }}>Report a bug</a>
        </div>
      </footer>
    </div>
  );
}