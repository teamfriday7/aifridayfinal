"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import {
  Badge,
  Button,
  Field,
  Input,
  Text,
} from "@fluentui/react-components";
import { useAuth } from "@/components/providers/auth-provider";

const roles = [
  { id: "developer", label: "Developer", hint: "Commit & Review" },
  { id: "reviewer", label: "Reviewer", hint: "Approve Fixes" },
  { id: "lead", label: "Engineering Lead", hint: "Metrics & Health" },
  { id: "admin", label: "System Admin", hint: "Full Control" },
];

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [role, setRole] = useState("developer");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(username.trim(), password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[color:var(--bg)] text-[color:var(--text)]">
      <div className="w-full max-w-4xl grid gap-6 grid-cols-1 md:grid-cols-2">
        {/* Left Azure DevOps Branding Banner */}
        <div className="ado-card p-8 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-gradient-to-br from-[#0078D4] to-[#002050] text-white flex items-center justify-center font-bold text-lg shadow">
                ❖
              </div>
              <span className="font-bold text-lg text-[color:var(--text)]">Azure DevOps Console</span>
            </div>

            <h1 className="text-2xl font-bold text-[color:var(--text)] leading-tight">
              AI-Powered Code Intelligence & Automated Review Engine
            </h1>

            <p className="text-xs text-[color:var(--muted)] leading-relaxed">
              From commit detection to automated fix synthesis, orchestrate SonarCloud, Knowledge Base, and LLM Logic Analyzers in a single unified workspace.
            </p>
          </div>

          <div className="soft-card p-4 space-y-2 rounded-lg">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--muted)]">Active Pipeline Flow</span>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {['Git Trigger', 'Knowledge Agent', 'Logic Analyzer', 'SonarCloud', 'Meta Synthesis', 'PR Auto-Commit'].map((step) => (
                <Badge key={step} appearance="filled" color="informative" size="small">
                  {step}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sign-in Form */}
        <div className="ado-card p-8 space-y-6">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[color:var(--text)]">Sign In</h2>
              <Badge appearance="filled" color="brand">{role}</Badge>
            </div>
            <p className="text-xs text-[color:var(--muted)] mt-1">Select role & authenticate to access workspace</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {roles.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setRole(item.id)}
                className={`p-2.5 rounded text-left border transition-all ${
                  role === item.id
                    ? "border-[color:var(--accent)] bg-[color:var(--accent-light)] font-semibold"
                    : "border-[color:var(--border)] hover:bg-[color:var(--surface-2)]"
                }`}
              >
                <span className="text-xs block text-[color:var(--text)]">{item.label}</span>
                <span className="text-[10px] text-[color:var(--muted)] block">{item.hint}</span>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Username">
              <Input value={username} onChange={(_, data) => setUsername(data.value)} />
            </Field>

            <Field label="Password">
              <Input type="password" value={password} onChange={(_, data) => setPassword(data.value)} />
            </Field>

            {error ? <p className="text-xs font-semibold text-rose-500">{error}</p> : null}

            <Button type="submit" appearance="primary" disabled={loading} className="w-full">
              {loading ? "Authenticating…" : "Enter Azure DevOps Console"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
