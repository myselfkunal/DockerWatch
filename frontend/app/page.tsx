"use client";

import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e8e8e8]"
         style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>

      {/* Nav */}
      <nav className="border-b border-[#1a1a1a] px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div style={{ fontFamily: "monospace" }} className="text-[#00d084] font-semibold">
          DockerWatch
        </div>
        <div className="flex items-center gap-6">
          <a href="#pricing" className="text-sm text-[#888] hover:text-[#e8e8e8] transition-colors">Pricing</a>
          <Link href="/auth/login" className="text-sm text-[#888] hover:text-[#e8e8e8] transition-colors">Login</Link>
          <Link href="/auth/register"
            className="text-sm bg-[#00d084] text-black font-semibold px-4 py-1.5 rounded hover:opacity-90 transition-opacity"
            style={{ fontFamily: "monospace" }}>
            Start free →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <div style={{ fontFamily: "monospace" }}
          className="inline-block text-xs text-[#00d084] bg-[#003d26] border border-[#00d084] px-3 py-1 rounded-full mb-6">
          Container monitoring for developers
        </div>

        <h1 className="text-5xl font-semibold leading-tight mb-6">
          Know exactly what your<br />
          <span className="text-[#00d084]">containers are costing you</span>
        </h1>

        <p className="text-lg text-[#888] max-w-2xl mx-auto mb-10">
          DockerWatch monitors your Docker containers in real time and tells you
          which ones are wasting money. Datadog costs $300/mo. DockerWatch costs $19.
        </p>

        <div className="flex items-center justify-center gap-4">
          <Link href="/auth/register"
            className="bg-[#00d084] text-black font-semibold px-8 py-3 rounded text-sm hover:opacity-90 transition-opacity"
            style={{ fontFamily: "monospace" }}>
            Start monitoring free →
          </Link>
          <a href="#how-it-works"
            className="text-sm text-[#888] hover:text-[#e8e8e8] transition-colors">
            See how it works ↓
          </a>
        </div>

        <p className="text-xs text-[#555] mt-4" style={{ fontFamily: "monospace" }}>
          Free tier available · No credit card required · 2 min setup
        </p>
      </section>

      {/* Cost breakdown demo */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="bg-[#111] border border-[#1a1a1a] rounded-lg overflow-hidden">
          {/* Terminal bar */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1a1a1a] bg-[#0d0d0d]">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
            <span className="ml-2 text-xs text-[#555]" style={{ fontFamily: "monospace" }}>
              dockerwatch — cost analysis
            </span>
          </div>

          {/* Mock cost dashboard */}
          <div className="p-6">
            {/* Big numbers */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: "est. monthly spend", value: "$47.20", sub: "8 containers" },
                { label: "wasted spend", value: "$23.80", sub: "3 idle containers", warn: true },
                { label: "potential savings", value: "$23.80/mo", accent: true },
              ].map((s) => (
                <div key={s.label} className="bg-[#0a0a0a] border border-[#1a1a1a] rounded p-4">
                  <div className="text-xs text-[#555] uppercase mb-1"
                       style={{ fontFamily: "monospace" }}>{s.label}</div>
                  <div className={`text-2xl font-semibold ${s.accent ? "text-[#00d084]" : s.warn ? "text-[#f5a623]" : "text-[#e8e8e8]"}`}
                       style={{ fontFamily: "monospace" }}>{s.value}</div>
                  {s.sub && <div className="text-xs text-[#555] mt-1" style={{ fontFamily: "monospace" }}>{s.sub}</div>}
                </div>
              ))}
            </div>

            {/* Savings table */}
            <div className="bg-[#0a0a0a] border border-[#f5a623] rounded overflow-hidden">
              <div className="px-4 py-2 border-b border-[#1a1a1a] flex items-center gap-2">
                <span className="text-[#f5a623] text-sm">⚠</span>
                <span className="text-xs font-semibold text-[#e8e8e8] uppercase tracking-wider"
                      style={{ fontFamily: "monospace" }}>Savings Opportunities</span>
              </div>
              {[
                { name: "redis-cache", reason: "Idle — avg CPU 0.2%", saving: "$8.10/mo" },
                { name: "worker-old", reason: "Idle — avg CPU 0.8%", saving: "$7.60/mo" },
                { name: "staging-api", reason: "Idle — avg CPU 1.1%", saving: "$8.10/mo" },
              ].map((r) => (
                <div key={r.name} className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a1a] last:border-0">
                  <div>
                    <div className="text-sm text-[#e8e8e8]" style={{ fontFamily: "monospace" }}>{r.name}</div>
                    <div className="text-xs text-[#555] mt-0.5">{r.reason}</div>
                  </div>
                  <div className="text-[#f5a623] font-semibold text-sm" style={{ fontFamily: "monospace" }}>
                    {r.saving}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <p className="text-center text-xs text-[#555] mt-3" style={{ fontFamily: "monospace" }}>
          ↑ This is what DockerWatch shows you. Real data from your containers.
        </p>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="max-w-4xl mx-auto px-6 py-16 border-t border-[#1a1a1a]">
        <h2 className="text-2xl font-semibold text-center mb-12">Up and running in 2 minutes</h2>
        <div className="grid grid-cols-3 gap-8">
          {[
            {
              step: "01",
              title: "Sign up free",
              desc: "Create your account and workspace. No credit card needed.",
            },
            {
              step: "02",
              title: "Install the agent",
              desc: "One pip install command. Runs as a background service on your server.",
              code: "pip install dockerwatch-agent\ndockerwatch-agent start --api-key=YOUR_KEY",
            },
            {
              step: "03",
              title: "See your costs",
              desc: "Real-time charts, cost breakdown, and savings recommendations appear immediately.",
            },
          ].map((s) => (
            <div key={s.step}>
              <div className="text-3xl font-semibold text-[#1a1a1a] mb-3"
                   style={{ fontFamily: "monospace" }}>{s.step}</div>
              <h3 className="font-semibold mb-2">{s.title}</h3>
              <p className="text-sm text-[#888] mb-3">{s.desc}</p>
              {s.code && (
                <div className="bg-[#111] border border-[#1a1a1a] rounded px-3 py-2">
                  <pre className="text-xs text-[#00d084]" style={{ fontFamily: "monospace" }}>
                    {s.code}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-4xl mx-auto px-6 py-16 border-t border-[#1a1a1a]">
        <h2 className="text-2xl font-semibold text-center mb-12">Everything you need, nothing you don't</h2>
        <div className="grid grid-cols-2 gap-4">
          {[
            { icon: "◈", title: "Real-time container metrics", desc: "CPU, memory, network, disk — every 30 seconds." },
            { icon: "◉", title: "Cost estimation engine", desc: "Maps your usage to AWS EC2 pricing. Surfaces idle containers." },
            { icon: "⬡", title: "Smart alerts", desc: "Slack, email, or webhook when containers misbehave." },
            { icon: "◎", title: "One-line install", desc: "pip install and you're collecting metrics in under 2 minutes." },
            { icon: "▣", title: "Docker Compose aware", desc: "Groups containers by service. Understands your stack." },
            { icon: "◌", title: "Lightweight agent", desc: "Under 50MB RAM. Zero impact on your containers." },
          ].map((f) => (
            <div key={f.title} className="bg-[#111] border border-[#1a1a1a] rounded p-4 flex gap-4">
              <span className="text-[#00d084] text-xl mt-0.5">{f.icon}</span>
              <div>
                <div className="font-semibold text-sm mb-1">{f.title}</div>
                <div className="text-sm text-[#888]">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-4xl mx-auto px-6 py-16 border-t border-[#1a1a1a]">
        <h2 className="text-2xl font-semibold text-center mb-3">Simple pricing</h2>
        <p className="text-center text-[#888] text-sm mb-12">
          50x cheaper than Datadog. Cancel anytime.
        </p>
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              name: "Free", price: "₹0", period: "forever",
              features: ["1 server", "5 containers", "24h history", "Email alerts"],
              cta: "Start free", highlight: false,
            },
            {
              name: "Pro", price: "₹1,600", period: "/month",
              features: ["5 servers", "Unlimited containers", "90d history", "Slack + email", "Weekly cost report"],
              cta: "Get Pro", highlight: true,
            },
            {
              name: "Team", price: "₹4,100", period: "/month",
              features: ["Unlimited servers", "Unlimited containers", "1yr history", "All channels", "API access"],
              cta: "Get Team", highlight: false,
            },
          ].map((p) => (
            <div key={p.name}
              className={`rounded-lg p-6 flex flex-col ${p.highlight
                ? "bg-[#111] border-2 border-[#00d084]"
                : "bg-[#111] border border-[#1a1a1a]"}`}>
              {p.highlight && (
                <div className="text-xs text-[#00d084] mb-2 uppercase tracking-wider"
                     style={{ fontFamily: "monospace" }}>Most popular</div>
              )}
              <div className="font-semibold mb-1">{p.name}</div>
              <div className="mb-4">
                <span className="text-3xl font-semibold" style={{ fontFamily: "monospace" }}>{p.price}</span>
                <span className="text-sm text-[#888]">{p.period}</span>
              </div>
              <ul className="space-y-2 mb-6 flex-1">
                {p.features.map(f => (
                  <li key={f} className="text-sm text-[#888] flex gap-2">
                    <span className="text-[#00d084]">✓</span>{f}
                  </li>
                ))}
              </ul>
              <Link href="/auth/register"
                className={`text-center text-sm font-semibold py-2 rounded transition-opacity hover:opacity-90
                  ${p.highlight ? "bg-[#00d084] text-black" : "border border-[#333] text-[#e8e8e8] hover:border-[#00d084]"}`}
                style={{ fontFamily: "monospace" }}>
                {p.cta} →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-[#1a1a1a] py-20 text-center">
        <h2 className="text-3xl font-semibold mb-4">
          Start monitoring in 2 minutes
        </h2>
        <p className="text-[#888] mb-8 text-sm">Free forever. No credit card. No vendor lock-in.</p>
        <Link href="/auth/register"
          className="inline-block bg-[#00d084] text-black font-semibold px-10 py-3 rounded text-sm hover:opacity-90 transition-opacity"
          style={{ fontFamily: "monospace" }}>
          $ dockerwatch init --free →
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1a1a1a] py-8 text-center">
        <div className="text-[#00d084] font-semibold mb-2" style={{ fontFamily: "monospace" }}>
          DockerWatch
        </div>
        <p className="text-xs text-[#555]">Container monitoring & cost intelligence for developers</p>
      </footer>
    </div>
  );
}