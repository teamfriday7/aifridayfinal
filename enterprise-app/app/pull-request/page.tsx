"use client";

import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Divider,
  Spinner,
  Text,
} from "@fluentui/react-components";
import { AppShell } from "@/components/layout/app-shell";

interface BranchInfo {
  name: string;
  short_hash: string;
  last_activity: string;
}

interface ConflictItem {
  file_path: string;
  conflict_type: string;
  description: string;
  source_code: string;
  dest_code: string;
  ai_resolution: string;
  resolution_explanation: string;
}

interface PRAnalysis {
  has_conflicts: boolean;
  summary: string;
  files_changed: number;
  insertions: number;
  deletions: number;
  conflicts: ConflictItem[];
  recommendations: string[];
}

interface PRResult {
  success: boolean;
  error?: string;
  source_branch?: string;
  destination_branch?: string;
  diff_stat?: string;
  changed_files?: string[];
  analysis?: PRAnalysis;
  agent_log?: string[];
}

interface PRRecord {
  id: number;
  source_branch: string;
  destination_branch: string;
  status: string;
  created_by: string;
  has_conflicts: boolean;
  files_changed: number;
  insertions: number;
  deletions: number;
  ai_summary: string;
  ai_conflicts: ConflictItem[];
  admin_comment: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string | null;
}

type AgentStep = "idle" | "fetching_diff" | "analyzing" | "complete" | "failed";

const BASE = "http://localhost:8000";

