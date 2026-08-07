import * as fs from "fs/promises";
import * as path from "path";
import * as vscode from "vscode";
import { findGitRoot } from "./git";

const PRE_PUSH_MARKER = "# CodeGuardian pre-push review";
const PRE_COMMIT_MARKER = "# CodeGuardian pre-commit review";

export async function installPrePushHook(repositoryRoot: string, extensionPath: string): Promise<string> {
  const repoRoot = await findGitRoot(repositoryRoot);
  const hooksPath = path.join(repoRoot, ".git", "hooks");
  const hookPath = path.join(hooksPath, "pre-push");
  const configPath = path.join(hooksPath, "codeguardian-config.json");
  const config = vscode.workspace.getConfiguration("codeguardian", vscode.Uri.file(repoRoot));

  await fs.mkdir(hooksPath, { recursive: true });
  await fs.writeFile(
    configPath,
    JSON.stringify(
      {
        beBaseUrl: config.get<string>("beBaseUrl"),
        blockPushOnHighSeverity: config.get<boolean>("blockPushOnHighSeverity"),
        blockCommitOnHighSeverity: config.get<boolean>("blockCommitOnHighSeverity", true)
      },
      null,
      2
    )
  );

  const runner = path.join(extensionPath, "dist", "pre-push-runner.js").replace(/\\/g, "/");
  let existing = "#!/bin/sh\n";
  try {
    existing = await fs.readFile(hookPath, "utf8");
  } catch {
    /* new hook script */
  }

  // Remove old CodeGuardian pre-push block if present
  const lines = existing.split(/\r?\n/).filter((line) => !line.includes(PRE_PUSH_MARKER) && !line.includes("pre-push-runner.js"));
  lines.push(PRE_PUSH_MARKER, `node "${runner}" "$@"`, "");

  await fs.writeFile(hookPath, lines.join("\n"), { mode: 0o755 });
  return hookPath;
}

export async function installPreCommitHook(repositoryRoot: string, extensionPath: string): Promise<string> {
  const repoRoot = await findGitRoot(repositoryRoot);
  const hooksPath = path.join(repoRoot, ".git", "hooks");
  const hookPath = path.join(hooksPath, "pre-commit");
  const configPath = path.join(hooksPath, "codeguardian-config.json");
  const config = vscode.workspace.getConfiguration("codeguardian", vscode.Uri.file(repoRoot));

  await fs.mkdir(hooksPath, { recursive: true });
  await fs.writeFile(
    configPath,
    JSON.stringify(
      {
        beBaseUrl: config.get<string>("beBaseUrl"),
        blockPushOnHighSeverity: config.get<boolean>("blockPushOnHighSeverity"),
        blockCommitOnHighSeverity: config.get<boolean>("blockCommitOnHighSeverity", true)
      },
      null,
      2
    )
  );

  const runner = path.join(extensionPath, "dist", "pre-commit-runner.js").replace(/\\/g, "/");
  let existing = "#!/bin/sh\n";
  try {
    existing = await fs.readFile(hookPath, "utf8");
  } catch {
    /* new hook script */
  }

  // Remove old CodeGuardian pre-commit block if present
  const lines = existing.split(/\r?\n/).filter((line) => !line.includes(PRE_COMMIT_MARKER) && !line.includes("pre-commit-runner.js"));
  lines.push(PRE_COMMIT_MARKER, `node "${runner}" "$@"`, "");

  await fs.writeFile(hookPath, lines.join("\n"), { mode: 0o755 });
  return hookPath;
}
