"use client";

import { useEffect, useState } from "react";
import {
  Badge,
  Spinner,
  Text,
} from "@fluentui/react-components";
import { MetricCard } from "@/components/metric-card";
import { AgentPipeline } from "@/components/agent-pipeline";
import { useAuth } from "@/components/providers/auth-provider";
import { apiClient } from "@/lib/api-client";
import type { CommitSummary, DashboardStats, Project, ReviewSummary } from "@/lib/types";

export function DeveloperView() {
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
    s === "critical" ? "danger"
    : s === "high" ? "warning"
    : s === "medium" ? "informative"
    : "brand";

  const statusColor = (s: string) =>
    s === "completed" ? "success"
    : s === "pending" ? "warning"
    : "brand";

  const scoreColor = (s: number) =>
    s >= 85 ? "success" : s >= 70 ? "warning" : s >= 50 ? "informative" : "danger";

  return (
    <>
      {/* Top Azure DevOps Dashboard Welcome Card */}
      <div className="ado-card">
        <div className="ado-card-header flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Badge appearance="filled" color="brand">Overview Hub</Badge>
              <Text size={200} style={{ color: "var(--muted)" }}>Org: AI Friday Org</Text>
            </div>
            <h2 className="mt-1 text-xl font-bold text-[color:var(--text)]">
              Welcome back, {user?.full_name ?? user?.username}
            </h2>
            <Text size={200} style={{ display: "block", marginTop: 4, opacity: 0.85 }}>
              Three AI agents analyze every commit in parallel, synthesizing findings into automated pull request suggestions.
            </Text>
          </div>
          <div className="flex items-center gap-3">
            <Badge appearance="tint" color="informative">WebSocket Active</Badge>
            {stats?.avg_composite_score !== undefined && (
              <Badge appearance="filled" color={scoreColor(stats.avg_composite_score)}>
                Avg Quality: {stats.avg_composite_score}/100
              </Badge>
            )}
          </div>
        </div>

        <div className="p-4 grid gap-3 grid-cols-2 md:grid-cols-4">
          <MetricCard label="Total Commits" value={stats?.total_commits ?? 0} detail="repository commits" />
          <MetricCard label="Pending Reviews" value={stats?.pending_reviews ?? 0} detail="awaiting action" />
          <MetricCard label="Fixes Accepted" value={stats?.accepted_reviews ?? 0} detail="auto-committed" />
          <MetricCard label="Active Repos" value={stats?.active_watchers ?? 0} detail="live watchers" />
        </div>
      </div>

      {/* Main Grid: Pipelines & Review Queue */}
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="ado-card p-4">
          <AgentPipeline />
        </div>

        <div className="ado-card flex flex-col">
          <div className="ado-card-header flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[color:var(--text)]">Review Queue</h3>
              <Text size={100} style={{ color: "var(--muted)" }}>Recent findings from AI analysis</Text>
            </div>
            <Badge appearance="filled" color="warning">{stats?.pending_reviews ?? 0} pending</Badge>
          </div>

          <div className="p-4 flex-1 space-y-3">
            {loading ? (
              <div className="py-8 text-center"><Spinner label="Loading review queue" /></div>
            ) : reviews.length === 0 ? (
              <Text size={200}>No pending reviews. Push a commit to trigger analysis.</Text>
            ) : (
              reviews.map((review) => (
                <div key={review.id} className="soft-card p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[color:var(--text)] truncate">{review.title}</p>
                      <p className="text-[11px] font-mono text-[color:var(--muted)] truncate mt-0.5">{review.file_path || "Root"}</p>
                    </div>
                    <Badge appearance="filled" color={severityColor(review.severity)} size="small">{review.severity}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[color:var(--muted)]">
                    <span>{review.agent_type}</span>
                    <span className="font-mono">#{review.commit_id}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom Grid: Repositories & Recent Commits */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="ado-card">
          <div className="ado-card-header flex items-center justify-between">
            <h3 className="text-sm font-bold text-[color:var(--text)]">Tracked Repositories</h3>
            <Badge appearance="tint" color="informative">{projects.length} connected</Badge>
          </div>
          <div className="p-4 space-y-3">
            {projects.map((project) => (
              <div key={project.id} className="soft-card p-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-[color:var(--text)]">{project.name}</p>
                  <p className="text-[11px] text-[color:var(--muted)] mt-0.5">{project.description || "No description"}</p>
                  <p className="text-[10px] font-mono text-[color:var(--accent)] mt-1">{project.repo_path}</p>
                </div>
                <Badge appearance="filled" color={project.is_watching ? "success" : "subtle"} size="small">
                  {project.is_watching ? "Watching" : "Idle"}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="ado-card">
          <div className="ado-card-header flex items-center justify-between">
            <h3 className="text-sm font-bold text-[color:var(--text)]">Recent Commits</h3>
            <Text size={100} style={{ color: "var(--muted)" }}>Trigger history</Text>
          </div>
          <div className="p-4 space-y-3">
            {loading ? (
              <div className="py-8 text-center"><Spinner label="Loading commits" /></div>
            ) : commits.map((commit) => (
              <div key={commit.hash} className="soft-card p-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[color:var(--text)] truncate">{commit.message}</p>
                  <div className="flex items-center gap-2 text-[11px] text-[color:var(--muted)] mt-1">
                    <span>{commit.author_name}</span>
                    <span>•</span>
                    <span className="font-mono text-[color:var(--accent)]">{commit.hash.slice(0, 8)}</span>
                  </div>
                </div>
                <Badge appearance="filled" color={statusColor(commit.analysis_status)} size="small">
                  {commit.analysis_status}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
