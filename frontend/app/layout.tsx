"use client";

import "./globals.css";
import { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

// ── Auth context ─────────────────────────────────────────────────────────────

interface AuthCtx {
  token: string | null;
  workspaceId: string | null;
  setAuth: (token: string, workspaceId: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthCtx>({
  token: null,
  workspaceId: null,
  setAuth: () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

// ── Layout ───────────────────────────────────────────────────────────────────

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem("dw_token");
    const w = localStorage.getItem("dw_workspace");
    if (t) setToken(t);
    if (w) setWorkspaceId(w);
    setReady(true);
  }, []);

  const setAuth = (t: string, w: string) => {
    localStorage.setItem("dw_token", t);
    localStorage.setItem("dw_workspace", w);
    setToken(t);
    setWorkspaceId(w);
  };

  const logout = () => {
    localStorage.removeItem("dw_token");
    localStorage.removeItem("dw_workspace");
    setToken(null);
    setWorkspaceId(null);
  };

  if (!ready) {
    return (
      <html lang="en">
        <body />
      </html>
    );
  }
  
  return (
    <html lang="en">
      <head>
        <title>DockerWatch</title>
        <meta name="description" content="Container monitoring & cost intelligence" />
      </head>
      <body>
        <AuthContext.Provider value={{ token, workspaceId, setAuth, logout }}>
          <AuthGuard>{children}</AuthGuard>
        </AuthContext.Provider>
      </body>
    </html>
  );
}

// ── Auth guard — redirects unauthenticated users to /auth/login ───────────────

const PUBLIC_PATHS = ["/auth/login", "/auth/register", "/"];

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!token && !PUBLIC_PATHS.includes(pathname)) {
      router.push("/auth/login");
    }
    if (token && PUBLIC_PATHS.includes(pathname)) {
      router.push("/dashboard");
    }
  }, [token, pathname]);

  return <>{children}</>;
}