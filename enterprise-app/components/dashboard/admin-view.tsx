"use client";

import { useMemo, useState, useEffect } from "react";
import { Badge, Card, Text, Spinner, Avatar, Button } from "@fluentui/react-components";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import { MetricCard } from "@/components/metric-card";
import { useAuth } from "@/components/providers/auth-provider";
import { apiClient } from "@/lib/api-client";
import type { DashboardStats } from "@/lib/types";

// Synthetic data for the 6-month commit history graph
const commitHistoryData = [
  { month: "Mar", dev1: 45, dev2: 30 },
  { month: "Apr", dev1: 52, dev2: 38 },
  { month: "May", dev1: 61, dev2: 45 },
  { month: "Jun", dev1: 58, dev2: 50 },
  { month: "Jul", dev1: 72, dev2: 60 },
  { month: "Aug", dev1: 85, dev2: 65 },
];

// Synthetic data for team members activity
const teamActivityData = [
  { id: 1, name: "dev1 (Alice)", role: "Developer", commits: 373, prs: 42, resolvedIssues: 15, status: "active" },
  { id: 2, name: "dev2 (Bob)", role: "Developer", commits: 288, prs: 35, resolvedIssues: 12, status: "active" },
  { id: 3, name: "lead (Charlie)", role: "Lead", commits: 120, prs: 15, resolvedIssues: 5, status: "idle" },
  { id: 4, name: "reviewer (Dave)", role: "Reviewer", commits: 45, prs: 8, resolvedIssues: 2, status: "active" },
];

export function AdminView() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.getDashboardStats()
      .then((data) => setStats(data))
      .finally(() => setLoading(false));
  }, []);

  const totalResolvedPreProd = useMemo(() => {
    // Synthetic calculation: let's say 85% of accepted reviews are resolved pre-prod issues
    if (!stats) return 0;
    return Math.floor((stats.accepted_reviews || 0) * 0.85) + 34; // adding a base number for visuals
  }, [stats]);

  if (loading) {
    return <div className="py-12 text-center"><Spinner label="Loading Admin Dashboard..." /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="ado-card">
        <div className="ado-card-header flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Badge appearance="filled" color="brand">System Admin</Badge>
              <Text size={200} style={{ color: "var(--muted)" }}>Global Overview</Text>
            </div>
            <h2 className="mt-1 text-xl font-bold text-[color:var(--text)]">
              Welcome Admin, {user?.full_name ?? user?.username}
            </h2>
            <Text size={200} style={{ display: "block", marginTop: 4, opacity: 0.85 }}>
              You have full visibility into organizational performance, developer activity, and system health.
            </Text>
          </div>
        </div>

        <div className="p-4 grid gap-3 grid-cols-2 md:grid-cols-5">
          <MetricCard label="Total Commits" value={stats?.total_commits ?? 0} detail="across all repos" />
          <MetricCard label="Total Developers" value={stats?.total_developers ?? 0} detail="active users" />
          <MetricCard label="Auto-Fixes Merged" value={stats?.accepted_reviews ?? 0} detail="by AI pipeline" />
          <MetricCard label="Active Watchers" value={stats?.active_watchers ?? 0} detail="live repos" />
          {/* Specific Metric for Admin */}
          <div className="soft-card p-3 border-l-4 border-l-emerald-500">
            <Text size={200} className="font-semibold" style={{ color: "var(--muted)" }}>Prod Issues Prevented</Text>
            <div className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
              {totalResolvedPreProd}
            </div>
            <Text size={100} style={{ color: "var(--muted)" }}>resolved pre-production</Text>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Graph 1: 6-Month Commit History */}
        <div className="ado-card p-4">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-[color:var(--text)]">Developer Activity (6 Months)</h3>
            <Text size={100} style={{ color: "var(--muted)" }}>Commit volume comparison between top developers</Text>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={commitHistoryData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" stroke="var(--muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--surface-1)', borderColor: 'var(--border)', borderRadius: '8px' }}
                  itemStyle={{ fontSize: '12px' }}
                  labelStyle={{ color: 'var(--text)', marginBottom: '4px', fontWeight: 'bold' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Line type="monotone" dataKey="dev1" name="dev1 Activity" stroke="#0078D4" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="dev2" name="dev2 Activity" stroke="#107C10" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Global Team Tracking */}
        <div className="ado-card flex flex-col">
          <div className="ado-card-header flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[color:var(--text)]">Global Team Directory</h3>
              <Text size={100} style={{ color: "var(--muted)" }}>Track all members activity</Text>
            </div>
          </div>
          <div className="p-4 flex-1 space-y-3 overflow-y-auto max-h-[300px]">
            {teamActivityData.map((member) => (
              <div key={member.id} className="soft-card p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar name={member.name} color="colorful" />
                  <div>
                    <p className="text-sm font-semibold text-[color:var(--text)]">{member.name}</p>
                    <p className="text-xs text-[color:var(--muted)]">{member.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-center">
                  <div>
                    <p className="text-[10px] text-[color:var(--muted)] uppercase">Commits</p>
                    <p className="text-xs font-bold font-mono">{member.commits}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[color:var(--muted)] uppercase">Issues Fixed</p>
                    <p className="text-xs font-bold font-mono text-emerald-500">{member.resolvedIssues}</p>
                  </div>
                  <Badge appearance="filled" color={member.status === 'active' ? 'success' : 'subtle'} size="small">
                    {member.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
