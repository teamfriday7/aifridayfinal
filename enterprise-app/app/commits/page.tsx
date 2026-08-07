"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { apiClient } from "@/lib/api-client";
import type { CommitDetail, CommitSummary } from "@/lib/types";

function statusClass(s: string) {
  return s === "completed"
    ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
    : s === "analyzing"
    ? "border-cyan-400/20 bg-cyan-400/10 text-cyan-200"
    : s === "failed"
    ? "border-rose-500/20 bg-rose-500/10 text-rose-300"
    : "border-yellow-400/20 bg-yellow-400/10 text-yellow-200";
}

function severityClass(s: string) {
  return s === "critical" ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
    : s === "high" ? "border-orange-400/30 bg-orange-400/10 text-orange-300"
    : s === "medium" ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-300"
    : "border-slate-500/30 bg-slate-500/10 text-slate-400";
}

function ScoreRing({ score }: { score: number }) {
  const r = 28, c = 2 * Math.PI * r;
  const dash = (score / 100) * c;
  const color = score >= 80 ? "#34d399" : score >= 60 ? "#facc15" : score >= 40 ? "#fb923c" : "#f87171";
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={72} height={72} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={36} cy={36} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
        <circle cx={36} cy={36} r={r} fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.8s ease" }} />
      </svg>
      <p className="text-xl font-bold" style={{ color, marginTop: -52 }}>{Math.round(score)}</p>
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
      <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 shadow-2xl">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-cyan-400">Commit intelligence</p>
            <h2 className="mt-2 text-3xl font-semibold text-white">Repository history</h2>
            <p className="mt-2 text-sm text-slate-400">
              Click a commit to see its AI analysis summary, quality scores, and all review findings.
            </p>
          </div>
          <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-200">
            {commits.length} commits tracked
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          {/* Commit list */}
          <div className="space-y-2 overflow-y-auto" style={{ maxHeight: "72vh" }}>
            {loading
              ? [...Array(6)].map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-800" />)
              : commits.map((commit) => (
                <button
                  key={commit.hash}
                  onClick={() => selectCommit(commit.hash)}
                  className={`w-full rounded-2xl border p-4 text-left transition-all ${
                    selected?.hash === commit.hash
                      ? "border-cyan-400/30 bg-cyan-400/8 shadow-[0_0_20px_rgba(34,211,238,0.08)]"
                      : "border-white/8 bg-white/3 hover:bg-white/6"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white">{commit.message}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {commit.author_name} · <code className="text-cyan-400">{commit.hash.slice(0, 8)}</code>
                      </p>
                      <p className="mt-1 text-[10px] text-slate-600">
                        {commit.files_changed} files · +{commit.insertions} -{commit.deletions}
                      </p>
                    </div>
                    <span className={`flex-shrink-0 rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.15em] ${statusClass(commit.analysis_status)}`}>
                      {commit.analysis_status}
                    </span>
                  </div>
                </button>
              ))}
          </div>

          {/* Detail panel */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 overflow-y-auto" style={{ maxHeight: "72vh" }}>
            {detailLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded-2xl bg-slate-800" />)}
              </div>
            ) : selected ? (
              <div className="space-y-5">
                {/* Commit info */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.35em] text-cyan-400">Selected commit</p>
                    <h3 className="mt-2 text-xl font-semibold text-white">{selected.message}</h3>
                    <p className="mt-1 text-sm text-slate-400">
                      {selected.author_name} · <code className="text-cyan-300 text-xs">{selected.hash}</code>
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-xs uppercase tracking-[0.15em] ${statusClass(selected.analysis_status)}`}>
                      {selected.analysis_status}
                    </span>
                    <button
                      onClick={reanalyze}
                      disabled={reanalyzing}
                      className="rounded-full border border-violet-400/20 bg-violet-400/10 px-2.5 py-1 text-xs text-violet-300 transition hover:bg-violet-400/20 disabled:opacity-50"
                    >
                      {reanalyzing ? "Queued…" : "↺ Re-analyze"}
                    </button>
                  </div>
                </div>

                {/* Analysis summary */}
                {summary && (
                  <div className="rounded-2xl border border-violet-400/15 bg-violet-400/5 p-4 space-y-4">
                    <div className="flex items-center gap-4">
                      <ScoreRing score={summary.composite_score} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Executive summary</p>
                        <p className="text-sm text-slate-300 leading-relaxed">{summary.executive_summary}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {[
                        ["Maintainability", summary.maintainability_score],
                        ["Security", summary.security_score],
                        ["Reliability", summary.reliability_score],
                        ["Performance", summary.performance_score],
                        ["Guidelines", summary.guideline_score],
                      ].map(([label, val]) => (
                        <div key={String(label)} className="flex items-center justify-between rounded-xl border border-white/6 bg-white/3 px-3 py-2">
                          <span className="text-[10px] text-slate-500">{label}</span>
                          <span className={`text-sm font-bold ${Number(val) >= 80 ? "text-emerald-400" : Number(val) >= 60 ? "text-yellow-400" : "text-rose-400"}`}>
                            {Math.round(Number(val))}
                          </span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between rounded-xl border border-white/6 bg-white/3 px-3 py-2">
                        <span className="text-[10px] text-slate-500">Findings</span>
                        <span className="text-sm font-bold text-slate-300">{summary.total_findings}</span>
                      </div>
                    </div>

                    {summary.key_issues.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Key issues</p>
                        <ul className="space-y-1">
                          {summary.key_issues.map((issue, i) => (
                            <li key={i} className="flex gap-2 text-xs text-rose-300">
                              <span className="text-rose-500">⚠</span>{issue}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Diff */}
                {selected.diff_content && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Diff</p>
                    <div className="rounded-2xl border border-white/8 bg-slate-950/60 p-4 overflow-x-auto">
                      <pre className="text-xs text-slate-400 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                        {selected.diff_content}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Reviews */}
                {selected.reviews.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">
                      Reviews ({selected.reviews.length})
                    </p>
                    <div className="space-y-2">
                      {selected.reviews.map((review) => (
                        <div key={review.id} className={`rounded-2xl border-l-2 p-4 ${severityClass(review.severity).split(" ")[0]} border border-white/6 bg-white/2`}>
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-medium text-white text-sm truncate">{review.title}</p>
                            <div className="flex gap-1.5 flex-shrink-0">
                              <span className={`rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-widest ${severityClass(review.severity)}`}>
                                {review.severity}
                              </span>
                              <span className={`rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] uppercase tracking-wider ${
                                review.status === "accepted" ? "text-emerald-400" : review.status === "rejected" ? "text-rose-400" : "text-slate-400"
                              }`}>{review.status}</span>
                            </div>
                          </div>
                          <p className="mt-1 text-xs text-slate-400 leading-relaxed">{review.message}</p>
                          <p className="mt-1 text-[10px] text-slate-600">{review.agent_type}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-slate-500 mt-8 text-center">Select a commit to inspect its analysis</div>
            )}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
