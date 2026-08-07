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
  { id: 'git_watcher',    icon: '👁️',  label: 'Git Watcher',          description: 'Monitors C:\\GitRemote for new commits', status: 'idle' },
  { id: 'kb_agent',       icon: '📚',  label: 'Knowledge Base Agent', description: 'Extracts structured knowledge from changed files', status: 'idle' },
  { id: 'logic_analyzer', icon: '🔍',  label: 'LLM Logic Analyzer',   description: 'Checks logical flaws, enterprise guidelines & maintainability', status: 'idle' },
  { id: 'sonarcloud',     icon: '🔬',  label: 'SonarCloud Scanner',   description: 'Static analysis: bugs, vulnerabilities, code smells', status: 'idle' },
  { id: 'meta_analyzer',  icon: '🧠',  label: 'Meta-Analyzer',        description: 'Synthesizes all findings → composite quality score', status: 'idle' },
  { id: 'review_engine',  icon: '✨',  label: 'Review Engine',        description: 'Generates suggested code fixes with original/suggested diff', status: 'idle' },
];

function StatusDot({ status }: { status: AgentStatus }) {
  if (status === 'idle') return <span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-600" />;
  if (status === 'running') return (
    <span className="relative inline-flex h-2.5 w-2.5">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-400" />
    </span>
  );
  if (status === 'success') return <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400" />;
  return <span className="inline-block h-2.5 w-2.5 rounded-full bg-rose-500" />;
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
        pushEvent('WebSocket connected to backend', 'success');
        const ping = setInterval(() => ws.readyState === WebSocket.OPEN && ws.send('ping'), 25000);
        ws.onclose = () => clearInterval(ping);
      };

      ws.onclose = () => {
        setWsStatus('disconnected');
        pushEvent('WebSocket disconnected — reconnecting in 3s…', 'error');
        reconnectTimeout = setTimeout(connect, 3000);
      };

      ws.onerror = () => pushEvent('WebSocket error', 'error');

      ws.onmessage = (evt) => {
        let msg: AgentPipelineEvent;
        try { msg = JSON.parse(evt.data); } catch { return; }

        switch (msg.type) {
          case 'pong':
            break;

          case 'commit_detected': {
            const d = msg.data!;
            resetAgents();
            updateAgent('git_watcher', { status: 'success', startedAt: Date.now() - 100, finishedAt: Date.now(), details: `${d.files_changed ?? 0} files changed` });
            updateAgent('kb_agent', { status: 'running', startedAt: Date.now() });
            updateAgent('logic_analyzer', { status: 'running', startedAt: Date.now() });
            updateAgent('sonarcloud', { status: 'running', startedAt: Date.now() });
            setLastCommit({ hash: d.hash ?? '', author: d.author ?? '', message: d.message ?? '' });
            pushEvent(`🔀 New commit detected: ${d.hash?.slice(0, 8)} by ${d.author} — "${d.message}"`, 'commit');
            break;
          }

          case 'analysis_started': {
            pushEvent(`🚀 Analysis pipeline started for ${msg.short_hash} — running: ${(msg.pipelines ?? []).join(', ')}`, 'info');
            break;
          }

          case 'analysis_complete': {
            const score = msg.composite_score ?? 0;
            updateAgent('kb_agent', { status: 'success', finishedAt: Date.now(), details: msg.kb_processed ? 'KB generated' : 'No KB' });
            updateAgent('logic_analyzer', { status: 'success', finishedAt: Date.now(), details: `${msg.logic_findings ?? 0} findings`, findings: msg.logic_findings });
            updateAgent('sonarcloud', { status: 'success', finishedAt: Date.now(), details: `${msg.sonar_findings ?? 0} issues`, findings: msg.sonar_findings });
            updateAgent('meta_analyzer', { status: 'success', startedAt: Date.now() - 500, finishedAt: Date.now(), details: `${msg.total_findings ?? 0} total findings`, score });
            updateAgent('review_engine', { status: 'success', startedAt: Date.now() - 200, finishedAt: Date.now(), details: `${msg.reviews_created ?? 0} reviews created` });
            setLastCommit(prev => prev ? { ...prev, score } : prev);
            pushEvent(`✅ Analysis complete — Score: ${score}/100 | ${msg.total_findings ?? 0} findings | ${msg.reviews_created ?? 0} reviews`, 'success');
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

  const scoreColor = (s: number) =>
    s >= 85 ? 'text-emerald-400' : s >= 70 ? 'text-yellow-400' : s >= 50 ? 'text-orange-400' : 'text-rose-500';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.35em] text-cyan-400">Live orchestration</p>
          <h3 className="mt-1 text-xl font-semibold text-[color:var(--text)]">Agent Pipeline</h3>
        </div>
        <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${
          wsStatus === 'connected' ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
          : wsStatus === 'connecting' ? 'border-cyan-400/20 bg-cyan-400/10 text-cyan-300'
          : 'border-rose-500/20 bg-rose-500/10 text-rose-300'
        }`}>
          <span className={`h-1.5 w-1.5 rounded-full ${
            wsStatus === 'connected' ? 'bg-emerald-400 animate-pulse'
            : wsStatus === 'connecting' ? 'bg-cyan-400 animate-spin'
            : 'bg-rose-500'
          }`} />
          {wsStatus === 'connected' ? 'Live' : wsStatus === 'connecting' ? 'Connecting…' : 'Offline'}
        </div>
      </div>

      {/* Last commit banner */}
      {lastCommit && (
        <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/8 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-medium text-white">{lastCommit.message}</p>
              <p className="mt-0.5 text-xs text-slate-400">{lastCommit.author} · <code className="text-cyan-300">{lastCommit.hash.slice(0, 8)}</code></p>
            </div>
            {lastCommit.score !== undefined && (
              <div className="flex-shrink-0 text-right">
                <p className="text-[10px] uppercase tracking-widest text-slate-500">Quality</p>
                <p className={`text-2xl font-bold ${scoreColor(lastCommit.score)}`}>{lastCommit.score}<span className="text-sm font-normal text-slate-500">/100</span></p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Agent blocks */}
      <div className="space-y-2">
        {agents.map((agent, idx) => (
          <div
            key={agent.id}
            className={`relative overflow-hidden rounded-2xl border p-4 transition-all duration-500 ${
              agent.status === 'running'
                ? 'border-cyan-400/30 bg-cyan-400/8 shadow-[0_0_20px_rgba(34,211,238,0.12)]'
                : agent.status === 'success'
                ? 'border-emerald-400/25 bg-emerald-400/6'
                : agent.status === 'failed'
                ? 'border-rose-500/40 bg-rose-500/10 shadow-[0_0_24px_rgba(239,68,68,0.2)]'
                : 'border-white/8 bg-white/3'
            }`}
          >
            {/* Animated shimmer for running */}
            {agent.status === 'running' && (
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-cyan-400/8 to-transparent" />
            )}

            <div className="flex items-center gap-3">
              {/* Step number */}
              <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                agent.status === 'running' ? 'border-cyan-400/30 bg-cyan-400/15 text-cyan-300'
                : agent.status === 'success' ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
                : agent.status === 'failed' ? 'border-rose-500/40 bg-rose-500/15 text-rose-300'
                : 'border-white/10 bg-white/5 text-slate-500'
              }`}>
                {agent.status === 'success' ? '✓' : agent.status === 'failed' ? '✗' : idx + 1}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-base">{agent.icon}</span>
                  <span className={`font-semibold ${
                    agent.status === 'failed' ? 'text-rose-300'
                    : agent.status === 'success' ? 'text-white'
                    : agent.status === 'running' ? 'text-cyan-100'
                    : 'text-slate-400'
                  }`}>{agent.label}</span>
                  <StatusDot status={agent.status} />
                  {agent.status === 'running' && (
                    <span className="text-xs text-cyan-400 animate-pulse">Running… {elapsed(agent.startedAt)}</span>
                  )}
                  {agent.status === 'success' && agent.finishedAt && (
                    <span className="text-xs text-slate-500">{elapsed(agent.startedAt, agent.finishedAt)}</span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-slate-500">{agent.description}</p>
              </div>

              {/* Right side detail */}
              {agent.details && (
                <div className="flex-shrink-0 text-right">
                  {agent.score !== undefined ? (
                    <p className={`text-lg font-bold ${scoreColor(agent.score)}`}>{agent.score}<span className="text-xs text-slate-500">/100</span></p>
                  ) : agent.findings !== undefined ? (
                    <p className="text-sm font-semibold text-slate-300">{agent.findings} <span className="text-xs text-slate-500">found</span></p>
                  ) : null}
                  <p className="text-xs text-slate-500">{agent.details}</p>
                </div>
              )}

              {/* Failed badge */}
              {agent.status === 'failed' && (
                <div className="flex-shrink-0 rounded-full border border-rose-500/30 bg-rose-500/15 px-2.5 py-1 text-xs font-semibold uppercase tracking-widest text-rose-300">FAILED</div>
              )}
            </div>

            {/* Progress bar for running agents */}
            {agent.status === 'running' && (
              <div className="mt-3 h-0.5 overflow-hidden rounded-full bg-slate-800">
                <div className="h-full animate-[progress_3s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-cyan-500 via-blue-400 to-cyan-500" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Event ticker */}
      <div className="rounded-2xl border border-white/8 bg-slate-950/70">
        <div className="flex items-center justify-between border-b border-white/8 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Event log</p>
          </div>
          <button onClick={() => setEvents([])} className="text-xs text-slate-600 hover:text-slate-400">Clear</button>
        </div>
        <div ref={tickerRef} className="max-h-44 overflow-y-auto p-3 space-y-1.5">
          {events.length === 0 ? (
            <p className="text-xs text-slate-600 italic">Waiting for commits…</p>
          ) : (
            events.map((ev, i) => (
              <div key={i} className={`flex gap-2 text-xs ${
                ev.type === 'success' ? 'text-emerald-400'
                : ev.type === 'error' ? 'text-rose-400'
                : ev.type === 'commit' ? 'text-cyan-300'
                : 'text-slate-400'
              }`}>
                <span className="flex-shrink-0 text-slate-600">{ev.time}</span>
                <span>{ev.text}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
