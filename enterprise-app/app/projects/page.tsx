"use client";

import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Field,
  Input,
  Spinner,
  Text,
  Textarea,
} from "@fluentui/react-components";
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
      {/* Header card */}
      <div className="ado-card">
        <div className="ado-card-header flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge appearance="filled" color="brand">Repos Hub</Badge>
              <Text size={200} style={{ color: "var(--muted)" }}>Repository Settings & Watcher</Text>
            </div>
            <h2 className="text-lg font-bold text-[color:var(--text)] mt-1">Tracked Repositories</h2>
          </div>
          <Badge appearance="tint" color="informative">{projects.length} connected</Badge>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-[380px_minmax(0,1fr)]">
        {/* Register repo form */}
        <div className="ado-card p-4 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-[color:var(--text)]">Register Repository</h3>
            <p className="text-xs text-[color:var(--muted)] mt-0.5">Add a repository path for real-time AI commit watching.</p>
          </div>

          <div className="space-y-3">
            <Field label="Project Name">
              <Input value={name} onChange={(_, data) => setName(data.value)} />
            </Field>
            <Field label="Repository Local Path">
              <Input value={repoPath} onChange={(_, data) => setRepoPath(data.value)} />
            </Field>
            <Field label="Description">
              <Textarea value={description} onChange={(_, data) => setDescription(data.value)} resize="vertical" />
            </Field>
            {message ? <p className="text-xs text-emerald-400 font-semibold">{message}</p> : null}
            <Button appearance="primary" onClick={handleCreate} disabled={busy} className="w-full">
              {busy ? "Registering…" : "Register Repository"}
            </Button>
          </div>
        </div>

        {/* Repos list */}
        <div className="ado-card">
          <div className="ado-card-header flex items-center justify-between">
            <h3 className="text-sm font-bold text-[color:var(--text)]">Repository Inventory</h3>
            <span className="text-xs text-[color:var(--muted)]">Active Watcher List</span>
          </div>

          <div className="p-4 space-y-3">
            {loading ? (
              <div className="py-8 text-center"><Spinner label="Loading projects" /></div>
            ) : projects.length === 0 ? (
              <Text>No projects registered yet.</Text>
            ) : (
              projects.map((project) => (
                <div key={project.id} className="soft-card p-4 flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[color:var(--text)]">{project.name}</span>
                      <span className="font-mono text-[10px] text-[color:var(--accent)] bg-[color:var(--surface)] px-2 py-0.5 rounded border border-[color:var(--border)]">
                        {project.repo_path}
                      </span>
                    </div>
                    <p className="text-xs text-[color:var(--muted)]">{project.description || "No description provided"}</p>
                  </div>

                  <Badge appearance="filled" color={project.is_watching ? "success" : "subtle"} size="small">
                    {project.is_watching ? "Watching" : "Idle"}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

