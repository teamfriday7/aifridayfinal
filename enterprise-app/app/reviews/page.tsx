"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/components/providers/auth-provider";
import type { ReviewSummary } from "@/lib/types";

const SEV_ORDER: Record<string, number> = { critical: 5, high: 4, medium: 3, low: 2, info: 1 };

function sevBadge(s: string) {
  const c = s === "critical" ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
    : s === "high" ? "bg-orange-400/15 text-orange-300 border-orange-400/30"
    : s === "medium" ? "bg-yellow-400/15 text-yellow-300 border-yellow-400/30"
    : s === "low" ? "bg-blue-400/15 text-blue-300 border-blue-400/30"
    : "bg-slate-600/15 text-slate-400 border-slate-600/30";
  return `rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${c}`;
}

function catIcon(c: string) {
  return c === "security" ? "🔒" : c === "logic" ? "🧩" : c === "performance" ? "⚡"
    : c === "maintainability" ? "🔧" : c === "guideline" ? "📏" : c === "bug" ? "🐛" : "📋";
}

export default function ReviewsPage() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<ReviewSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [filter, setFilter] = useState<"pending" | "accepted" | "rejected" | "all">("pending");

  const flash = (msg: string, type: "ok" | "err") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const load = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { limit: "100" };
      if (filter !== "all") params.status = filter;
      const payload = await apiClient.getReviews(params);
      setReviews(
        [...payload.reviews].sort((a, b) => (SEV_ORDER[b.severity] ?? 0) - (SEV_ORDER[a.severity] ?? 0))
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filter]);

  const act = async (id: number, action: "accept" | "reject") => {
    setActing(id);
    try {
      if (action === "accept") {
        const res = await apiClient.acceptReview(id, user?.username ?? "admin");
        const cr = res.commit_result;
        flash(cr?.success ? `✅ Fix applied & committed (${cr.commit_hash?.slice(0, 8)})` : "✅ Suggestion accepted", "ok");
      } else {
        await apiClient.rejectReview(id);
        flash("Suggestion dismissed", "ok");
      }
      await load();
    } catch (err) {
      flash(err instanceof Error ? err.message : "Action failed", "err");
    } finally {
      setActing(null);
    }
  };

  const pending = reviews.filter(r => r.status === "pending").length;
  const critical = reviews.filter(r => r.severity === "critical" || r.severity === "high").length;

  return (
    <AppShell>
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 rounded-2xl border px-5 py-3.5 text-sm font-medium shadow-2xl backdrop-blur-xl ${
          toast.type === "ok" ? "border-emerald-400/30 bg-emerald-950/90 text-emerald-200" : "border-rose-500/30 bg-rose-950/90 text-rose-200"
        }`}>{toast.msg}</div>
      )}

      {/* Page header — compact */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.35em] text-cyan-400">AI Code Review</p>
          <h2 className="mt-1 text-2xl font-semibold text-white">Review Suggestions</h2>
          <p className="mt-1 text-sm text-slate-500">Combined findings from SonarCloud + LLM Logic Analyzer. Accept to auto-commit the fix.</p>
        </div>
        <div className="flex gap-2">
          <div className="rounded-xl border border-amber-400/20 bg-amber-400/8 px-3 py-2 text-center">
            <p className="text-xl font-bold text-amber-300">{pending}</p>
            <p className="text-[9px] uppercase tracking-widest text-amber-400/60">pending</p>
          </div>
          {critical > 0 && (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/8 px-3 py-2 text-center">
              <p className="text-xl font-bold text-rose-400">{critical}</p>
              <p className="text-[9px] uppercase tracking-widest text-rose-400/60">high+</p>
            </div>
          )}
        </div>
      </div>

      {/* Simple filter tabs */}
      <div className="flex gap-1">
        {(["pending", "accepted", "rejected", "all"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-xl px-4 py-2 text-xs font-semibold uppercase tracking-wider transition ${
              filter === f ? "bg-cyan-500/15 text-cyan-300 border border-cyan-400/30" : "text-slate-500 hover:text-slate-300 border border-transparent"
            }`}>{f} {f === "pending" && pending > 0 ? `(${pending})` : ""}</button>
        ))}
        <button onClick={load} className="ml-auto rounded-xl border border-white/8 px-3 py-2 text-xs text-slate-500 hover:text-white transition">↻ Refresh</button>
      </div>

      {/* Review cards — each is a self-contained review */}
      <div className="space-y-4">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl bg-slate-800/50 h-48" />
          ))
        ) : reviews.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center">
            <p className="text-lg text-slate-500">No reviews match "{filter}"</p>
            <p className="mt-2 text-sm text-slate-600">Push a commit to trigger AI analysis.</p>
          </div>
        ) : (
          reviews.map(r => (
            <div key={r.id} className={`rounded-2xl border overflow-hidden transition-all ${
              r.status === "accepted" ? "border-emerald-400/15 bg-emerald-400/3"
              : r.status === "rejected" ? "border-slate-600/15 bg-slate-800/30 opacity-60"
              : r.severity === "critical" ? "border-rose-500/25 bg-slate-950/70 shadow-[0_0_30px_rgba(239,68,68,0.08)]"
              : r.severity === "high" ? "border-orange-400/20 bg-slate-950/70"
              : "border-white/8 bg-slate-950/60"
            }`}>

              {/* ── Top bar: file + line + severity + category ── */}
              <div className="flex items-center gap-3 border-b border-white/6 px-5 py-3 bg-white/2">
                <span className="text-base">{catIcon(r.category)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="text-sm font-semibold text-cyan-300">{r.file_path || "unknown file"}</code>
                    {r.line_start && (
                      <span className="rounded-md bg-violet-500/15 border border-violet-400/25 px-2 py-0.5 text-[11px] font-mono font-bold text-violet-300">
                        Line {r.line_start}{r.line_end && r.line_end !== r.line_start ? `–${r.line_end}` : ""}
                      </span>
                    )}
                    <span className={sevBadge(r.severity)}>{r.severity}</span>
                    <span className="text-[10px] uppercase tracking-wider text-slate-600">{r.category}</span>
                  </div>
                </div>
                {r.status !== "pending" && (
                  <span className={`rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                    r.status === "accepted" ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "border-slate-500/20 bg-slate-500/10 text-slate-400"
                  }`}>{r.status}</span>
                )}
              </div>

              {/* ── Issue title & explanation ── */}
              <div className="px-5 py-4">
                <h3 className="text-base font-semibold text-white">{r.title}</h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">{r.message}</p>
              </div>

              {/* ── Code comparison: Original → Suggested ── */}
              {(r.original_code || r.suggested_code) && (
                <div className="mx-5 mb-4 rounded-xl border border-white/8 overflow-hidden">
                  {/* Original code — what's wrong */}
                  {r.original_code && (
                    <div>
                      <div className="flex items-center gap-2 bg-rose-500/8 border-b border-white/6 px-4 py-2">
                        <span className="h-2 w-2 rounded-full bg-rose-500" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
                          ✕ Current code {r.line_start ? `(line ${r.line_start})` : ""} — needs change
                        </span>
                      </div>
                      <div className="bg-rose-500/3 px-4 py-3 overflow-x-auto">
                        <pre className="text-[13px] leading-6 text-rose-200/80 font-mono whitespace-pre-wrap">{r.original_code}</pre>
                      </div>
                    </div>
                  )}

                  {/* Suggested fix — the improvement */}
                  {r.suggested_code && (
                    <div>
                      <div className="flex items-center gap-2 bg-emerald-400/8 border-b border-white/6 px-4 py-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                          ✓ Suggested fix — optimized code
                        </span>
                      </div>
                      <div className="bg-emerald-400/3 px-4 py-3 overflow-x-auto">
                        <pre className="text-[13px] leading-6 text-emerald-200/80 font-mono whitespace-pre-wrap">{r.suggested_code}</pre>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Action bar ── */}
              {r.status === "pending" && (
                <div className="flex items-center gap-3 border-t border-white/6 px-5 py-3 bg-white/2">
                  <button
                    onClick={() => act(r.id, "accept")}
                    disabled={acting === r.id}
                    className="rounded-xl bg-emerald-500/15 border border-emerald-400/30 px-5 py-2.5 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/25 disabled:opacity-50"
                  >
                    {acting === r.id ? "Applying…" : "✅ Accept & Auto-Commit Fix"}
                  </button>
                  <button
                    onClick={() => act(r.id, "reject")}
                    disabled={acting === r.id}
                    className="rounded-xl border border-white/10 px-5 py-2.5 text-sm text-slate-400 transition hover:text-white hover:bg-white/5 disabled:opacity-50"
                  >
                    Dismiss
                  </button>
                  <div className="ml-auto flex items-center gap-3 text-xs text-slate-600">
                    <span>{Math.round(r.confidence * 100)}% confidence</span>
                    <span>·</span>
                    <span>Commit #{r.commit_id}</span>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </AppShell>
  );
}
