'use client';

import { useEffect, useRef, useState } from 'react';
import type { AgentPipelineEvent } from '@/lib/types';

type AgentStatus = 'idle' | 'running' | 'success' | 'failed';

interface AgentBlock {
  id: string;
  label: string;
  icon: string;
  description: string;
  status: AgentStatus;
  startedAt?: number;
  finishedAt?: number;
  details?: string;
  score?: number;
  findings?: number;
}

const INITIAL_AGENTS: AgentBlock[] = [
  { id: 'git_watcher',    icon: 'GW',  label: 'Git Watcher',          description: 'Monitors repository for new commits', status: 'idle' },
  { id: 'kb_agent',       icon: 'KB',  label: 'Knowledge Base Agent', description: 'Extracts structured knowledge from changed files', status: 'idle' },
  { id: 'logic_analyzer', icon: 'LA',  label: 'LLM Logic Analyzer',   description: 'Checks logical flaws, enterprise guidelines & maintainability', status: 'idle' },
  { id: 'sonarcloud',     icon: 'SQ',  label: 'SonarCloud Scanner',   description: 'Static analysis: bugs, vulnerabilities, code smells', status: 'idle' },
  { id: 'codebert_agent', icon: 'CB', label: 'CodeBERT Semantic',    description: 'Deep semantic analysis using CodeBERT embeddings & AST', status: 'idle' },
  { id: 'meta_analyzer',  icon: 'MA',  label: 'Meta-Analyzer',        description: 'Synthesizes all findings → composite quality score', status: 'idle' },
  { id: 'review_engine',  icon: 'RE',  label: 'Review Engine',        description: 'Generates suggested code fixes with original/suggested diff', status: 'idle' },
];

function StatusIcon({ status }: { status: AgentStatus }) {
  if (status === 'idle') {
    return (
      <div className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-600 bg-slate-800 text-[10px] text-slate-400">
        ⚪
      </div>
    );
  }
  if (status === 'running') {
    return (
      <div className="flex h-5 w-5 items-center justify-center rounded-full border border-sky-400 bg-sky-950 text-sky-400 animate-spin">
        ⚙
      </div>
    );
  }
  if (status === 'success') {
    return (
      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#107c41] text-white text-[11px] font-bold shadow-sm">
        ✓
      </div>
    );
  }
  return (
    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#a80000] text-white text-[11px] font-bold shadow-sm">
      ✕
    </div>
  );
}

