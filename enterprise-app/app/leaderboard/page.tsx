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

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

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
              <Badge appearance="filled" color="brand">Analytics Hub</Badge>
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
            <div key={entry.user_id} className="soft-card p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
          ))}
        </div>
      </div>
    </AppShell>
  );
}

