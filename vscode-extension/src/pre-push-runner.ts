/* Executed by the installed Git hook, outside the VS Code extension host. */
import { execFileSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { analyzeDiff, hasBlockingFinding } from "./analyzer";
import { Finding } from "./types";

type HookConfig = { beBaseUrl?: string; blockPushOnHighSeverity?: boolean };

function git(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8", maxBuffer: 2 * 1024 * 1024 }).trim();
}

async function main(): Promise<void> {
  const root = git(["rev-parse", "--show-toplevel"]);
  const hooks = git(["rev-parse", "--git-path", "hooks"]);
  const configPath = path.join(root, hooks, "codeguardian-config.json");
  const config: HookConfig = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, "utf8")) : {};
  const refs = fs.readFileSync(0, "utf8").trim().split(/\r?\n/).filter(Boolean);
  const localShas = refs.map((ref) => ref.split(/\s+/)[1]).filter((sha) => /^[0-9a-f]{40}$/i.test(sha));
  const target = localShas[0] ?? "HEAD";
  let diff = "";
  try { diff = git(["diff", "--unified=0", `${target}~1`, target]); } catch { diff = git(["show", "--format=", "--unified=0", target]); }
  const localFindings = analyzeDiff(diff);
  const backendFindings = await getBackendFindings(config, root, target, diff, localFindings);
  const findings = [...localFindings, ...backendFindings];
  console.log(`CodeGuardian pre-push review: ${findings.length} finding(s).`);
  for (const finding of findings) console.log(`[${finding.severity.toUpperCase()}] ${finding.title} — ${finding.suggestion}`);
  if (config.blockPushOnHighSeverity !== false && hasBlockingFinding(findings)) {
    console.error("CodeGuardian blocked the push because high-severity findings need review. Fix them, or turn off codeguardian.blockPushOnHighSeverity for this repository.");
    process.exitCode = 1;
  }
}

async function getBackendFindings(config: HookConfig, repositoryPath: string, commit: string, diff: string, localFindings: Finding[]): Promise<Finding[]> {
  if (!config.beBaseUrl || typeof fetch !== "function") return [];
  try {
    const response = await fetch(`${config.beBaseUrl.replace(/\/$/, "")}/api/extension/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(process.env.CODEGUARDIAN_BE_TOKEN ? { "X-CodeGuardian-Token": process.env.CODEGUARDIAN_BE_TOKEN } : {}) },
      body: JSON.stringify({ repositoryPath, commit, diff: diff.slice(0, 60_000), files: [], localFindings }),
      signal: AbortSignal.timeout(8_000)
    });
    return response.ok ? ((await response.json()) as { suggestions?: Finding[] }).suggestions ?? [] : [];
  } catch { return []; }
}

void main();
