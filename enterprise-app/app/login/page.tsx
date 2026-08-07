"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";

const roles = [
  { id: "developer", label: "Developer", hint: "Commit, review, iterate" },
  { id: "reviewer", label: "Reviewer", hint: "Approve and annotate" },
  { id: "lead", label: "Lead", hint: "Track health & quality" },
  { id: "admin", label: "Admin", hint: "Operate the platform" },
];

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [role, setRole] = useState("developer");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(username.trim(), password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8%] top-[-8%] h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-8%] h-96 w-96 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:40px_40px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="glass-panel rounded-[32px] p-8 sm:p-10">
            <div className="inline-flex items-center rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.35em] text-cyan-300">
              AI Engineering OS
            </div>

            <h1 className="mt-6 text-4xl font-semibold leading-tight text-[color:var(--text)] sm:text-5xl">
              Ship reviews, security, and developer intelligence from one calm control surface.
            </h1>

            <p className="mt-4 max-w-2xl text-base text-[color:var(--muted)]">
              From commit to merge, the platform orchestrates watchers, AI review, and engineering health in a single premium experience.
            </p>

            <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between text-sm text-[color:var(--muted)]">
                <span>Live pipeline</span>
                <span className="text-cyan-300">Review ready</span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {['Commit', 'Watcher', 'Diff', 'Review', 'Merge'].map((step, index) => (
                  <div
                    key={step}
                    className={`rounded-full border px-3 py-1.5 text-sm ${
                      index < 4
                        ? 'border-cyan-400/20 bg-cyan-400/10 text-cyan-200'
                        : 'border-violet-400/20 bg-violet-400/10 text-violet-200'
                    }`}
                  >
                    {step}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="glass-panel rounded-[32px] p-8 sm:p-10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.35em] text-cyan-300">Secure access</p>
                <h2 className="mt-2 text-2xl font-semibold text-[color:var(--text)]">Sign into the console</h2>
              </div>
              <div className="rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1 text-sm text-violet-200">
                {role}
              </div>
            </div>

            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              {roles.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setRole(item.id)}
                  className={`rounded-2xl border p-3 text-left transition ${
                    role === item.id
                      ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-100'
                      : 'border-white/10 bg-white/5 text-[color:var(--muted)] hover:bg-white/10'
                  }`}
                >
                  <p className="font-medium">{item.label}</p>
                  <p className="mt-1 text-sm text-[color:var(--muted)]">{item.hint}</p>
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm text-[color:var(--muted)]">Username</label>
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-3 py-2.5 text-white outline-none ring-0"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-[color:var(--muted)]">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-3 py-2.5 text-white outline-none ring-0"
                />
              </div>

              {error ? <p className="text-sm text-rose-400">{error}</p> : null}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-500 px-4 py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {loading ? 'Authenticating…' : 'Enter the workspace'}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
