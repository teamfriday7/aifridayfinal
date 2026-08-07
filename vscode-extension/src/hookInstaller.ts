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

  let existing = "#!/bin/sh\n";
  try {
    existing = await fs.readFile(hookPath, "utf8");
  } catch {
    /* new hook script */
  }

  if (!existing.includes(PRE_PUSH_MARKER)) {
    const runner = path.join(extensionPath, "dist", "pre-push-runner.js").replace(/\\/g, "/");
    existing += `\n${PRE_PUSH_MARKER}\nnode "${runner}" "$@"\n`;
    await fs.writeFile(hookPath, existing, { mode: 0o755 });
  }
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

  let existing = "#!/bin/sh\n";
  try {
    existing = await fs.readFile(hookPath, "utf8");
  } catch {
    /* new hook script */
  }

  if (!existing.includes(PRE_COMMIT_MARKER)) {
    const runner = path.join(extensionPath, "dist", "pre-commit-runner.js").replace(/\\/g, "/");
    existing += `\n${PRE_COMMIT_MARKER}\nnode "${runner}" "$@"\n`;
    await fs.writeFile(hookPath, existing, { mode: 0o755 });
  }
  return hookPath;
}
