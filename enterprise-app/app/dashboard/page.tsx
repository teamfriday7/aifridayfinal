"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { MetricCard } from "@/components/metric-card";
import { useAuth } from "@/components/providers/auth-provider";
import { apiClient } from "@/lib/api-client";
import type { CommitSummary, DashboardStats, Project, ReviewSummary } from "@/lib/types";

const pipelineSteps = [
  { title: "Commit detected", detail: "Developer activity registered" },
  { title: "Watcher triggered", detail: "Git watcher active" },
  { title: "Diff parsed", detail: "Repository changes extracted" },
  { title: "Review queued", detail: "AI analysis in motion" },
  { title: "Reviewer ready", detail: "Merge readiness surfaced" },
];

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

  return (
    <AppShell>
      <section className="glass-panel rounded-[30px] p-6 sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-cyan-400">Engineering command center</p>
            <h2 className="mt-2 text-3xl font-semibold text-[color:var(--text)]">Welcome back, {user?.full_name ?? user?.username}</h2>
            <p className="mt-2 max-w-2xl text-sm text-[color:var(--muted)]">
              The system is orchestrating commits, reviews, repository health, and AI-guided decisions in real time.
            </p>
          </div>
          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-200">
            Live feed • backend WebSocket connected
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-4">
          <MetricCard label="Commits" value={stats?.total_commits ?? 0} detail="repository activity" />
          <MetricCard label="Reviews" value={stats?.pending_reviews ?? 0} detail="awaiting action" />
          <MetricCard label="Watchers" value={stats?.active_watchers ?? 0} detail="active repositories" />
          <MetricCard label="Developers" value={stats?.total_developers ?? 0} detail="seeded intelligence" />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="glass-panel rounded-[30px] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.35em] text-cyan-400">AI review pipeline</p>
              <h3 className="mt-1 text-xl font-semibold text-[color:var(--text)]">Review journey</h3>
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-[color:var(--muted)]">
              Commit → Watch → Review → Merge
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {pipelineSteps.map((step, index) => (
              <div key={step.title} className="soft-card rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-400/10 text-sm text-cyan-200">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-[color:var(--text)]">{step.title}</p>
                    <p className="mt-1 text-sm text-[color:var(--muted)]">{step.detail}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

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
          <div className="mt-6 space-y-3">
            {loading ? (
              [...Array(3)].map((_, index) => <div key={index} className="h-16 animate-pulse rounded-2xl bg-slate-800/70" />)
            ) : (
              reviews.map((review) => (
                <div key={review.id} className="soft-card rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-[color:var(--text)]">{review.title}</p>
                      <p className="mt-1 text-sm text-[color:var(--muted)]">{review.message}</p>
                    </div>
                    <span className="rounded-full border border-rose-400/20 bg-rose-400/10 px-2.5 py-1 text-xs uppercase tracking-[0.2em] text-rose-200">
                      {review.severity}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="glass-panel rounded-[30px] p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-cyan-400">Tracked repositories</p>
            <h3 className="mt-1 text-xl font-semibold text-[color:var(--text)]">Workspace health</h3>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-[color:var(--muted)]">
            {projects.length} connected
          </div>
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {projects.map((project) => (
            <div key={project.id} className="soft-card rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-[color:var(--text)]">{project.name}</p>
                  <p className="mt-1 text-sm text-[color:var(--muted)]">{project.description || "No description provided"}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs uppercase tracking-[0.2em] ${project.is_watching ? "border border-emerald-400/20 bg-emerald-400/10 text-emerald-200" : "border border-slate-500/20 bg-slate-500/10 text-slate-300"}`}>
                  {project.is_watching ? "watching" : "idle"}
                </span>
              </div>
              <p className="mt-4 text-xs text-slate-500">{project.repo_path}</p>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}

export default function DashboardRoute() {
  return <DashboardPage />;
}
