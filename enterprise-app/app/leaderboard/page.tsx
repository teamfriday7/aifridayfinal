"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { apiClient } from "@/lib/api-client";
import type { LeaderboardEntry } from "@/lib/types";

const MEDALS = ["🥇", "🥈", "🥉"];

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 85 ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
    : score >= 70 ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-300"
    : score >= 50 ? "border-orange-400/30 bg-orange-400/10 text-orange-300"
    : "border-rose-500/30 bg-rose-500/10 text-rose-400";
  return (
    <span className={`rounded-xl border px-3 py-1.5 text-lg font-bold ${color}`}>
      {score.toFixed(1)}
    </span>
  );
}

function MiniBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.min(100, (value / max) * 100);
  const color = pct >= 80 ? "bg-emerald-400" : pct >= 60 ? "bg-yellow-400" : pct >= 40 ? "bg-orange-400" : "bg-rose-500";
  return (
    <div className="w-full h-1.5 rounded-full bg-slate-800">
      <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.getLeaderboard().then(setEntries).finally(() => setLoading(false));
  }, []);

  const topScore = entries[0]?.avg_quality_score ?? 100;

  return (
    <AppShell>
      <section className="glass-panel rounded-[30px] p-6 sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-cyan-400">Developer intelligence</p>
            <h2 className="mt-2 text-3xl font-semibold text-[color:var(--text)]">Quality leaderboard</h2>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              Developers ranked by average composite quality score across all their commits. Score based on SonarCloud + LLM Logic analysis.
            </p>
          </div>
          <div className="rounded-2xl border border-violet-400/20 bg-violet-400/10 px-4 py-3 text-sm text-violet-200">
            {entries.length} developer{entries.length !== 1 ? "s" : ""} tracked
          </div>
        </div>

        {/* Top 3 podium */}
        {!loading && entries.length >= 3 && (
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {entries.slice(0, 3).map((entry, i) => (
              <div
                key={entry.user_id}
                className={`rounded-2xl border p-5 text-center transition-all ${
                  i === 0
                    ? "border-yellow-400/30 bg-yellow-400/6 shadow-[0_0_30px_rgba(250,204,21,0.10)]"
                    : i === 1
                    ? "border-slate-400/20 bg-slate-400/5"
                    : "border-orange-700/20 bg-orange-700/5"
                }`}
              >
                <p className="text-3xl">{MEDALS[i]}</p>
                <p className="mt-2 font-semibold text-white">{entry.full_name || entry.username}</p>
                <p className="text-xs text-slate-500">@{entry.username}</p>
                <div className="mt-3 flex justify-center">
                  <ScoreBadge score={entry.avg_quality_score} />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-xs font-bold text-white">{entry.total_commits}</p>
                    <p className="text-[9px] uppercase tracking-wider text-slate-600">commits</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">{entry.accepted_suggestions}</p>
                    <p className="text-[9px] uppercase tracking-wider text-slate-600">fixes</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">{entry.acceptance_rate}%</p>
                    <p className="text-[9px] uppercase tracking-wider text-slate-600">accept rate</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Full table */}
        <div className="mt-6 overflow-hidden rounded-2xl border border-white/8">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 bg-white/3">
                <th className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-slate-500">Rank</th>
                <th className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-slate-500">Developer</th>
                <th className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-slate-500">Avg quality score</th>
                <th className="px-4 py-3 text-center text-[10px] uppercase tracking-wider text-slate-500">Commits</th>
                <th className="px-4 py-3 text-center text-[10px] uppercase tracking-wider text-slate-500">Reviews</th>
                <th className="px-4 py-3 text-center text-[10px] uppercase tracking-wider text-slate-500">Accepted</th>
                <th className="px-4 py-3 text-center text-[10px] uppercase tracking-wider text-slate-500">Accept %</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? [...Array(4)].map((_, i) => (
                  <tr key={i} className="border-b border-white/6">
                    {[...Array(7)].map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 animate-pulse rounded bg-slate-800" /></td>
                    ))}
                  </tr>
                ))
                : entries.map((entry) => (
                  <tr key={entry.user_id} className="border-b border-white/6 transition hover:bg-white/4">
                    <td className="px-4 py-3">
                      <span className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold ${
                        entry.rank === 1 ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-300"
                        : entry.rank === 2 ? "border-slate-400/20 bg-slate-400/8 text-slate-300"
                        : entry.rank === 3 ? "border-orange-700/20 bg-orange-700/8 text-orange-400"
                        : "border-white/8 bg-white/3 text-slate-500"
                      }`}>
                        {entry.rank <= 3 ? MEDALS[entry.rank - 1] : entry.rank}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{entry.full_name || entry.username}</p>
                      <p className="text-xs text-slate-500">@{entry.username}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <ScoreBadge score={entry.avg_quality_score} />
                        <div className="flex-1">
                          <MiniBar value={entry.avg_quality_score} max={topScore} />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-white">{entry.total_commits}</td>
                    <td className="px-4 py-3 text-center text-slate-400">{entry.total_reviews}</td>
                    <td className="px-4 py-3 text-center text-emerald-400 font-semibold">{entry.accepted_suggestions}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-semibold ${
                        entry.acceptance_rate >= 70 ? "text-emerald-400"
                        : entry.acceptance_rate >= 40 ? "text-yellow-400"
                        : "text-slate-500"
                      }`}>{entry.acceptance_rate}%</span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
