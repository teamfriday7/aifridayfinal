"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { apiClient } from "@/lib/api-client";
import type { Project } from "@/lib/types";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("AI Friday Final");
  const [repoPath, setRepoPath] = useState("C:/GitRemote");
  const [description, setDescription] = useState("Tracked repository from the backend watcher");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadProjects = async () => {
    setLoading(true);
    try {
      setProjects(await apiClient.getProjects());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleCreate = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await apiClient.createProject({ name, repo_path: repoPath, description });
      setMessage("Project registered successfully.");
      await loadProjects();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create project");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 shadow-2xl shadow-black/30">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-cyan-400">Repository registry</p>
            <h2 className="mt-2 text-3xl font-semibold text-white">Tracked projects</h2>
            <p className="mt-2 text-sm text-slate-400">Use the existing backend registration endpoint to connect repositories to the watcher.</p>
          </div>
          <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-200">
            Endpoints: /api/projects and /api/projects/{"id"}/activate
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div>
              <label className="mb-2 block text-sm text-slate-300">Project name</label>
              <input value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-900 px-3 py-2 text-white" />
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-300">Repository path</label>
              <input value={repoPath} onChange={(event) => setRepoPath(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-900 px-3 py-2 text-white" />
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-300">Description</label>
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} className="min-h-24 w-full rounded-2xl border border-white/10 bg-slate-900 px-3 py-2 text-white" />
            </div>
            {message ? <p className="text-sm text-slate-300">{message}</p> : null}
            <button onClick={handleCreate} disabled={busy} className="w-full rounded-2xl bg-cyan-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-60">
              {busy ? "Registering…" : "Register project"}
            </button>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="animate-pulse space-y-3">
                {[...Array(3)].map((_, index) => <div key={index} className="h-24 rounded-2xl bg-slate-800" />)}
              </div>
            ) : (
              projects.map((project) => (
                <div key={project.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{project.name}</p>
                      <p className="mt-1 text-sm text-slate-400">{project.description || "No description provided"}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs uppercase tracking-[0.2em] ${project.is_watching ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-200" : "border border-slate-500/20 bg-slate-500/10 text-slate-300"}`}>
                      {project.is_watching ? "watching" : "idle"}
                    </span>
                  </div>
                  <p className="mt-4 text-xs text-slate-500">{project.repo_path}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
