"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { MetricCard } from "@/components/metric-card";
import { AgentPipeline } from "@/components/agent-pipeline";
import { useAuth } from "@/components/providers/auth-provider";
import { apiClient } from "@/lib/api-client";
import type { CommitSummary, DashboardStats, Project, ReviewSummary } from "@/lib/types";

function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [commits, setCommits] = useState<CommitSummary[]>([]);
  const [reviews, setReviews] = useState<ReviewSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient.getDashboardStats(),
      apiClient.getProjects(),
      apiClient.getCommits({ limit: 4 }),
      apiClient.getReviews({ limit: 4 }),
    ])
      .then(([statsData, projectsData, commitsData, reviewsData]) => {
        setStats(statsData);
        setProjects(projectsData);
        setCommits(commitsData.commits);
        setReviews(reviewsData.reviews);
      })
      .finally(() => setLoading(false));
  }, []);

  const severityColor = (s: string) =>
    s === "critical" ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
    : s === "high" ? "border-orange-400/30 bg-orange-400/10 text-orange-300"
    : s === "medium" ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-300"
    : "border-slate-500/30 bg-slate-500/10 text-slate-400";

  const statusColor = (s: string) =>
    s === "completed" ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
    : s === "pending" ? "border-yellow-400/20 bg-yellow-400/10 text-yellow-200"
    : "border-cyan-400/20 bg-cyan-400/10 text-cyan-200";

  const scoreColor = (s: number) =>
    s >= 85 ? "text-emerald-400" : s >= 70 ? "text-yellow-400" : s >= 50 ? "text-orange-400" : "text-rose-500";

  return (
    <AppShell>
      {/* Hero */}
      <section className="glass-panel rounded-[30px] p-6 sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-cyan-400">Engineering command center</p>
            <h2 className="mt-2 text-3xl font-semibold text-[color:var(--text)]">
              Welcome back, {user?.full_name ?? user?.username}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-[color:var(--muted)]">
              Three AI agents analyse every commit in parallel — SonarCloud, Knowledge Base Agent, and LLM Logic Analyzer — then a Meta-Analyzer synthesises their findings into actionable review suggestions.
            </p>
          </div>
          <div className="flex flex-col gap-2 text-right">
            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-200">
              🔴 Live feed • backend WebSocket active
            </div>
            {stats?.avg_composite_score !== undefined && (
              <div className="rounded-2xl border border-violet-400/20 bg-violet-400/10 px-4 py-2 text-sm">
                Avg quality score: <span className={`font-bold ${scoreColor(stats.avg_composite_score)}`}>{stats.avg_composite_score}/100</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-5">
          <MetricCard label="Commits" value={stats?.total_commits ?? 0} detail="repository activity" />
          <MetricCard label="Pending Reviews" value={stats?.pending_reviews ?? 0} detail="awaiting action" />
          <MetricCard label="Accepted" value={stats?.accepted_reviews ?? 0} detail="fixes applied" />
          <MetricCard label="Watchers" value={stats?.active_watchers ?? 0} detail="active repos" />
          <MetricCard label="Developers" value={stats?.total_developers ?? 0} detail="tracked" />
        </div>
      </section>

      {/* Main grid — Agent Pipeline + Review Queue */}
      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        {/* Agent Pipeline — HERO section for judges */}
        <div className="glass-panel rounded-[30px] p-6">
          <AgentPipeline />
        </div>

        {/* Review queue */}
        <div className="glass-panel rounded-[30px] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.35em] text-cyan-400">Latest findings</p>
              <h3 className="mt-1 text-xl font-semibold text-[color:var(--text)]">Review queue</h3>
            </div>
            <div className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-sm text-amber-200">
              {stats?.pending_reviews ?? 0} pending
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {loading
              ? [...Array(4)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-800/70" />)
              : reviews.length === 0
              ? <p className="text-sm text-slate-500 italic">No reviews yet — push a commit to trigger analysis.</p>
              : reviews.map((review) => (
                <div key={review.id} className={`rounded-2xl border-l-2 p-4 soft-card ${severityColor(review.severity).split(' ')[0]}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[color:var(--text)]">{review.title}</p>
                      <p className="mt-1 text-xs text-[color:var(--muted)] truncate">{review.file_path || "no file"}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-widest ${severityColor(review.severity)}`}>
                        {review.severity}
                      </span>
                      <span className="text-[10px] text-slate-500">{review.agent_type}</span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </section>

      {/* Repositories + Recent Commits */}
      <section className="grid gap-6 xl:grid-cols-2">
        {/* Repositories */}
        <div className="glass-panel rounded-[30px] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.35em] text-cyan-400">Tracked repositories</p>
              <h3 className="mt-1 text-xl font-semibold text-[color:var(--text)]">Workspace health</h3>
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-[color:var(--muted)]">
              {projects.length} connected
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {projects.map((project) => (
              <div key={project.id} className="soft-card rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-[color:var(--text)]">{project.name}</p>
                    <p className="mt-1 text-sm text-[color:var(--muted)]">{project.description || "No description provided"}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs uppercase tracking-[0.2em] ${
                    project.is_watching
                      ? "border border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
                      : "border border-slate-500/20 bg-slate-500/10 text-slate-300"
                  }`}>
                    {project.is_watching ? "🔴 watching" : "idle"}
                  </span>
                </div>
                <p className="mt-3 font-mono text-xs text-slate-600">{project.repo_path}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent commits */}
        <div className="glass-panel rounded-[30px] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.35em] text-cyan-400">Commit activity</p>
              <h3 className="mt-1 text-xl font-semibold text-[color:var(--text)]">Recent commits</h3>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {loading
              ? [...Array(4)].map((_, i) => <div key={i} className="h-14 animate-pulse rounded-2xl bg-slate-800/70" />)
              : commits.map((c) => (
                <div key={c.hash} className="soft-card rounded-2xl p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[color:var(--text)]">{c.message}</p>
                      <p className="mt-0.5 text-xs text-[color:var(--muted)]">
                        {c.author_name} · <code className="text-cyan-400">{c.hash.slice(0, 8)}</code>
                        {c.files_changed > 0 && ` · ${c.files_changed} files`}
                      </p>
                    </div>
                    <span className={`flex-shrink-0 rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.15em] ${statusColor(c.analysis_status)}`}>
                      {c.analysis_status}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </section>
    </AppShell>
  );
}

export default function DashboardRoute() {
  return <DashboardPage />;
}
