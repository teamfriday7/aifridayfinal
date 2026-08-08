"use client";

import { useState, useEffect } from "react";
import { Badge, Text, Spinner, Avatar, Button, Toast, ToastTitle, ToastBody, Toaster, useId, useToastController } from "@fluentui/react-components";
import { MetricCard } from "@/components/metric-card";
import { useAuth } from "@/components/providers/auth-provider";
import { apiClient } from "@/lib/api-client";
import type { DashboardStats } from "@/lib/types";

// Synthetic data for Lead's direct team
const leadTeamData = [
  { id: 1, name: "dev1 (Alice)", role: "Developer", commits: 145, prs: 12, status: "active" },
  { id: 2, name: "dev2 (Bob)", role: "Developer", commits: 92, prs: 5, status: "active" },
];

// Synthetic data for Pull Requests
const initialPRs = [
  { id: 101, title: "Feature: Add caching layer to API", author: "dev1 (Alice)", status: "open", branch: "feat/caching", time: "2 hours ago" },
  { id: 102, title: "Fix: Resolve race condition in auth flow", author: "dev2 (Bob)", status: "open", branch: "fix/auth-race", time: "5 hours ago" },
  { id: 103, title: "Refactor: Move dashboard logic to hooks", author: "dev1 (Alice)", status: "open", branch: "refactor/dashboard-hooks", time: "1 day ago" },
];

export function LeadView() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [prs, setPrs] = useState(initialPRs);
  
  const toasterId = useId("toaster");
  const { dispatchToast } = useToastController(toasterId);

  useEffect(() => {
    apiClient.getDashboardStats()
      .then((data) => setStats(data))
      .finally(() => setLoading(false));
  }, []);

  const handleMerge = (prId: number, prTitle: string) => {
    // Simulate merge action
    setPrs((prev) => prev.filter(pr => pr.id !== prId));
    
    dispatchToast(
      <Toast>
        <ToastTitle>Merge Successful</ToastTitle>
        <ToastBody>Pull Request "{prTitle}" has been merged into main.</ToastBody>
      </Toast>,
      { intent: "success" }
    );
  };

  if (loading) {
    return <div className="py-12 text-center"><Spinner label="Loading Lead Dashboard..." /></div>;
  }

  return (
    <div className="space-y-6">
      <Toaster toasterId={toasterId} />
      <div className="ado-card">
        <div className="ado-card-header flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Badge appearance="filled" color="brand">Engineering Lead</Badge>
              <Text size={200} style={{ color: "var(--muted)" }}>Team Hub</Text>
            </div>
            <h2 className="mt-1 text-xl font-bold text-[color:var(--text)]">
              Welcome Lead, {user?.full_name ?? user?.username}
            </h2>
            <Text size={200} style={{ display: "block", marginTop: 4, opacity: 0.85 }}>
              Manage your team's velocity, review pending pull requests, and orchestrate deployments.
            </Text>
          </div>
        </div>

        <div className="p-4 grid gap-3 grid-cols-2 md:grid-cols-4">
          <MetricCard label="Team Commits" value={237} detail="this month" />
          <MetricCard label="Open PRs" value={prs.length} detail="awaiting review" />
          <MetricCard label="Fixes Merged" value={17} detail="auto-committed" />
          <MetricCard label="Team Members" value={leadTeamData.length} detail="direct reports" />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.5fr]">
        {/* Team Tracking */}
        <div className="ado-card flex flex-col">
          <div className="ado-card-header flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[color:var(--text)]">My Team</h3>
              <Text size={100} style={{ color: "var(--muted)" }}>Activity overview</Text>
            </div>
          </div>
          <div className="p-4 flex-1 space-y-3">
            {leadTeamData.map((member) => (
              <div key={member.id} className="soft-card p-3 flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <Avatar name={member.name} color="colorful" />
                  <div>
                    <p className="text-sm font-semibold text-[color:var(--text)]">{member.name}</p>
                    <p className="text-xs text-[color:var(--muted)]">{member.role}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-[color:var(--border)] text-center">
                  <div>
                    <p className="text-[10px] text-[color:var(--muted)] uppercase">Commits</p>
                    <p className="text-xs font-bold font-mono">{member.commits}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[color:var(--muted)] uppercase">PRs</p>
                    <p className="text-xs font-bold font-mono">{member.prs}</p>
                  </div>
                  <Badge appearance="filled" color={member.status === 'active' ? 'success' : 'subtle'} size="small">
                    {member.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* PR Queue */}
        <div className="ado-card flex flex-col">
          <div className="ado-card-header flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[color:var(--text)]">Pull Requests Queue</h3>
              <Text size={100} style={{ color: "var(--muted)" }}>Submitted by your developers</Text>
            </div>
            <Badge appearance="filled" color="warning">{prs.length} open</Badge>
          </div>
          <div className="p-4 flex-1 space-y-3">
            {prs.length === 0 ? (
              <div className="py-8 text-center text-sm text-[color:var(--muted)]">No open pull requests.</div>
            ) : (
              prs.map((pr) => (
                <div key={pr.id} className="soft-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-[color:var(--text)] truncate">{pr.title}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-[color:var(--muted)]">
                      <div className="flex items-center gap-1.5">
                        <Avatar name={pr.author} size={16} />
                        <span>{pr.author}</span>
                      </div>
                      <span>•</span>
                      <span className="font-mono text-[color:var(--accent)]">{pr.branch}</span>
                      <span>•</span>
                      <span>{pr.time}</span>
                    </div>
                  </div>
                  <Button 
                    appearance="primary" 
                    onClick={() => handleMerge(pr.id, pr.title)}
                    className="shrink-0"
                  >
                    Merge with main
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
