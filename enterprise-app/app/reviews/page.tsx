"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/components/providers/auth-provider";
import type { ReviewSummary } from "@/lib/types";

const SEVERITY_ORDER: Record<string, number> = { critical: 5, high: 4, medium: 3, low: 2, info: 1 };

const CATEGORIES = ["all", "logic", "security", "maintainability", "performance", "guideline", "style", "bug"];
const SEVERITIES = ["all", "critical", "high", "medium", "low", "info"];
const AGENTS = ["all", "sonarcloud", "logic_analyzer"];
const STATUSES = ["all", "pending", "accepted", "rejected"];

function severityClass(s: string) {
  return s === "critical" ? "border-rose-500/35 bg-rose-500/10 text-rose-300"
    : s === "high" ? "border-orange-400/35 bg-orange-400/10 text-orange-300"
    : s === "medium" ? "border-yellow-400/35 bg-yellow-400/10 text-yellow-300"
    : s === "low" ? "border-blue-400/35 bg-blue-400/10 text-blue-300"
    : "border-slate-600/35 bg-slate-600/10 text-slate-400";
}

function categoryClass(c: string) {
  return c === "security" ? "text-rose-400" : c === "logic" ? "text-orange-400"
    : c === "performance" ? "text-violet-400" : c === "maintainability" ? "text-cyan-400"
    : c === "guideline" ? "text-emerald-400" : "text-slate-400";
}

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-[10px] uppercase tracking-wider text-slate-500">{label}</span>
        <span className={`text-xs font-semibold ${color}`}>{Math.round(value)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-800">
        <div className={`h-full rounded-full transition-all duration-700 ${
          value >= 80 ? "bg-emerald-400" : value >= 60 ? "bg-yellow-400" : value >= 40 ? "bg-orange-400" : "bg-rose-500"
        }`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default function ReviewsPage() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<ReviewSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ReviewSummary | null>(null);
  const [acting, setActing] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Filters
  const [catFilter, setCatFilter] = useState("all");
  const [sevFilter, setSevFilter] = useState("all");
  const [agentFilter, setAgentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("pending");

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadReviews = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { limit: "100" };
      if (catFilter !== "all") params.category = catFilter;
      if (sevFilter !== "all") params.severity = sevFilter;
      if (agentFilter !== "all") params.agent_type = agentFilter;
      if (statusFilter !== "all") params.status = statusFilter;
      const payload = await apiClient.getReviews(params);
      const sorted = [...payload.reviews].sort(
        (a, b) => (SEVERITY_ORDER[b.severity] ?? 0) - (SEVERITY_ORDER[a.severity] ?? 0)
      );
      setReviews(sorted);
      if (sorted.length > 0 && !selected) setSelected(sorted[0]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadReviews(); }, [catFilter, sevFilter, agentFilter, statusFilter]);

  const actOnReview = async (reviewId: number, action: "accept" | "reject") => {
    setActing(reviewId);
    try {
      if (action === "accept") {
        const res = await apiClient.acceptReview(reviewId, user?.username ?? "admin");
        const cr = res.commit_result;
        if (cr?.success) {
          showToast(`✅ Fix accepted & committed! Hash: ${cr.commit_hash?.slice(0, 8)}`, "success");
        } else {
          showToast(`✅ Review accepted${cr?.error ? ` (note: ${cr.error})` : ""}`, "success");
        }
      } else {
        await apiClient.rejectReview(reviewId);
        showToast("Review rejected", "success");
      }
      await loadReviews();
      if (selected?.id === reviewId) setSelected(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Action failed", "error");
    } finally {
      setActing(null);
    }
  };

  const pendingCount = reviews.filter(r => r.status === "pending").length;
  const criticalCount = reviews.filter(r => r.severity === "critical").length;

  return (
    <AppShell>
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border px-5 py-3.5 text-sm font-medium shadow-2xl backdrop-blur transition-all ${
          toast.type === "success"
            ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
            : "border-rose-500/30 bg-rose-500/10 text-rose-300"
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <section className="rounded-[30px] border border-white/10 bg-slate-950/60 p-6 shadow-2xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-cyan-400">AI Review Board</p>
            <h2 className="mt-2 text-3xl font-semibold text-white">Code Review Queue</h2>
            <p className="mt-2 text-sm text-slate-400">
              AI findings from SonarCloud + LLM Logic Analyzer. Accept a suggestion to apply the fix and create an AI-attributed commit.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-2.5 text-center">
              <p className="text-lg font-bold text-amber-300">{pendingCount}</p>
              <p className="text-[10px] uppercase tracking-widest text-amber-400/70">Pending</p>
            </div>
            {criticalCount > 0 && (
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-center">
                <p className="text-lg font-bold text-rose-400">{criticalCount}</p>
                <p className="text-[10px] uppercase tracking-widest text-rose-400/70">Critical</p>
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="mt-5 flex flex-wrap gap-2">
          <FilterRow label="Status" options={STATUSES} value={statusFilter} onChange={setStatusFilter} />
          <FilterRow label="Severity" options={SEVERITIES} value={sevFilter} onChange={setSevFilter} />
          <FilterRow label="Category" options={CATEGORIES} value={catFilter} onChange={setCatFilter} />
          <FilterRow label="Agent" options={AGENTS} value={agentFilter} onChange={setAgentFilter} />
        </div>
      </section>

      {/* Main split view */}
      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        {/* List */}
        <div className="space-y-2 overflow-y-auto" style={{ maxHeight: "70vh" }}>
          {loading ? (
            [...Array(5)].map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-800" />)
          ) : reviews.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
              <p className="text-slate-500">No reviews match the current filters.</p>
              <button onClick={loadReviews} className="mt-3 text-sm text-cyan-400 hover:text-cyan-300">Refresh</button>
            </div>
          ) : (
            reviews.map((review) => (
              <button
                key={review.id}
                onClick={() => setSelected(review)}
                className={`w-full rounded-2xl border-l-2 p-4 text-left transition-all ${
                  selected?.id === review.id
                    ? "border-l-cyan-400 border border-cyan-400/20 bg-cyan-400/6"
                    : `border-l-current ${severityClass(review.severity).split(" ")[0]} border border-white/6 bg-white/3 hover:bg-white/6`
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{review.title}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">{review.file_path || "no file"}
                      {review.line_start && <span className="text-slate-600"> :{review.line_start}</span>}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className={`rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-widest ${severityClass(review.severity)}`}>
                      {review.severity}
                    </span>
                    <span className={`text-[9px] uppercase tracking-wider ${
                      review.status === "accepted" ? "text-emerald-400" : review.status === "rejected" ? "text-rose-400" : "text-slate-500"
                    }`}>{review.status}</span>
                  </div>
                </div>
                <div className="mt-2 flex gap-2">
                  <span className={`text-[9px] font-semibold uppercase tracking-widest ${categoryClass(review.category)}`}>
                    {review.category}
                  </span>
                  <span className="text-[9px] text-slate-600">·</span>
                  <span className="text-[9px] text-slate-600">{review.agent_type}</span>
                  <span className="text-[9px] text-slate-600">·</span>
                  <span className="text-[9px] text-slate-600">{Math.round(review.confidence * 100)}% confidence</span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Detail panel */}
        <div className="rounded-[24px] border border-white/10 bg-slate-950/60 p-5">
          {!selected ? (
            <div className="flex h-full items-center justify-center text-slate-500 text-sm">
              Select a review to inspect
            </div>
          ) : (
            <div className="space-y-5">
              {/* Review header */}
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-widest ${severityClass(selected.severity)}`}>
                    {selected.severity}
                  </span>
                  <span className={`text-xs font-bold uppercase ${categoryClass(selected.category)}`}>{selected.category}</span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-400">{selected.agent_type}</span>
                  <span className="text-xs text-slate-600 ml-auto">{Math.round(selected.confidence * 100)}% confidence</span>
                </div>
                <h3 className="mt-3 text-lg font-semibold text-white">{selected.title}</h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">{selected.message}</p>
                {selected.file_path && (
                  <p className="mt-2 font-mono text-xs text-slate-600">
                    {selected.file_path}{selected.line_start && `:${selected.line_start}`}{selected.line_end && `–${selected.line_end}`}
                  </p>
                )}
              </div>

              {/* Split diff */}
              {(selected.original_code || selected.suggested_code) && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Code diff</p>
                  <div className="grid grid-cols-2 gap-1 rounded-2xl border border-white/8 overflow-hidden text-xs font-mono">
                    <div>
                      <div className="flex items-center gap-1.5 border-b border-white/8 bg-rose-500/8 px-3 py-2">
                        <span className="h-2 w-2 rounded-full bg-rose-500" />
                        <span className="text-rose-400 font-semibold text-[10px] uppercase tracking-wider">Original</span>
                      </div>
                      <pre className="max-h-52 overflow-auto p-3 text-rose-200/80 leading-relaxed bg-rose-500/4 whitespace-pre-wrap break-words">
                        {selected.original_code || "—"}
                      </pre>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 border-b border-white/8 bg-emerald-400/8 px-3 py-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                        <span className="text-emerald-400 font-semibold text-[10px] uppercase tracking-wider">Suggested</span>
                      </div>
                      <pre className="max-h-52 overflow-auto p-3 text-emerald-200/80 leading-relaxed bg-emerald-400/4 whitespace-pre-wrap break-words">
                        {selected.suggested_code || "—"}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              {selected.status === "pending" && (
                <div className="flex gap-3">
                  <button
                    onClick={() => actOnReview(selected.id, "accept")}
                    disabled={acting === selected.id}
                    className="flex-1 rounded-2xl border border-emerald-500/25 bg-emerald-500/12 py-3 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50"
                  >
                    {acting === selected.id ? "Applying fix…" : "✅ Accept & Commit"}
                  </button>
                  <button
                    onClick={() => actOnReview(selected.id, "reject")}
                    disabled={acting === selected.id}
                    className="flex-1 rounded-2xl border border-rose-500/25 bg-rose-500/10 py-3 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-50"
                  >
                    ✕ Reject
                  </button>
                </div>
              )}

              {selected.status !== "pending" && (
                <div className={`rounded-2xl border px-4 py-3 text-sm text-center font-medium ${
                  selected.status === "accepted"
                    ? "border-emerald-400/20 bg-emerald-400/8 text-emerald-300"
                    : "border-rose-500/20 bg-rose-500/8 text-rose-400"
                }`}>
                  {selected.status === "accepted" ? "✅ Fix was accepted and committed" : "✕ Review was rejected"}
                </div>
              )}

              {/* Commit link */}
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Commit #{selected.commit_id}</span>
                <Link href="/commits" className="text-cyan-500 hover:text-cyan-400">View in commit browser →</Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </AppShell>
  );
}

function FilterRow({ label, options, value, onChange }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-[10px] uppercase tracking-wider text-slate-600 mr-1">{label}:</span>
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-wider transition ${
            value === opt
              ? "border-cyan-400/40 bg-cyan-400/15 text-cyan-300"
              : "border-white/8 bg-white/3 text-slate-500 hover:text-slate-300"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
