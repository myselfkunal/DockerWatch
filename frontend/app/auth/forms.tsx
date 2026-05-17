"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../layout";
import { apiLogin, apiRegister, apiGetWorkspaces } from "../../lib/api";

function AuthShell({ children, title, sub }: {
  children: React.ReactNode;
  title: string;
  sub: string;
}) {
  return (
    <div className="min-h-screen grid-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8">
          <div className="mono text-xs text-[var(--text-3)] mb-1">
            ▶ dockerwatch v0.1.0
          </div>
          <h1 className="mono text-2xl font-semibold text-[var(--green)]">
            {title}
          </h1>
          <p className="text-[var(--text-2)] text-sm mt-1">{sub}</p>
        </div>

        <div className="card p-6 space-y-4">
          {children}
        </div>
      </div>
    </div>
  );
}

function Field({
  label, type = "text", value, onChange, placeholder,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block mono text-xs text-[var(--text-2)] mb-1.5 uppercase tracking-wider">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-2.5
                   mono text-sm text-[var(--text)] placeholder:text-[var(--text-3)]
                   focus:outline-none focus:border-[var(--green)] transition-colors"
      />
    </div>
  );
}

// ── Login ─────────────────────────────────────────────────────────────────────

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuth();
  const router = useRouter();

  const submit = async () => {
    setError("");
    setLoading(true);
    try {
      const { access_token } = await apiLogin(email, password);
      const workspaces = await apiGetWorkspaces(access_token);
      if (!workspaces.length) throw new Error("No workspace found");
      setAuth(access_token, workspaces[0].id);
      router.push("/dashboard");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="sign_in" sub="Container monitoring & cost intelligence">
      <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
      <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" />

      {error && (
        <div className="mono text-xs text-[var(--red)] bg-[var(--red-dim)] px-3 py-2 rounded">
          ✗ {error}
        </div>
      )}

      <button
        onClick={submit}
        disabled={loading}
        className="w-full bg-[var(--green)] text-black mono font-semibold text-sm py-2.5 rounded
                   hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {loading ? "authenticating..." : "$ login"}
      </button>

      <p className="text-center text-[var(--text-2)] text-xs">
        No account?{" "}
        <Link href="/auth/register" className="text-[var(--green)] hover:underline">
          register
        </Link>
      </p>
    </AuthShell>
  );
}

// ── Register ──────────────────────────────────────────────────────────────────

export function RegisterForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [workspace, setWorkspace] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuth();
  const router = useRouter();

  const submit = async () => {
    setError("");
    if (!workspace.trim()) { setError("Workspace name is required"); return; }
    setLoading(true);
    try {
      const { access_token } = await apiRegister(email, password, workspace);
      const workspaces = await apiGetWorkspaces(access_token);
      setAuth(access_token, workspaces[0].id);
      router.push("/dashboard");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="init_account" sub="Start monitoring in under 2 minutes">
      <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
      <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="min 8 characters" />
      <Field label="Workspace name" value={workspace} onChange={setWorkspace} placeholder="my-startup" />

      {error && (
        <div className="mono text-xs text-[var(--red)] bg-[var(--red-dim)] px-3 py-2 rounded">
          ✗ {error}
        </div>
      )}

      <button
        onClick={submit}
        disabled={loading}
        className="w-full bg-[var(--green)] text-black mono font-semibold text-sm py-2.5 rounded
                   hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {loading ? "initializing..." : "$ create account"}
      </button>

      <p className="text-center text-[var(--text-2)] text-xs">
        Have an account?{" "}
        <Link href="/auth/login" className="text-[var(--green)] hover:underline">
          login
        </Link>
      </p>
    </AuthShell>
  );
}