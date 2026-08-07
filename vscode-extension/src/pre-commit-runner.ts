/* Executed by the installed Git pre-commit hook, outside the VS Code extension host. */
import { execFileSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { analyzeDiff, hasBlockingFinding } from "./analyzer";
import { Finding } from "./types";

type HookConfig = { beBaseUrl?: string; blockCommitOnHighSeverity?: boolean };

function git(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8", maxBuffer: 5 * 1024 * 1024 }).trim();
}

async function main(): Promise<void> {
  const root = git(["rev-parse", "--show-toplevel"]);
  const hooks = git(["rev-parse", "--git-path", "hooks"]);
  const configPath = path.join(root, hooks, "codeguardian-config.json");
  const config: HookConfig = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, "utf8")) : {};

  // Analyze staged changes
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
  const findings = [...localFindings, ...backendFindings];

  console.log(`CodeGuardian pre-commit review: ${findings.length} finding(s) in staged changes.`);
  for (const finding of findings) {
    console.log(`[${finding.severity.toUpperCase()}] ${finding.file ?? "staged"}${finding.line ? `:${finding.line}` : ""} — ${finding.title}`);
    console.log(`  ${finding.suggestion}`);
  }

  if (config.blockCommitOnHighSeverity !== false && hasBlockingFinding(findings)) {
    console.error("CodeGuardian blocked commit: high or critical security/quality findings detected in staged changes.");
    console.error("Fix the findings, or run `git commit --no-verify` to bypass.");
    process.exitCode = 1;
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
      signal: AbortSignal.timeout(8_000)
    });
    return response.ok ? (((await response.json()) as { suggestions?: Finding[] }).suggestions ?? []) : [];
  } catch {
    return [];
  }
}

void main();
