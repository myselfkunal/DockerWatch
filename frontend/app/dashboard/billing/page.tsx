"use client";

import { useState } from "react";
import { useAuth } from "../../layout";

const PLANS = [
  {
    key: "free",
    name: "Free",
    price: "₹0",
    period: "forever",
    features: ["1 server", "5 containers", "24h history", "Email alerts"],
  },
  {
    key: "pro",
    name: "Pro",
    price: "₹999",
    period: "/month",
    features: ["5 servers", "Unlimited containers", "90d history", "Slack + email", "Weekly cost report"],
    highlight: true,
  },
  {
    key: "team",
    name: "Team",
    price: "₹4,100",
    period: "/month",
    features: ["Unlimited servers", "Unlimited containers", "1yr history", "All channels", "API access"],
  },
];

export default function BillingPage() {
  const { token } = useAuth();
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const joinWaitlist = async (selectedPlan: string) => {
    setPlan(selectedPlan);
  };

  const submitWaitlist = async () => {
    if (!email.trim()) return;
    setLoading(true);

    // For now just log it — wire to Resend or a Google Sheet later
    // You can also POST to a simple /waitlist endpoint
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/waitlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, plan }),
      });
    } catch {
      // Silently fail — we'll add proper endpoint later
    }

    setLoading(false);
    setSubmitted(true);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="mono text-xs text-[var(--text-3)] mb-0.5">$ dockerwatch billing</div>
        <h1 className="text-xl font-semibold text-[var(--text)]">Billing</h1>
      </div>

      {/* Current plan banner */}
      <div className="card p-4 mb-8 flex items-center gap-3">
        <span className="text-[var(--green)]">✓</span>
        <div>
          <div className="mono text-sm font-semibold text-[var(--text)]">
            You're on the Free plan
          </div>
          <div className="mono text-xs text-[var(--text-3)] mt-0.5">
            Paid plans launching soon — join the waitlist to get notified + 30 days free when we launch
          </div>
        </div>
      </div>

      {/* Waitlist success */}
      {submitted && (
        <div className="card p-5 mb-6 border-[var(--green)]">
          <div className="mono text-sm text-[var(--green)] font-semibold mb-1">
            ✓ You're on the waitlist for {plan.charAt(0).toUpperCase() + plan.slice(1)}
          </div>
          <div className="mono text-xs text-[var(--text-3)]">
            We'll email you when paid plans launch. You'll get 30 days free as an early supporter.
          </div>
        </div>
      )}

      {/* Waitlist form */}
      {plan && !submitted && (
        <div className="card p-5 mb-6 border-[var(--green)]">
          <div className="mono text-xs text-[var(--text-3)] uppercase mb-3">
            Join waitlist — {plan} plan
          </div>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submitWaitlist()}
              placeholder="your@email.com"
              className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-2
                         mono text-sm text-[var(--text)] placeholder:text-[var(--text-3)]
                         focus:outline-none focus:border-[var(--green)] transition-colors"
            />
            <button
              onClick={submitWaitlist}
              disabled={loading || !email.trim()}
              className="mono text-xs bg-[var(--green)] text-black font-semibold px-4 py-2
                         rounded hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {loading ? "..." : "notify me"}
            </button>
            <button
              onClick={() => setPlan("")}
              className="mono text-xs text-[var(--text-3)] hover:text-[var(--text)] px-3"
            >
              cancel
            </button>
          </div>
          <div className="mono text-xs text-[var(--text-3)] mt-2">
            Early supporters get 30 days free when paid plans launch.
          </div>
        </div>
      )}

      {/* Pricing cards */}
      <div className="grid grid-cols-3 gap-4">
        {PLANS.map((p) => (
          <div
            key={p.key}
            className={`card p-5 flex flex-col ${p.highlight ? "border-[var(--green)]" : ""}`}
          >
            {p.highlight && (
              <div className="mono text-xs text-[var(--green)] mb-2 uppercase tracking-wider">
                most popular
              </div>
            )}

            <div className="mono text-sm font-semibold text-[var(--text)] mb-1">{p.name}</div>
            <div className="mono mb-4">
              <span className="text-2xl font-semibold text-[var(--text)]">{p.price}</span>
              <span className="text-xs text-[var(--text-3)]">{p.period}</span>
            </div>

            <ul className="space-y-1.5 mb-6 flex-1">
              {p.features.map((f) => (
                <li key={f} className="mono text-xs text-[var(--text-2)] flex gap-2">
                  <span className="text-[var(--green)]">✓</span>
                  {f}
                </li>
              ))}
            </ul>

            {p.key === "free" ? (
              <div className="mono text-xs text-center text-[var(--green)] py-2
                              border border-[var(--green)] bg-[var(--green-dim)] rounded">
                current plan
              </div>
            ) : (
              <button
                onClick={() => joinWaitlist(p.key)}
                className={`mono text-xs font-semibold py-2 rounded transition-all
                  ${p.highlight
                    ? "bg-[var(--green)] text-black hover:opacity-90"
                    : "border border-[var(--border)] text-[var(--text)] hover:border-[var(--green)] hover:text-[var(--green)]"
                  }`}
              >
                join waitlist →
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 mono text-xs text-[var(--text-3)] text-center">
        Paid plans launching soon · All plans include a 14-day free trial
      </div>
    </div>
  );
}