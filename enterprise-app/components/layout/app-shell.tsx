"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/components/providers/auth-provider";

const navItems = [
  { href: "/dashboard", label: "Command Center", hint: "mission control" },
  { href: "/projects", label: "Repositories", hint: "source control" },
  { href: "/commits", label: "Commit History", hint: "activity feed" },
  { href: "/reviews", label: "Review Queue", hint: "AI findings" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("theme") as "dark" | "light" | null;
    const preferred = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    setTheme(saved ?? preferred);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen(true);
      }
      if (event.key === "Escape") {
        setPaletteOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8%] top-[-8%] h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-8%] h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-4 lg:px-6 xl:px-8">
        <header className="glass-panel mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[24px] px-4 py-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-cyan-400">Enterprise AI Engineering Platform</p>
            <h1 className="text-lg font-semibold text-[color:var(--text)]">Code Intelligence Console</h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="pill rounded-full px-3 py-1.5 text-sm"
            >
              {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
            </button>

            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="pill rounded-full px-3 py-1.5 text-sm"
            >
              ⌘K Navigate
            </button>

            <button
              type="button"
              onClick={() => {
                logout();
                router.push("/login");
              }}
              className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-sm text-slate-200 transition hover:bg-white/15"
            >
              Sign out
            </button>
          </div>
        </header>

        <div className="grid flex-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="glass-panel rounded-[26px] p-4">
            <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] uppercase tracking-[0.35em] text-[color:var(--muted)]">Active workspace</p>
              <p className="mt-1 font-semibold text-[color:var(--text)]">AI Friday Final</p>
              <p className="mt-1 text-sm text-[color:var(--muted)]">Review orchestration • Security • Velocity</p>
            </div>

            <nav className="mt-5 space-y-2">
              {navItems.map((item) => {
                const active = pathname?.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex flex-col rounded-2xl border px-3 py-3 transition ${
                      active
                        ? "border-cyan-400/20 bg-cyan-400/10 text-cyan-100"
                        : "border-transparent bg-transparent text-[color:var(--muted)] hover:border-white/10 hover:bg-white/5"
                    }`}
                  >
                    <span className="font-medium">{item.label}</span>
                    <span className="text-xs text-[color:var(--muted)]">{item.hint}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-6 rounded-[22px] border border-violet-400/20 bg-violet-400/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.35em] text-violet-200">Signed in as</p>
              <p className="mt-2 font-medium text-white">{user?.full_name ?? user?.username}</p>
              <p className="mt-1 text-sm text-[color:var(--muted)]">{user?.role ?? "developer"}</p>
            </div>
          </aside>

          <main className="space-y-6">{children}</main>
        </div>
      </div>

      {paletteOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/70 px-4 pt-20 backdrop-blur">
          <div className="glass-panel w-full max-w-xl rounded-[24px] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.35em] text-cyan-400">Command palette</p>
                <h3 className="mt-2 text-xl font-semibold text-[color:var(--text)]">Navigate the system</h3>
              </div>
              <button
                type="button"
                onClick={() => setPaletteOpen(false)}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-[color:var(--muted)]"
              >
                Esc
              </button>
            </div>

            <div className="mt-6 grid gap-2">
              {[
                ["Command Center", "/dashboard"],
                ["Repositories", "/projects"],
                ["Commit History", "/commits"],
                ["Reviews", "/reviews"],
              ].map(([label, href]) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setPaletteOpen(false)}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 transition hover:bg-white/10"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