export default function PullRequestPage() {
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [sourceBranch, setSourceBranch] = useState("");
  const [destBranch, setDestBranch] = useState("");
  const [agentStep, setAgentStep] = useState<AgentStep>("idle");
  const [agentLog, setAgentLog] = useState<string[]>([]);
  const [result, setResult] = useState<PRResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ success: boolean; pr_id?: number; message?: string; error?: string } | null>(null);
  // PR list
  const [prList, setPrList] = useState<PRRecord[]>([]);
  const [loadingPRs, setLoadingPRs] = useState(true);

  // Fetch branches + PR list on mount
  useEffect(() => {
    fetch(`${BASE}/api/git/branches`)
      .then((r) => r.json())
      .then((data) => { setBranches(data.branches ?? []); setLoadingBranches(false); })
      .catch(() => setLoadingBranches(false));
    fetchPRs();
  }, []);

  const fetchPRs = () => {
    setLoadingPRs(true);
    fetch(`${BASE}/api/pull-requests`)
      .then((r) => r.json())
      .then((data) => { setPrList(data.pull_requests ?? []); setLoadingPRs(false); })
      .catch(() => setLoadingPRs(false));
  };

  const pushLog = (msg: string) => {
    setAgentLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handleCompare = async () => {
    if (!sourceBranch || !destBranch) return;
    setResult(null);
    setSubmitResult(null);
    setAgentLog([]);
    setAgentStep("fetching_diff");

    pushLog(`🔍 Computing diff: ${sourceBranch} → ${destBranch}`);
    await new Promise((r) => setTimeout(r, 600));
    setAgentStep("analyzing");
    pushLog("🤖 PR Agent started — running AI merge conflict analysis...");

    try {
      const res = await fetch(`${BASE}/api/git/compare-branches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_branch: sourceBranch, destination_branch: destBranch }),
      });
      const data: PRResult = await res.json();

      if (data.agent_log) {
        for (const line of data.agent_log) pushLog(line);
      }

      if (data.success) {
        const conflicts = data.analysis?.conflicts ?? [];
        pushLog(`✅ Analysis complete: ${conflicts.length} conflict(s) detected`);
        if (conflicts.length === 0) {
          pushLog("🎉 No merge conflicts — branches can be merged cleanly!");
        } else {
          pushLog(`⚠️ AI generated resolution suggestions for ${conflicts.length} file(s)`);
        }
        setAgentStep("complete");
      } else {
        pushLog(`❌ Analysis failed: ${data.error}`);
        setAgentStep("failed");
      }
      setResult(data);
    } catch (err) {
      pushLog(`❌ Network error: ${err}`);
      setAgentStep("failed");
    }
  };

  const handleSubmitPR = async () => {
    if (!result?.analysis) return;
    setSubmitting(true);
    pushLog("📋 Creating Pull Request for admin review...");

    try {
      const res = await fetch(`${BASE}/api/pull-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_branch: sourceBranch,
          destination_branch: destBranch,
          created_by: "developer",
          analysis: result.analysis,
          changed_files: result.changed_files ?? [],
        }),
      });
      const data = await res.json();
      setSubmitResult(data);

      if (data.success) {
        pushLog(`✅ Pull Request #${data.pr_id} created — awaiting admin review.`);
        fetchPRs(); // refresh the list
      } else {
        pushLog(`❌ Failed to create PR: ${data.error}`);
      }
    } catch (err) {
      pushLog(`❌ Network error: ${err}`);
      setSubmitResult({ success: false, error: String(err) });
    } finally {
      setSubmitting(false);
    }
  };

  const analysis = result?.analysis;
  const conflicts = analysis?.conflicts ?? [];
  const stepLabel = (step: AgentStep) =>
    step === "idle" ? "Waiting" :
    step === "fetching_diff" ? "Computing Diff..." :
    step === "analyzing" ? "AI Agent Running..." :
    step === "complete" ? "Complete" : "Failed";

  const statusColor = (s: string) =>
    s === "approved" ? "success" : s === "rejected" ? "danger" : "warning";

  return (
    <AppShell>
      {/* Header */}
      <div className="ado-card">
        <div className="ado-card-header flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Badge appearance="filled" color="brand">Pipelines Hub</Badge>
              <Text size={200} style={{ color: "var(--muted)" }}>AI-Powered Branch Merge</Text>
            </div>
            <h2 className="text-lg font-bold text-[color:var(--text)] mt-1">Create Pull Request</h2>
            <Text size={200} style={{ display: "block", marginTop: 4, opacity: 0.85 }}>
              Select branches, run AI analysis, and submit for admin approval.
            </Text>
          </div>
          {submitResult?.success && (
            <Badge appearance="filled" color="success">PR #{submitResult.pr_id} Created</Badge>
          )}
        </div>
      </div>

      {/* Branch Selection */}
      <div className="ado-card p-5">
        <span className="text-xs font-bold uppercase tracking-wider text-[color:var(--muted)] block mb-4">Select Branches</span>
        {loadingBranches ? (
          <div className="py-6 text-center"><Spinner label="Loading branches from repository..." /></div>
        ) : branches.length === 0 ? (
          <div className="py-6 text-center text-xs text-[color:var(--muted)]">No branches found in repository.</div>
        ) : (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto] items-end">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[color:var(--text)]" htmlFor="src-branch">Source Branch</label>
              <select id="src-branch" value={sourceBranch} onChange={(e) => setSourceBranch(e.target.value)}
                className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] text-[color:var(--text)] px-3 py-2 text-sm focus:border-[color:var(--accent)] focus:outline-none">
                <option value="">Select source branch...</option>
                {branches.map((b) => <option key={`src-${b.name}`} value={b.name}>{b.name} ({b.short_hash})</option>)}
              </select>
            </div>
            <div className="flex items-center justify-center pb-1">
              <span className="text-lg text-[color:var(--muted)] font-bold">→</span>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[color:var(--text)]" htmlFor="dest-branch">Destination Branch</label>
              <select id="dest-branch" value={destBranch} onChange={(e) => setDestBranch(e.target.value)}
                className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] text-[color:var(--text)] px-3 py-2 text-sm focus:border-[color:var(--accent)] focus:outline-none">
                <option value="">Select destination branch...</option>
                {branches.map((b) => <option key={`dst-${b.name}`} value={b.name}>{b.name} ({b.short_hash})</option>)}
              </select>
            </div>
            <Button appearance="primary" onClick={handleCompare}
              disabled={agentStep === "fetching_diff" || agentStep === "analyzing" || !sourceBranch || !destBranch || sourceBranch === destBranch}
              style={{ height: 36 }}>
              {agentStep === "analyzing" ? "Agent Running..." : "Create PR"}
            </Button>
          </div>
        )}
      </div>

      {/* AI Agent Pipeline */}
      {agentStep !== "idle" && (
        <div className="ado-card overflow-hidden">
          <div className="ado-card-header flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm">🤖</span>
              <h3 className="text-sm font-bold text-[color:var(--text)]">PR Analysis Agent</h3>
            </div>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              agentStep === "analyzing" || agentStep === "fetching_diff" ? "bg-sky-500/15 text-sky-400 border border-sky-500/30"
              : agentStep === "complete" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
              : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
            }`}>
              {(agentStep === "analyzing" || agentStep === "fetching_diff") && <span className="h-2 w-2 rounded-full bg-sky-400 animate-pulse" />}
              {stepLabel(agentStep)}
            </span>
          </div>

          <div className="p-4">
            <div className="flex items-center gap-3 mb-4">
              {["Fetch Diff", "AI Analysis", "Results"].map((label, i) => {
                const currentIndex = agentStep === "fetching_diff" ? 0 : agentStep === "analyzing" ? 1 : agentStep === "complete" || agentStep === "failed" ? 2 : -1;
                const done = i < currentIndex;
                const active = i === currentIndex;
                return (
                  <div key={label} className="flex items-center gap-2 flex-1">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold transition-all ${
                      done ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-400"
                      : active ? "border-sky-500/30 bg-sky-500/15 text-sky-400 animate-pulse"
                      : "border-[color:var(--border)] bg-[color:var(--surface-2)] text-[color:var(--muted)]"
                    }`}>{done ? "✓" : i + 1}</div>
                    <span className={`text-xs font-semibold ${done ? "text-emerald-400" : active ? "text-sky-400" : "text-[color:var(--muted)]"}`}>{label}</span>
                    {i < 2 && <div className={`flex-1 h-0.5 rounded-full ${done ? "bg-emerald-500/30" : "bg-[color:var(--border)]"}`} />}
                  </div>
                );
              })}
            </div>
            {(agentStep === "analyzing" || agentStep === "fetching_diff") && (
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-700">
                <div className="h-full animate-[progress_2s_ease-in-out_infinite] rounded-full bg-sky-500" />
              </div>
            )}
          </div>

          <div className="border-t border-[color:var(--border)] bg-black/80 p-4 font-mono text-xs">
            <span className="text-slate-400 font-bold block mb-2">📋 Agent Console</span>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {agentLog.map((line, i) => (
                <div key={i} className={
                  line.includes("✅") || line.includes("🎉") ? "text-emerald-400"
                  : line.includes("❌") || line.includes("⚠️") ? "text-rose-400"
                  : line.includes("🤖") ? "text-sky-300" : "text-slate-300"
                }>{line}</div>
              ))}
              {(agentStep === "analyzing" || agentStep === "fetching_diff") && <div className="text-sky-400 animate-pulse">▌ Processing...</div>}
            </div>
          </div>
        </div>
      )}

      {/* No Conflicts */}
      {result?.success && analysis && !analysis.has_conflicts && !submitResult && (
        <div className="ado-card p-6 space-y-4">
          <div className="text-center space-y-3 py-4">
            <div className="text-4xl">✅</div>
            <h3 className="text-lg font-bold text-[color:var(--text)]">No Merge Conflicts Detected!</h3>
            <Text size={200} style={{ color: "var(--muted)", display: "block" }}>{analysis.summary}</Text>
          </div>
          <Divider />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[["Files Changed", analysis.files_changed], ["Insertions", `+${analysis.insertions}`], ["Deletions", `-${analysis.deletions}`], ["Changed Files", result.changed_files?.length ?? 0]].map(([label, value]) => (
              <div key={String(label)} className="soft-card p-3 text-center">
                <span className="text-[10px] text-[color:var(--muted)] block uppercase tracking-wider">{label}</span>
                <span className="text-sm font-bold text-[color:var(--text)] block mt-1">{value}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-center pt-3">
            <Button appearance="primary" onClick={handleSubmitPR} disabled={submitting}>
              {submitting ? "Submitting..." : "📋 Submit PR for Admin Review"}
            </Button>
          </div>
        </div>
      )}

      {/* Conflicts Found */}
      {result?.success && analysis && analysis.has_conflicts && (
        <>
          <div className="ado-card">
            <div className="ado-card-header flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-bold text-[color:var(--text)]">AI Merge Conflict Analysis</h3>
                <Badge appearance="filled" color="danger">{conflicts.length} conflict(s)</Badge>
              </div>
              <Text size={200} style={{ color: "var(--muted)" }}>{analysis.summary}</Text>
            </div>
          </div>

          {conflicts.map((conflict, index) => (
            <div key={conflict.file_path} className="ado-card overflow-hidden">
              <div className="ado-card-header flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge appearance="filled" color="danger" size="small">{conflict.conflict_type}</Badge>
                  <span className="text-xs font-mono font-semibold text-[color:var(--text)]">{conflict.file_path}</span>
                </div>
                <span className="text-[10px] text-[color:var(--muted)] uppercase tracking-wider">Conflict #{index + 1}</span>
              </div>
              <div className="p-4 space-y-4">
                <Text size={200} style={{ color: "var(--muted)" }}>{conflict.description}</Text>
                <div className="grid gap-3 grid-cols-1 lg:grid-cols-2">
                  <div className="rounded-lg border border-rose-500/30 overflow-hidden">
                    <div className="px-3 py-2 bg-rose-950/30 border-b border-rose-500/20 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-rose-400 font-mono">← {sourceBranch}</span>
                      <Badge appearance="tint" color="danger" size="small">Source</Badge>
                    </div>
                    <pre className="p-3 font-mono text-[11px] overflow-x-auto text-[color:var(--text)] whitespace-pre-wrap leading-relaxed bg-rose-950/5">{conflict.source_code}</pre>
                  </div>
                  <div className="rounded-lg border border-sky-500/30 overflow-hidden">
                    <div className="px-3 py-2 bg-sky-950/30 border-b border-sky-500/20 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-sky-400 font-mono">→ {destBranch}</span>
                      <Badge appearance="tint" color="informative" size="small">Destination</Badge>
                    </div>
                    <pre className="p-3 font-mono text-[11px] overflow-x-auto text-[color:var(--text)] whitespace-pre-wrap leading-relaxed bg-sky-950/5">{conflict.dest_code}</pre>
                  </div>
                </div>
                <div className="rounded-lg border border-emerald-500/30 overflow-hidden">
                  <div className="px-3 py-2 bg-emerald-950/30 border-b border-emerald-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">🤖</span>
                      <span className="text-[11px] font-bold text-emerald-400">AI Merge Resolution</span>
                    </div>
                    <Badge appearance="filled" color="success" size="small">PR Agent</Badge>
                  </div>
                  <pre className="p-3 font-mono text-[11px] overflow-x-auto text-emerald-200 whitespace-pre-wrap leading-relaxed bg-emerald-950/10">{conflict.ai_resolution}</pre>
                  <div className="px-3 py-2 border-t border-emerald-500/10 bg-emerald-950/5">
                    <Text size={100} style={{ color: "rgb(134 239 172)" }}>💡 {conflict.resolution_explanation}</Text>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {!submitResult && (
            <div className="ado-card p-5 text-center space-y-4">
              <h3 className="text-base font-bold text-[color:var(--text)]">Submit AI Resolution for Admin Review</h3>
              <Text size={200} style={{ color: "var(--muted)", display: "block" }}>
                The AI has resolved the conflicts. Submit this PR for admin approval. The admin can approve or add manual comments.
              </Text>
              <div className="flex justify-center">
                <Button appearance="primary" onClick={handleSubmitPR} disabled={submitting}>
                  {submitting ? "Submitting..." : "📋 Submit PR for Admin Review"}
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Submit Result */}
      {submitResult && (
        <div className="ado-card p-6 text-center space-y-3">
          <div className="text-3xl">{submitResult.success ? "📋" : "❌"}</div>
          <h3 className="text-base font-bold text-[color:var(--text)]">
            {submitResult.success ? `Pull Request #${submitResult.pr_id} Submitted!` : "Submission Failed"}
          </h3>
          <Text size={200} style={{ color: "var(--muted)", display: "block" }}>
            {submitResult.success ? "Your PR has been sent to the admin for review. Check the PR list below for updates." : submitResult.error}
          </Text>
        </div>
      )}

      {/* Error state */}
      {result && !result.success && (
        <div className="ado-card p-6 text-center space-y-3">
          <div className="text-3xl">❌</div>
          <h3 className="text-base font-bold text-rose-400">Analysis Failed</h3>
          <Text size={200} style={{ color: "var(--muted)", display: "block" }}>{result.error}</Text>
        </div>
      )}

      {/* PR List */}
      <div className="ado-card">
        <div className="ado-card-header flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[color:var(--text)]">My Pull Requests</h3>
            <Text size={100} style={{ color: "var(--muted)" }}>Track your submitted PRs and admin feedback</Text>
          </div>
          <Button appearance="subtle" size="small" onClick={fetchPRs}>Refresh</Button>
        </div>
        <div className="p-4">
          {loadingPRs ? (
            <Spinner size="small" label="Loading pull requests..." />
          ) : prList.length === 0 ? (
            <div className="text-center py-8 text-xs text-[color:var(--muted)]">No pull requests yet. Create one above!</div>
          ) : (
            <div className="space-y-3">
              {prList.map((pr) => (
                <div key={pr.id} className="soft-card p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[color:var(--text)]">PR #{pr.id}</span>
                      <Badge appearance="filled" color={statusColor(pr.status) as any} size="small">
                        {pr.status.toUpperCase()}
                      </Badge>
                      {pr.has_conflicts && <Badge appearance="tint" color="danger" size="small">Conflicts</Badge>}
                    </div>
                    <span className="text-[10px] text-[color:var(--muted)]">{pr.created_at ? new Date(pr.created_at).toLocaleString() : ""}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[color:var(--muted)]">
                    <code className="text-[color:var(--accent)]">{pr.source_branch}</code>
                    <span>→</span>
                    <code className="text-[color:var(--accent)]">{pr.destination_branch}</code>
                    <span className="ml-2">{pr.files_changed} files</span>
                    <span className="text-emerald-500">+{pr.insertions}</span>
                    <span className="text-rose-500">-{pr.deletions}</span>
                  </div>
                  {pr.ai_summary && <Text size={200} style={{ color: "var(--muted)" }}>{pr.ai_summary}</Text>}
                  {pr.admin_comment && (
                    <div className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-amber-400">💬 Admin Comment</span>
                        {pr.reviewed_by && <span className="text-[10px] text-[color:var(--muted)]">by {pr.reviewed_by}</span>}
                      </div>
                      <Text size={200} style={{ color: "var(--text)" }}>{pr.admin_comment}</Text>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
