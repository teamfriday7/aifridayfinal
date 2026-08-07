"use client";

import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Divider,
  Spinner,
  Text,
} from "@fluentui/react-components";
import { AppShell } from "@/components/layout/app-shell";
import { apiClient } from "@/lib/api-client";
import type { CommitDetail, CommitSummary } from "@/lib/types";

function statusColor(s: string) {
  return s === "completed" ? "success" : s === "analyzing" ? "informative" : s === "failed" ? "danger" : "warning";
}

function severityColor(s: string) {
  return s === "critical" ? "danger" : s === "high" ? "warning" : s === "medium" ? "informative" : "subtle";
}

function ScoreRing({ score }: { score: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const dash = (score / 100) * c;
  const color = score >= 80 ? "#107C41" : score >= 60 ? "#FFB900" : "#D13438";

  return (
    <div className="relative flex items-center justify-center w-16 h-16">
      <svg width={64} height={64} className="-rotate-90">
        <circle cx={32} cy={32} r={r} fill="none" stroke="var(--border)" strokeWidth={5} />
        <circle
          cx={32}
          cy={32}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={5}
          strokeDasharray={`${dash} ${c}`}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute font-bold text-sm" style={{ color }}>
        {Math.round(score)}
      </span>
    </div>
  );
}

export default function CommitsPage() {
  const [commits, setCommits] = useState<CommitSummary[]>([]);
  const [selected, setSelected] = useState<CommitDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);

  useEffect(() => {
    apiClient
      .getCommits({ limit: 30 })
      .then((payload) => {
        setCommits(payload.commits);
        if (payload.commits[0]) {
          setDetailLoading(true);
          apiClient.getCommit(payload.commits[0].hash).then(setSelected).finally(() => setDetailLoading(false));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const selectCommit = (hash: string) => {
    setDetailLoading(true);
    apiClient.getCommit(hash).then(setSelected).finally(() => setDetailLoading(false));
  };

  const reanalyze = async () => {
    if (!selected) return;
    setReanalyzing(true);
    try {
      await apiClient.reanalyzeCommit(selected.hash);
    } finally {
      setReanalyzing(false);
    }
  };

  const summary = selected?.analysis_summary;

  return (
    <AppShell>
      {/* Top Banner */}
      <div className="ado-card">
        <div className="ado-card-header flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge appearance="filled" color="brand">Repos Hub</Badge>
              <Text size={200} style={{ color: "var(--muted)" }}>Branch: main</Text>
            </div>
            <h2 className="text-lg font-bold text-[color:var(--text)] mt-1">Commits & Diff Review</h2>
          </div>
          <Badge appearance="tint" color="informative">{commits.length} commits tracked</Badge>
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)]">
        {/* Left Commit List */}
        <div className="ado-card flex flex-col max-h-[80vh]">
          <div className="ado-card-header flex items-center justify-between">
            <h3 className="text-xs font-bold text-[color:var(--text)] uppercase tracking-wider">Commit History</h3>
            <span className="text-xs text-[color:var(--muted)]">refs/heads/main</span>
          </div>

          <div className="p-2 overflow-y-auto space-y-1.5 flex-1">
            {loading ? (
              <div className="py-8 text-center"><Spinner label="Loading commits" /></div>
            ) : commits.map((commit) => {
              const active = selected?.hash === commit.hash;
              return (
                <button
                  key={commit.hash}
                  onClick={() => selectCommit(commit.hash)}
                  className={`w-full text-left p-3 rounded-md border transition-all ${
                    active
                      ? "border-[color:var(--accent)] bg-[color:var(--accent-light)] shadow-sm"
                      : "border-transparent hover:bg-[color:var(--surface-2)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold text-[color:var(--text)] line-clamp-2">{commit.message}</p>
                    <Badge appearance="filled" color={statusColor(commit.analysis_status)} size="small">
                      {commit.analysis_status}
                    </Badge>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-[color:var(--muted)]">
                    <span>{commit.author_name}</span>
                    <span className="font-mono text-[color:var(--accent)]">{commit.hash.slice(0, 8)}</span>
                  </div>
                  <div className="mt-1 text-[10px] text-[color:var(--muted)]">
                    {commit.files_changed} files • <span className="text-emerald-500">+{commit.insertions}</span> <span className="text-rose-500">-{commit.deletions}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Commit Detail View */}
        <div className="ado-card flex flex-col max-h-[80vh] overflow-y-auto">
          {detailLoading ? (
            <div className="py-16 text-center"><Spinner label="Loading commit details" /></div>
          ) : selected ? (
            <div className="p-5 space-y-5">
              {/* Commit Header & Actions */}
              <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-[color:var(--border)]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-[color:var(--accent)] font-bold">{selected.hash}</span>
                    <Badge appearance="tint" color="brand" size="small">refs/heads/main</Badge>
                  </div>
                  <h2 className="text-lg font-bold text-[color:var(--text)] mt-1">{selected.message}</h2>
                  <p className="text-xs text-[color:var(--muted)] mt-0.5">
                    Committed by <span className="font-semibold text-[color:var(--text)]">{selected.author_name}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Badge appearance="filled" color={statusColor(selected.analysis_status)}>
                    {selected.analysis_status}
                  </Badge>
                  <Button appearance="secondary" onClick={reanalyze} disabled={reanalyzing} size="small">
                    {reanalyzing ? "Reanalyzing…" : "Re-analyze"}
                  </Button>
                </div>
              </div>

              {/* Quality Score Breakdown */}
              {summary && (
                <div className="soft-card p-4 rounded-lg space-y-4">
                  <div className="flex items-center gap-4">
                    <ScoreRing score={summary.composite_score} />
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[color:var(--muted)]">Quality Summary</h4>
                      <p className="text-xs text-[color:var(--text)] mt-1 leading-relaxed">{summary.executive_summary}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-[color:var(--border)]">
                    {[
                      ["Maintainability", summary.maintainability_score],
                      ["Security", summary.security_score],
                      ["Reliability", summary.reliability_score],
                      ["Performance", summary.performance_score],
                      ["Guidelines", summary.guideline_score],
                    ].map(([label, val]) => (
                      <div key={String(label)} className="p-2 rounded bg-[color:var(--surface)] text-center border border-[color:var(--border)]">
                        <span className="text-[10px] text-[color:var(--muted)] block">{label}</span>
                        <span className="text-xs font-bold text-[color:var(--text)]">{Math.round(Number(val))}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Azure DevOps PR Style Diff Viewer */}
              {selected.diff_content && (
                <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] overflow-hidden">
                  <div className="ado-card-header flex items-center justify-between">
                    <span className="text-xs font-bold text-[color:var(--text)] font-mono">Unified Diff Preview</span>
                    <span className="text-xs text-[color:var(--muted)]">Azure DevOps PR Diff</span>
                  </div>

                  <div className="p-4 font-mono text-xs overflow-x-auto leading-relaxed space-y-0.5">
                    {selected.diff_content.split("\n").map((line, idx) => {
                      const isAdd = line.startsWith("+");
                      const isRem = line.startsWith("-");
                      const isHeader = line.startsWith("@@") || line.startsWith("diff") || line.startsWith("---") || line.startsWith("+++");

                      return (
                        <div
                          key={idx}
                          className={`px-2 py-0.5 whitespace-pre ${
                            isAdd ? "diff-added" : isRem ? "diff-removed" : isHeader ? "text-sky-400 font-bold bg-sky-950/20" : "text-[color:var(--text)]"
                          }`}
                        >
                          {line}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Review Findings associated with this commit */}
              {selected.reviews.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[color:var(--muted)]">Review Suggestions ({selected.reviews.length})</h4>
                  {selected.reviews.map((review) => (
                    <div key={review.id} className="soft-card p-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold text-[color:var(--text)]">{review.title}</p>
                        <p className="text-xs text-[color:var(--muted)] mt-1">{review.message}</p>
                        <span className="text-[10px] font-mono text-[color:var(--accent)] mt-1 block">{review.agent_type}</span>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge appearance="filled" color={severityColor(review.severity)} size="small">
                          {review.severity}
                        </Badge>
                        <span className="text-[10px] text-[color:var(--muted)] capitalize">{review.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="py-16 text-center text-xs text-[color:var(--muted)]">Select a commit to view diff & analysis details</div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

