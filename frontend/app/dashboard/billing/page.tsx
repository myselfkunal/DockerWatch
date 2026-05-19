"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { useAuth } from "../../layout";

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface BillingStatus {
  plan: string;
  status: string;
  current_period_end: string | null;
  razorpay_subscription_id: string | null;
}

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
    price: "₹1,600",
    period: "/month",
    features: ["5 servers", "Unlimited containers", "90d history", "Slack + email alerts", "Weekly cost report"],
    highlight: true,
  },
  {
    key: "team",
    name: "Team",
    price: "₹4,100",
    period: "/month",
    features: ["Unlimited servers", "Unlimited containers", "1yr history", "All alert channels", "API access", "Priority support"],
  },
];

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function BillingPage() {
  const { token, workspaceId } = useAuth();
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const load = async () => {
    if (!token || !workspaceId) return;
    const res = await fetch(`${API}/billing/status/${workspaceId}`, { headers });
    const data = await res.json();
    setBilling(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [token, workspaceId]);

  const handleSubscribe = async (plan: string) => {
    if (!token || !workspaceId) return;
    setSubscribing(plan);

    try {
      const res = await fetch(`${API}/billing/subscribe`, {
        method: "POST",
        headers,
        body: JSON.stringify({ plan, workspace_id: workspaceId }),
      });
      const data = await res.json();

      // Open Razorpay checkout
      const rzp = new window.Razorpay({
        key: data.razorpay_key_id,
        subscription_id: data.subscription_id,
        name: "DockerWatch",
        description: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`,
        theme: { color: "#00d084" },
        handler: () => {
          // Payment success — webhook will update DB async
          // Just reload billing status after a short delay
          setTimeout(() => load(), 2000);
        },
        modal: {
          ondismiss: () => setSubscribing(null),
        },
      });
      rzp.open();
    } catch (e) {
      alert("Failed to start checkout — try again");
    } finally {
      setSubscribing(null);
    }
  };

  const handleCancel = async () => {
    if (!token || !workspaceId) return;
    if (!confirm("Cancel subscription? You'll keep access until the end of your billing period.")) return;
    setCancelling(true);
    await fetch(`${API}/billing/cancel?workspace_id=${workspaceId}`, {
      method: "POST", headers,
    });
    setCancelling(false);
    load();
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  };

  return (
    <>
      {/* Load Razorpay checkout script */}
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <div className="mono text-xs text-[var(--text-3)] mb-0.5">$ dockerwatch billing</div>
          <h1 className="text-xl font-semibold text-[var(--text)]">Billing</h1>
        </div>

        {/* Current plan status */}
        {billing && (
          <div className="card p-4 mb-8 flex items-center justify-between">
            <div>
              <div className="mono text-xs text-[var(--text-3)] uppercase mb-1">Current plan</div>
              <div className="flex items-center gap-3">
                <span className="mono text-lg font-semibold text-[var(--text)] capitalize">
                  {billing.plan}
                </span>
                <span className={`mono text-xs px-2 py-0.5 rounded border ${
                  billing.status === "active"
                    ? "border-[var(--green)] text-[var(--green)] bg-[var(--green-dim)]"
                    : billing.status === "past_due"
                    ? "border-[var(--amber)] text-[var(--amber)] bg-[var(--amber-dim)]"
                    : "border-[var(--border)] text-[var(--text-3)]"
                }`}>
                  {billing.status}
                </span>
              </div>
              {billing.current_period_end && (
                <div className="mono text-xs text-[var(--text-3)] mt-1">
                  {billing.status === "cancelling" ? "Access until" : "Renews"}: {formatDate(billing.current_period_end)}
                </div>
              )}
            </div>

            {billing.plan !== "free" && billing.status !== "cancelling" && (
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="mono text-xs text-[var(--text-3)] hover:text-[var(--red)] transition-colors disabled:opacity-50"
              >
                {cancelling ? "cancelling..." : "cancel subscription"}
              </button>
            )}
          </div>
        )}

        {/* Pricing cards */}
        <div className="grid grid-cols-3 gap-4">
          {PLANS.map((plan) => {
            const isCurrent = billing?.plan === plan.key;
            const isHigher =
              (billing?.plan === "free" && (plan.key === "pro" || plan.key === "team")) ||
              (billing?.plan === "pro" && plan.key === "team");

            return (
              <div
                key={plan.key}
                className={`card p-5 flex flex-col ${plan.highlight ? "border-[var(--green)]" : ""}`}
              >
                {plan.highlight && (
                  <div className="mono text-xs text-[var(--green)] mb-2 uppercase tracking-wider">
                    most popular
                  </div>
                )}

                <div className="mono text-sm font-semibold text-[var(--text)] mb-1">{plan.name}</div>
                <div className="mono mb-4">
                  <span className="text-2xl font-semibold text-[var(--text)]">{plan.price}</span>
                  <span className="text-xs text-[var(--text-3)]">{plan.period}</span>
                </div>

                <ul className="space-y-1.5 mb-6 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="mono text-xs text-[var(--text-2)] flex gap-2">
                      <span className="text-[var(--green)]">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <div className="mono text-xs text-center text-[var(--text-3)] py-2 border border-[var(--border)] rounded">
                    current plan
                  </div>
                ) : plan.key === "free" ? (
                  <div className="mono text-xs text-center text-[var(--text-3)] py-2">
                    —
                  </div>
                ) : (
                  <button
                    onClick={() => handleSubscribe(plan.key)}
                    disabled={subscribing === plan.key || !isHigher}
                    className={`mono text-xs font-semibold py-2 rounded transition-opacity
                      ${plan.highlight
                        ? "bg-[var(--green)] text-black hover:opacity-90"
                        : "border border-[var(--border)] text-[var(--text)] hover:border-[var(--green)] hover:text-[var(--green)]"
                      } disabled:opacity-50`}
                  >
                    {subscribing === plan.key ? "opening checkout..." : `upgrade to ${plan.name}`}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Test mode notice */}
        {process.env.NODE_ENV === "development" && (
          <div className="mt-6 mono text-xs text-[var(--text-3)] bg-[var(--bg-3)] border border-[var(--border)] rounded px-4 py-3">
            ⚠ Test mode — use Razorpay test card: 4111 1111 1111 1111 · CVV: any · Expiry: any future date
          </div>
        )}
      </div>
    </>
  );
}