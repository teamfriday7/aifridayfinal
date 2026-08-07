/* Executed by the installed Git pre-push hook, outside the VS Code extension host. */
import { execFileSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { analyzeDiff, hasBlockingFinding } from "./analyzer";
import { Finding } from "./types";

type HookConfig = { beBaseUrl?: string; blockPushOnHighSeverity?: boolean };

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

    let refs: string[] = [];
    try {
      refs = fs.readFileSync(0, "utf8").trim().split(/\r?\n/).filter(Boolean);
    } catch {
      /* no stdin refs */
    }

    const localShas = refs.map((ref) => ref.split(/\s+/)[1]).filter((sha) => /^[0-9a-f]{40}$/i.test(sha));
    const target = localShas[0] ?? "HEAD";

    let diff = "";
    try {
      diff = git(["diff", "--unified=0", `${target}~1`, target]);
    } catch {
      try {
        diff = git(["show", "--format=", "--unified=0", target]);
      } catch {
        diff = "";
      }
    }

    const localFindings = analyzeDiff(diff);
    const backendFindings = await getBackendFindings(config, root, target, diff, localFindings);
    const rawFindings = dedupe([...localFindings, ...backendFindings]);

    const findings = rawFindings.filter((f) => {
      const key1 = `${f.file}:${f.line}`;
      const key2 = `${f.title}:${f.file}:${f.line}`;
      const key3 = f.title;
      return !ignoredSet.has(key1) && !ignoredSet.has(key2) && !ignoredSet.has(key3);
    });

    if (findings.length === 0) {
      console.log("CodeGuardian pre-push review: Unpushed commits clean (0 active findings).");
      return;
    }

    console.log(`CodeGuardian pre-push review: ${findings.length} finding(s).`);
    for (const finding of findings) {
      console.log(`[${finding.severity.toUpperCase()}] ${finding.file ?? "push"}${finding.line ? `:${finding.line}` : ""} — ${finding.title}`);
      console.log(`  ${finding.suggestion}`);
    }

    if (config.blockPushOnHighSeverity !== false && hasBlockingFinding(findings)) {
      console.error("\n❌ CodeGuardian blocked push: high/critical findings detected. Resolve issues or run `git push --no-verify` to bypass.\n");
      process.exitCode = 1;
    }
  } catch (err) {
    console.log(`CodeGuardian pre-push runner warning: ${String(err)}`);
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
