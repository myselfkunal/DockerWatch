"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../layout";

const NAV = [
  { href: "/dashboard",           label: "overview",   icon: "⬡" },
  { href: "/dashboard/cost",      label: "cost",       icon: "◈" },
  { href: "/dashboard/alerts",    label: "alerts",     icon: "◉" },
  { href: "/dashboard/billing", label: "billing", icon: "◇" },
  { href: "/dashboard/settings",  label: "settings",   icon: "◎" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/auth/login");
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-48 flex-shrink-0 border-r border-[var(--border)] bg-[var(--bg-2)] flex flex-col">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-[var(--border)]">
          <div className="mono text-[var(--green)] font-semibold text-sm">DockerWatch</div>
          <div className="mono text-[var(--text-3)] text-xs">v0.1.0</div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-4 py-2 mono text-xs transition-colors
                  ${active
                    ? "text-[var(--green)] bg-[var(--green-dim)] border-r-2 border-[var(--green)]"
                    : "text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--bg-3)]"
                  }`}
              >
                <span className="text-base leading-none">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-[var(--border)]">
          <button
            onClick={handleLogout}
            className="w-full text-left mono text-xs text-[var(--text-3)] hover:text-[var(--red)] transition-colors"
          >
            ✕ logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-[var(--bg)]">
        {children}
      </main>
    </div>
  );
}