function elapsed(start?: number, end?: number): string {
  if (!start) return '';
  const ms = (end ?? Date.now()) - start;
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

export function AgentPipeline() {
  const [agents, setAgents] = useState<AgentBlock[]>(INITIAL_AGENTS);
  const [events, setEvents] = useState<{ time: string; text: string; type: 'info' | 'success' | 'error' | 'commit' }[]>([]);
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [lastCommit, setLastCommit] = useState<{ hash: string; author: string; message: string; score?: number } | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const tickerRef = useRef<HTMLDivElement>(null);

  const pushEvent = (text: string, type: 'info' | 'success' | 'error' | 'commit' = 'info') => {
    setEvents(prev => [{ time: new Date().toLocaleTimeString(), text, type }, ...prev].slice(0, 50));
    setTimeout(() => tickerRef.current?.scrollTo({ top: 0, behavior: 'smooth' }), 50);
  };

  const updateAgent = (id: string, patch: Partial<AgentBlock>) => {
    setAgents(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a));
  };

  const resetAgents = () => setAgents(INITIAL_AGENTS);

  useEffect(() => {
    let reconnectTimeout: ReturnType<typeof setTimeout>;

    function connect() {
      const ws = new WebSocket('ws://localhost:8000/ws/commits');
      wsRef.current = ws;
      setWsStatus('connecting');

      ws.onopen = () => {
        setWsStatus('connected');
        pushEvent('WebSocket connected to Azure Pipelines agent backend', 'success');
        const ping = setInterval(() => ws.readyState === WebSocket.OPEN && ws.send('ping'), 25000);
        ws.onclose = () => clearInterval(ping);
      };

      ws.onclose = () => {
        setWsStatus('disconnected');
        pushEvent('Agent disconnected — attempting auto-reconnect in 3s…', 'error');
        reconnectTimeout = setTimeout(connect, 3000);
      };

      ws.onerror = () => pushEvent('WebSocket agent error', 'error');

      ws.onmessage = (evt) => {
        let msg: any;
        try { msg = JSON.parse(evt.data); } catch { return; }

        switch (msg.type) {
          case 'pong':
            break;

          case 'commit_detected': {
            const d = msg.data!;
            resetAgents();
            updateAgent('git_watcher', { status: 'success', startedAt: Date.now() - 100, finishedAt: Date.now(), details: `${d.files_changed ?? 0} files changed` });
            setLastCommit({ hash: d.hash ?? '', author: d.author ?? '', message: d.message ?? '' });
            pushEvent(`🔀 New trigger commit: ${d.hash?.slice(0, 8)} by ${d.author} — "${d.message}"`, 'commit');
            break;
          }

          case 'analysis_started': {
            pushEvent(`🚀 Pipeline run initialized for ${msg.short_hash} — running jobs: ${(msg.pipelines ?? []).join(', ')}`, 'info');
            break;
          }

          case 'agent_started': {
            if (msg.agent) updateAgent(msg.agent, { status: 'running', startedAt: Date.now() });
            break;
          }

          case 'agent_finished': {
            if (msg.agent) {
              updateAgent(msg.agent, { 
                status: 'success', 
                finishedAt: Date.now(), 
                details: msg.details, 
                findings: msg.findings, 
                score: msg.score 
              });
              if (msg.agent === 'meta_analyzer' && msg.score !== undefined) {
                setLastCommit(prev => prev ? { ...prev, score: Number(msg.score) } : prev);
              }
            }
            break;
          }

          case 'analysis_complete': {
            const score = msg.composite_score ?? 0;
            pushEvent(`✅ Pipeline run succeeded — Score: ${score}/100 | ${msg.total_findings ?? 0} findings | ${msg.reviews_created ?? 0} reviews created`, 'success');
            break;
          }

          default:
            if (msg.type && msg.type !== 'pong') pushEvent(`📨 ${msg.type}`, 'info');
        }
      };
    }

    connect();
    return () => {
      clearTimeout(reconnectTimeout);
      wsRef.current?.close();
    };
  }, []);

  const overallState = agents.some((agent) => agent.status === 'running')
    ? 'running'
    : agents.every((agent) => agent.status === 'success')
    ? 'success'
    : agents.some((agent) => agent.status === 'failed')
    ? 'failed'
    : 'idle';

  const pipelineBadgeLabel = overallState === 'running'
    ? 'In progress'
    : overallState === 'success'
    ? 'Succeeded'
    : overallState === 'failed'
    ? 'Failed'
    : 'Never run';

  const stageNodes = [
    { key: 'build', title: 'Dev Scan Stage', subtitle: 'Watcher & Knowledge', agents: [agents[0], agents[1]] },
    { key: 'analysis', title: 'Test & Analysis', subtitle: 'Logic, Sonar & CodeBERT', agents: [agents[2], agents[3], agents[4]] },
    { key: 'publish', title: 'Release Gate', subtitle: 'Meta & Fix Generator', agents: [agents[5], agents[6]] },
  ];

  return (
    <div className="space-y-6">
      {/* Azure Pipelines Run Title Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[color:var(--accent)] text-white font-bold text-lg shadow-sm">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-[color:var(--text)]">Release Pipeline #2026.08.07</h3>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                overallState === 'running' ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                : overallState === 'success' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : overallState === 'failed' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                : 'bg-slate-700/30 text-slate-300 border border-slate-600/30'
              }`}>
                {pipelineBadgeLabel}
              </span>
            </div>
            <p className="text-xs text-[color:var(--muted)] mt-0.5">
              Triggered by push to <span className="font-mono text-xs text-[color:var(--accent)]">refs/heads/main</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 rounded-md border px-3 py-1 text-xs font-medium ${
            wsStatus === 'connected' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
            : wsStatus === 'connecting' ? 'border-sky-500/30 bg-sky-500/10 text-sky-400'
            : 'border-rose-500/30 bg-rose-500/10 text-rose-400'
          }`}>
            <span className={`h-2 w-2 rounded-full ${
              wsStatus === 'connected' ? 'bg-emerald-400 animate-pulse'
              : wsStatus === 'connecting' ? 'bg-sky-400 animate-ping'
              : 'bg-rose-500'
            }`} />
            {wsStatus === 'connected' ? 'Hosted Agent Online' : wsStatus === 'connecting' ? 'Connecting to Hosted Agent…' : 'Agent Disconnected'}
          </div>
        </div>
      </div>

      {/* Azure DevOps Stages Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {stageNodes.map((stage, stageIndex) => {
          const stageState = stage.agents.some((agent) => agent.status === 'running')
            ? 'running'
            : stage.agents.some((agent) => agent.status === 'failed')
            ? 'failed'
            : stage.agents.every((agent) => agent.status === 'success')
            ? 'success'
            : 'idle';

          return (
            <div key={stage.key} className="relative rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] p-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-[color:var(--border)] pb-3 mb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--muted)]">Stage {stageIndex + 1}</span>
                  <h4 className="text-sm font-bold text-[color:var(--text)]">{stage.title}</h4>
                </div>
                <span className="text-xs text-[color:var(--muted)]">{stage.subtitle}</span>
              </div>

              <div className="space-y-3">
                {stage.agents.map((agent) => (
                  <div key={agent.id} className="rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3 transition-all hover:border-[color:var(--accent)]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <StatusIcon status={agent.status} />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-[color:var(--text)]">{agent.label}</p>
                          <p className="text-[11px] text-[color:var(--muted)] truncate">{agent.description}</p>
                        </div>
                      </div>

                      {agent.score !== undefined ? (
                        <span className="rounded bg-sky-500/10 px-2 py-0.5 text-xs font-bold text-[color:var(--accent)]">
                          {agent.score}/100
                        </span>
                      ) : agent.findings !== undefined ? (
                        <span className="rounded bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-500">
                          {agent.findings} issues
                        </span>
                      ) : null}
                    </div>

                    {agent.status === 'running' && (
                      <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-700">
                        <div className="h-full animate-[progress_2s_ease-in-out_infinite] rounded-full bg-[color:var(--accent)]" />
                      </div>
                    )}

                    {agent.details && (
                      <p className="mt-1.5 text-[11px] text-[color:var(--muted)] font-mono truncate">{agent.details}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Azure DevOps Build Console Log Output */}
      <div className="rounded-lg border border-[color:var(--border)] bg-black/90 p-4 font-mono text-xs shadow-inner">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
          <div className="flex items-center gap-2 text-slate-400">
            <span>💻</span>
            <span className="font-bold text-slate-200">Build Console & Agent Logs</span>
          </div>
          <button onClick={() => setEvents([])} className="text-slate-500 hover:text-slate-300 text-[11px]">
            Clear console
          </button>
        </div>

        <div ref={tickerRef} className="max-h-48 overflow-y-auto space-y-1 pr-1 font-mono">
          {events.length === 0 ? (
            <p className="text-slate-600 italic">No output logs yet. Waiting for commit triggers…</p>
          ) : (
            events.map((ev, i) => (
              <div key={i} className={`flex gap-3 leading-relaxed ${
                ev.type === 'success' ? 'text-emerald-400'
                : ev.type === 'error' ? 'text-rose-400'
                : ev.type === 'commit' ? 'text-sky-300'
                : 'text-slate-300'
              }`}>
                <span className="text-slate-600 flex-shrink-0">[{ev.time}]</span>
                <span className="break-all">{ev.text}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

