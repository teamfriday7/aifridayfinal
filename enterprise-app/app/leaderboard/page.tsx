"use client";

import { useEffect, useState } from "react";
import {
  Badge,
  Spinner,
  Text,
} from "@fluentui/react-components";
import { AppShell } from "@/components/layout/app-shell";
import { apiClient } from "@/lib/api-client";
import type { LeaderboardEntry } from "@/lib/types";

const MEDALS = ["🥇 Rank 1", "🥈 Rank 2", "🥉 Rank 3"];

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 85 ? "success" : score >= 70 ? "warning" : score >= 50 ? "informative" : "danger";
  return <Badge appearance="filled" color={color}>{score.toFixed(1)}</Badge>;
}

function MiniBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.min(100, (value / max) * 100);
  const color = pct >= 80 ? "#107C41" : pct >= 60 ? "#FFB900" : pct >= 40 ? "#FF8C00" : "#D13438";
  return (
    <div className="w-full h-1.5 rounded-full bg-[color:var(--surface-3)] overflow-hidden">
      <div style={{ width: `${pct}%`, height: "100%", backgroundColor: color }} />
    </div>
  );
}

function getDummyCommits(username: string) {
  return [
    { hash: 'a1b2c3d4', message: 'fix: resolve auth token refresh loop', date: '2 hours ago', score: 92, files: 3 },
    { hash: 'e5f6g7h8', message: 'feat: add rate limiting middleware', date: '5 hours ago', score: 85, files: 5 },
    { hash: 'i9j0k1l2', message: 'refactor: extract validation utils', date: '1 day ago', score: 78, files: 2 },
    { hash: 'm3n4o5p6', message: 'fix: handle null pointer in parser', date: '2 days ago', score: 88, files: 1 },
    { hash: 'q7r8s9t0', message: 'chore: update dependencies to latest', date: '3 days ago', score: 95, files: 8 },
  ];
}

function getDummyWeeklyScores() {
  return [
    { day: 'Mon', score: 72 },
    { day: 'Tue', score: 85 },
    { day: 'Wed', score: 68 },
    { day: 'Thu', score: 91 },
    { day: 'Fri', score: 88 },
    { day: 'Sat', score: 76 },
    { day: 'Sun', score: 94 },
  ];
}

