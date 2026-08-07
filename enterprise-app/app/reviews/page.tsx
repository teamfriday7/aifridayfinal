"use client";

import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Spinner,
  Text,
} from "@fluentui/react-components";
import { AppShell } from "@/components/layout/app-shell";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/components/providers/auth-provider";
import type { ReviewSummary } from "@/lib/types";

const SEV_ORDER: Record<string, number> = { critical: 5, high: 4, medium: 3, low: 2, info: 1 };

function severityColor(severity: string) {
  return severity === "critical" ? "danger" : severity === "high" ? "warning" : severity === "medium" ? "informative" : "brand";
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
      setReviews([...payload.reviews].sort((a, b) => (SEV_ORDER[b.severity] ?? 0) - (SEV_ORDER[a.severity] ?? 0)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filter]);

  const act = async (id: number, action: "accept" | "reject") => {
    setActing(id);
    try {
      if (action === "accept") {
        const res = await apiClient.acceptReview(id, user?.username ?? "admin");
        const cr = res.commit_result;
        flash(cr?.success ? `Fix applied & committed (${cr.commit_hash?.slice(0, 8)})` : "Suggestion accepted", "ok");
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

  const pending = reviews.filter((review) => review.status === "pending").length;
  const critical = reviews.filter((review) => review.severity === "critical" || review.severity === "high").length;

  return (
    <AppShell>
      {toast && (
        <div
          className={`fixed right-6 bottom-6 z-50 p-4 rounded-lg shadow-xl border-l-4 text-xs font-semibold ${
            toast.type === "ok" ? "bg-emerald-950 border-emerald-500 text-emerald-200" : "bg-rose-950 border-rose-500 text-rose-200"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* ADO Header Bar */}
      <div className="ado-card">
        <div className="ado-card-header flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Badge appearance="filled" color="brand">Pipelines Hub</Badge>
              <Text size={200} style={{ color: "var(--muted)" }}>AI Code Review Engine</Text>
            </div>
            <h2 className="text-lg font-bold text-[color:var(--text)] mt-1">Review Suggestions & Pull Request Fixes</h2>
          </div>

          <div className="flex items-center gap-2">
            <Badge appearance="filled" color="warning">{pending} pending</Badge>
            {critical > 0 ? <Badge appearance="filled" color="danger">{critical} high+</Badge> : null}
          </div>
        </div>

        {/* Filters bar */}
        <div className="p-3 border-t border-[color:var(--border)] flex flex-wrap items-center justify-between gap-2 bg-[color:var(--surface-2)]">
          <div className="flex items-center gap-1.5">
            {(["pending", "accepted", "rejected", "all"] as const).map((value) => (
              <Button
                key={value}
                appearance={filter === value ? "primary" : "subtle"}
                onClick={() => setFilter(value)}
                size="small"
              >
                {value} {value === "pending" && pending > 0 ? `(${pending})` : ""}
              </Button>
            ))}
          </div>

          <Button appearance="subtle" onClick={load} size="small">
            Refresh
          </Button>
        </div>
      </div>

      {/* Review items */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-16 text-center"><Spinner label="Loading reviews" /></div>
        ) : reviews.length === 0 ? (
          <div className="ado-card p-10 text-center space-y-2">
            <h3 className="text-base font-bold text-[color:var(--text)]">No reviews match filter "{filter}"</h3>
            <p className="text-xs text-[color:var(--muted)]">Push a commit to trigger automated agent analysis.</p>
          </div>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="ado-card p-5 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-[color:var(--border)]">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge appearance="filled" color={severityColor(review.severity)} size="small">
                      {review.severity}
                    </Badge>
                    <Badge appearance="tint" color="informative" size="small">
                      {review.category}
                    </Badge>
                    {review.status !== "pending" && (
                      <Badge appearance="filled" color={review.status === "accepted" ? "success" : "subtle"} size="small">
                        {review.status}
                      </Badge>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-[color:var(--text)] mt-1">{review.title}</h3>
                  <p className="text-xs text-[color:var(--muted)] leading-relaxed">{review.message}</p>
                  <p className="text-[11px] font-mono text-[color:var(--accent)]">{review.file_path || "Root"}</p>
                </div>

                <div className="text-right flex-shrink-0">
                  <span className="text-xs font-semibold text-[color:var(--text)] block">{review.agent_type}</span>
                  <span className="text-[10px] text-[color:var(--muted)] block mt-0.5">Confidence: {Math.round(review.confidence * 100)}%</span>
                </div>
              </div>

              {/* Code Diffs */}
              {(review.original_code || review.suggested_code) && (
                <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
                  {review.original_code && (
                    <div className="rounded border border-[color:var(--border)] bg-[color:var(--surface-2)] overflow-hidden">
                      <div className="px-3 py-1.5 bg-rose-950/20 text-rose-400 font-mono text-[11px] font-bold border-b border-[color:var(--border)]">
                        - Current Code
                      </div>
                      <pre className="p-3 font-mono text-xs overflow-x-auto text-[color:var(--text)] whitespace-pre-wrap leading-relaxed">
                        {review.original_code}
                      </pre>
                    </div>
                  )}

                  {review.suggested_code && (
                    <div className="rounded border border-[color:var(--border)] bg-[color:var(--surface-2)] overflow-hidden">
                      <div className="px-3 py-1.5 bg-emerald-950/20 text-emerald-400 font-mono text-[11px] font-bold border-b border-[color:var(--border)]">
                        + Suggested Fix
                      </div>
                      <pre className="p-3 font-mono text-xs overflow-x-auto text-[color:var(--text)] whitespace-pre-wrap leading-relaxed">
                        {review.suggested_code}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* Actions Footer */}
              {review.status === "pending" && (
                <div className="flex items-center justify-between gap-3 pt-2 border-t border-[color:var(--border)]">
                  <div className="flex items-center gap-2">
                    <Button
                      appearance="primary"
                      onClick={() => act(review.id, "accept")}
                      disabled={acting === review.id}
                      size="small"
                    >
                      {acting === review.id ? "Applying fix…" : "Accept & Auto-Commit Fix"}
                    </Button>
                    <Button
                      appearance="subtle"
                      onClick={() => act(review.id, "reject")}
                      disabled={acting === review.id}
                      size="small"
                    >
                      Dismiss
                    </Button>
                  </div>
                  <span className="text-[11px] font-mono text-[color:var(--muted)]">Commit #{review.commit_id}</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </AppShell>
  );
}

