"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { apiClient } from "@/lib/api-client";
import type { CommitDetail, CommitSummary } from "@/lib/types";

export default function CommitsPage() {
  const [commits, setCommits] = useState<CommitSummary[]>([]);
  const [selected, setSelected] = useState<CommitDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .getCommits({ limit: 20 })
      .then((payload) => {
        setCommits(payload.commits);
        if (payload.commits[0]) {
          apiClient.getCommit(payload.commits[0].hash).then(setSelected);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell>
      <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 shadow-2xl shadow-black/30">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-cyan-400">Commit intelligence</p>
            <h2 className="mt-2 text-3xl font-semibold text-white">Repository history</h2>
            <p className="mt-2 text-sm text-slate-400">Review commits exposed by the backend alongside their AI suggestions.</p>
          </div>
          <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-200">
            Backend endpoint: /api/commits and /api/commits/{"hash"}
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-3">
            {loading ? (
              <div className="animate-pulse space-y-3">
                {[...Array(4)].map((_, index) => <div key={index} className="h-20 rounded-2xl bg-slate-800" />)}
              </div>
            ) : (
              commits.map((commit) => (
                <button key={commit.hash} onClick={() => apiClient.getCommit(commit.hash).then(setSelected)} className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-left">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{commit.message}</p>
                      <p className="mt-1 text-sm text-slate-400">{commit.author_name} • {commit.hash.slice(0, 8)}</p>
                    </div>
                    <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-xs uppercase tracking-[0.2em] text-cyan-200">
                      {commit.analysis_status}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
            {selected ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.35em] text-cyan-400">Selected commit</p>
                    <h3 className="mt-2 text-xl font-semibold text-white">{selected.message}</h3>
                  </div>
                  <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs uppercase tracking-[0.2em] text-emerald-200">{selected.analysis_status}</span>
                </div>
                <p className="mt-3 text-sm text-slate-400">{selected.author_name} • {selected.hash}</p>
                <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                  <p className="text-sm whitespace-pre-wrap text-slate-300">{selected.diff_content || "No diff content is currently attached to this commit."}</p>
                </div>
                <div className="mt-6 space-y-3">
                  {selected.reviews.map((review) => (
                    <div key={review.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-white">{review.title}</p>
                        <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs uppercase tracking-[0.2em] text-amber-200">{review.severity}</span>
                      </div>
                      <p className="mt-2 text-sm text-slate-400">{review.message}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-sm text-slate-400">Select a commit to inspect its review details.</div>
            )}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