function QualityChart({ data }: { data: { day: string; score: number }[] }) {
  const maxScore = 100;
  return (
    <div className="flex items-end justify-between gap-2 h-32 px-2">
      {data.map((item) => {
        const height = (item.score / maxScore) * 100;
        const color = item.score >= 85 ? '#107C41' : item.score >= 70 ? '#FFB900' : item.score >= 50 ? '#FF8C00' : '#D13438';
        return (
          <div key={item.day} className="flex flex-col items-center gap-1 flex-1">
            <span className="text-[9px] font-bold text-[color:var(--text)]">{item.score}</span>
            <div
              className="w-full rounded-t-md transition-all duration-700 ease-out"
              style={{ height: `${height}%`, backgroundColor: color, minWidth: 18, maxWidth: 32 }}
            />
            <span className="text-[10px] text-[color:var(--muted)]">{item.day}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDev, setSelectedDev] = useState<number | null>(null);

  useEffect(() => {
    apiClient.getLeaderboard().then(setEntries).finally(() => setLoading(false));
  }, []);

  const topScore = entries[0]?.avg_quality_score ?? 100;

  return (
    <AppShell>
      {/* Header */}
      <div className="ado-card">
        <div className="ado-card-header flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge appearance="filled" color="brand">Developers</Badge>
              <Text size={200} style={{ color: "var(--muted)" }}>Developer Quality & Velocity Metrics</Text>
            </div>
            <h2 className="text-lg font-bold text-[color:var(--text)] mt-1">Engineering Quality Leaderboard</h2>
          </div>
          <Badge appearance="tint" color="informative">{entries.length} developers tracked</Badge>
        </div>
      </div>

      {/* Top 3 Performers */}
      {!loading && entries.length >= 3 && (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          {entries.slice(0, 3).map((entry, index) => (
            <div key={entry.user_id} className="ado-card p-5 text-center space-y-3">
              <Badge appearance="filled" color={index === 0 ? "warning" : index === 1 ? "subtle" : "brand"}>
                {MEDALS[index]}
              </Badge>
              <div>
                <h3 className="text-base font-bold text-[color:var(--text)]">{entry.full_name || entry.username}</h3>
                <p className="text-xs font-mono text-[color:var(--accent)]">@{entry.username}</p>
              </div>

              <div className="flex justify-center">
                <ScoreBadge score={entry.avg_quality_score} />
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[color:var(--border)] text-xs">
                <div className="p-2 rounded bg-[color:var(--surface-2)]">
                  <span className="text-[10px] text-[color:var(--muted)] block">Commits</span>
                  <span className="font-bold text-[color:var(--text)]">{entry.total_commits}</span>
                </div>
                <div className="p-2 rounded bg-[color:var(--surface-2)]">
                  <span className="text-[10px] text-[color:var(--muted)] block">Fixes</span>
                  <span className="font-bold text-[color:var(--text)]">{entry.accepted_suggestions}</span>
                </div>
                <div className="p-2 rounded bg-[color:var(--surface-2)]">
                  <span className="text-[10px] text-[color:var(--muted)] block">Accept Rate</span>
                  <span className="font-bold text-[color:var(--text)]">{entry.acceptance_rate}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* All Developers Table Card */}
      <div className="ado-card">
        <div className="ado-card-header flex items-center justify-between">
          <h3 className="text-sm font-bold text-[color:var(--text)]">Team Quality Rankings</h3>
          <span className="text-xs text-[color:var(--muted)]">Calculated from composite quality scores</span>
        </div>

        <div className="p-4 space-y-3">
          {loading ? (
            <div className="py-8 text-center"><Spinner label="Loading leaderboard" /></div>
          ) : entries.map((entry) => (
            <div key={entry.user_id} className="soft-card p-3 flex flex-col" style={{ cursor: 'pointer' }} onClick={() => setSelectedDev(selectedDev === entry.user_id ? null : entry.user_id)}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-md flex items-center justify-center font-bold text-xs ${
                    entry.rank === 1 ? "bg-amber-500 text-black" : entry.rank === 2 ? "bg-slate-300 text-black" : entry.rank === 3 ? "bg-amber-700 text-white" : "bg-[color:var(--surface-3)] text-[color:var(--text)]"
                  }`}>
                    #{entry.rank}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[color:var(--text)]">{entry.full_name || entry.username}</p>
                    <p className="text-[11px] font-mono text-[color:var(--muted)]">@{entry.username}</p>
                  </div>
                </div>

                <div className="flex-1 max-w-md space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <ScoreBadge score={entry.avg_quality_score} />
                    <span className="text-[11px] text-[color:var(--muted)]">Acceptance: {entry.acceptance_rate}%</span>
                  </div>
                  <MiniBar value={entry.avg_quality_score} max={topScore} />
                  <p className="text-[10px] text-[color:var(--muted)] text-right">
                    {entry.total_commits} commits • {entry.accepted_suggestions} accepted fixes
                  </p>
                </div>
              </div>

              {selectedDev === entry.user_id && (
                <div className="mt-4 pt-4 border-t border-[color:var(--border)] space-y-4">
                  {/* Performance Chart */}
                  <div>
                    <h5 className="text-[11px] font-bold text-[color:var(--muted)] uppercase tracking-wider mb-3">Weekly Quality Trend</h5>
                    <div className="p-3 rounded-lg bg-[color:var(--surface)] border border-[color:var(--border)]">
                      <QualityChart data={getDummyWeeklyScores()} />
                    </div>
                  </div>

                  {/* Recent Commits */}
                  <div>
                    <h5 className="text-[11px] font-bold text-[color:var(--muted)] uppercase tracking-wider mb-3">Recent Commits</h5>
                    <div className="space-y-2">
                      {getDummyCommits(entry.username).map((commit) => (
                        <div key={commit.hash} className="flex items-center justify-between p-2.5 rounded-md bg-[color:var(--surface)] border border-[color:var(--border)] hover:border-[color:var(--accent)] transition-colors">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-[color:var(--text)] truncate">{commit.message}</p>
                            <div className="flex items-center gap-2 text-[10px] text-[color:var(--muted)] mt-0.5">
                              <span className="font-mono text-[color:var(--accent)]">{commit.hash}</span>
                              <span>•</span>
                              <span>{commit.date}</span>
                              <span>•</span>
                              <span>{commit.files} files</span>
                            </div>
                          </div>
                          <ScoreBadge score={commit.score} />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Performance Summary */}
                  <div className="grid grid-cols-4 gap-2">
                    <div className="p-2.5 rounded-md bg-[color:var(--surface)] border border-[color:var(--border)] text-center">
                      <span className="text-[9px] text-[color:var(--muted)] block uppercase">Avg Score</span>
                      <span className="text-sm font-bold text-[color:var(--text)]">{entry.avg_quality_score.toFixed(0)}</span>
                    </div>
                    <div className="p-2.5 rounded-md bg-[color:var(--surface)] border border-[color:var(--border)] text-center">
                      <span className="text-[9px] text-[color:var(--muted)] block uppercase">Total PRs</span>
                      <span className="text-sm font-bold text-[color:var(--text)]">{entry.total_commits}</span>
                    </div>
                    <div className="p-2.5 rounded-md bg-[color:var(--surface)] border border-[color:var(--border)] text-center">
                      <span className="text-[9px] text-[color:var(--muted)] block uppercase">Fixes</span>
                      <span className="text-sm font-bold text-emerald-400">{entry.accepted_suggestions}</span>
                    </div>
                    <div className="p-2.5 rounded-md bg-[color:var(--surface)] border border-[color:var(--border)] text-center">
                      <span className="text-[9px] text-[color:var(--muted)] block uppercase">Accept %</span>
                      <span className="text-sm font-bold text-[color:var(--accent)]">{entry.acceptance_rate}%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

