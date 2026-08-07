/* Executed by the installed Git pre-commit hook, outside the VS Code extension host. */
import { execFileSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { analyzeDiff, hasBlockingFinding } from "./analyzer";
import { Finding } from "./types";

type HookConfig = { beBaseUrl?: string; blockCommitOnHighSeverity?: boolean };

function git(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 }).trim();
}

async function main(): Promise<void> {
  try {
    const root = git(["rev-parse", "--show-toplevel"]);
    const hooks = git(["rev-parse", "--git-path", "hooks"]);
    const configPath = path.join(root, hooks, "codeguardian-config.json");
    const ignoredPath = path.join(root, hooks, "codeguardian-ignored.json");

    const config: HookConfig = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, "utf8")) : {};
    const ignoredKeys: string[] = fs.existsSync(ignoredPath) ? JSON.parse(fs.readFileSync(ignoredPath, "utf8")) : [];
    const ignoredSet = new Set(ignoredKeys);

    let diff = "";
    try {
      diff = git(["diff", "--cached", "--unified=0"]);
    } catch {
      diff = "";
    }

    if (!diff) {
      console.log("CodeGuardian pre-commit review: No staged changes.");
      return;
    }

    const localFindings = analyzeDiff(diff);
    const backendFindings = await getBackendFindings(config, root, "STAGED", diff, localFindings);
    const rawFindings = dedupe([...localFindings, ...backendFindings]);

    const findings = rawFindings.filter((f) => {
      const key1 = `${f.file}:${f.line}`;
      const key2 = `${f.title}:${f.file}:${f.line}`;
      const key3 = f.title;
      return !ignoredSet.has(key1) && !ignoredSet.has(key2) && !ignoredSet.has(key3);
    });

    if (findings.length === 0) {
      console.log("CodeGuardian pre-commit review: Staged changes clean (0 active findings).");
      return;
    }

    console.log(`CodeGuardian pre-commit review: ${findings.length} finding(s) in staged changes.`);
    for (const finding of findings) {
      console.log(`[${finding.severity.toUpperCase()}] ${finding.file ?? "staged"}${finding.line ? `:${finding.line}` : ""} — ${finding.title}`);
      console.log(`  ${finding.suggestion}`);
    }

    if (config.blockCommitOnHighSeverity !== false && hasBlockingFinding(findings)) {
      console.error("\n❌ CodeGuardian blocked commit: high/critical security/quality findings detected in staged changes.");
      console.error("Fix the findings, or run `git commit --no-verify` to bypass.\n");
      process.exitCode = 1;
    }
  } catch (err) {
    // Fail-open strategy: don't break developer commit flow if hook environment has issues
    console.log(`CodeGuardian pre-commit runner warning: ${String(err)}`);
  }
}

async function getBackendFindings(config: HookConfig, repositoryPath: string, commit: string, diff: string, localFindings: Finding[]): Promise<Finding[]> {
  if (!config.beBaseUrl || typeof fetch !== "function") return [];
  try {
    const response = await fetch(`${config.beBaseUrl.replace(/\/$/, "")}/api/extension/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.CODEGUARDIAN_BE_TOKEN ? { "X-CodeGuardian-Token": process.env.CODEGUARDIAN_BE_TOKEN } : {})
      },
      body: JSON.stringify({ repositoryPath, commit, diff: diff.slice(0, 60_000), files: [], localFindings }),
      signal: AbortSignal.timeout(3_000)
    });
    return response.ok ? (((await response.json()) as { suggestions?: Finding[] }).suggestions ?? []) : [];
  } catch {
    return [];
  }
}

function dedupe(findings: Finding[]): Finding[] {
  const seen = new Set<string>();
  return findings.filter((f) => {
    const k = `${f.file ?? ""}:${f.line ?? 0}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

void main();
