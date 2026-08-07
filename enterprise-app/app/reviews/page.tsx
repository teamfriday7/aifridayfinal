"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { apiClient } from "@/lib/api-client";
import type { ReviewSummary } from "@/lib/types";

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<ReviewSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const payload = await apiClient.getReviews({ limit: 20 });
      setReviews(payload.reviews);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  const actOnReview = async (reviewId: number, action: "accept" | "reject") => {
    if (action === "accept") {
      await apiClient.acceptReview(reviewId);
    } else {
      await apiClient.rejectReview(reviewId);
    }
    await loadReviews();
  };

  return (
    <AppShell>
      <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 shadow-2xl shadow-black/30">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-cyan-400">Review board</p>
            <h2 className="mt-2 text-3xl font-semibold text-white">AI code review queue</h2>
            <p className="mt-2 text-sm text-slate-400">Approve or reject backend-provided review suggestions without changing the service layer.</p>
          </div>
          <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-200">
            Endpoints: /api/reviews, /api/reviews/{"id"}/accept, /api/reviews/{"id"}/reject
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {loading ? (
            <div className="animate-pulse space-y-3">
              {[...Array(5)].map((_, index) => <div key={index} className="h-24 rounded-2xl bg-slate-800" />)}
            </div>
          ) : (
            reviews.map((review) => (
              <div key={review.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <p className="font-medium text-white">{review.title}</p>
                      <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs uppercase tracking-[0.2em] text-amber-200">{review.severity}</span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs uppercase tracking-[0.2em] text-slate-300">{review.status}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-400">{review.message}</p>
                    <p className="mt-2 text-xs text-slate-500">Path: {review.file_path || "n/a"} • Confidence {review.confidence.toFixed(2)}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => actOnReview(review.id, "accept")} className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200 transition hover:bg-emerald-500/20">Approve</button>
                    <button onClick={() => actOnReview(review.id, "reject")} className="rounded-full border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-sm text-rose-200 transition hover:bg-rose-500/20">Reject</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </AppShell>
  );
}
