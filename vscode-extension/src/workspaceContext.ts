import * as fs from "fs/promises";
import * as path from "path";
import * as vscode from "vscode";
import { findGitRoot, git, stagedDiff, unpushedDiff } from "./git";
import { ReviewStateManager } from "./stateManager";

export interface WorkspaceContext {
  repositoryPath: string;
  activeFile?: string;
  selection?: string;
  projectManifest?: string;
  gitDiff?: string;
  branchName?: string;
  findingsCount: number;
  findingsSummary: string;
  workspaceFolders: string[];
}

export class WorkspaceContextRetriever {
  public static async getWorkspaceContext(): Promise<WorkspaceContext> {
    const editor = vscode.window.activeTextEditor;
    const folder = editor
      ? vscode.workspace.getWorkspaceFolder(editor.document.uri)
      : vscode.workspace.workspaceFolders?.[0];

    const rootPath = folder ? folder.uri.fsPath : process.cwd();
    const repoPath = await findGitRoot(rootPath);

    const allWorkspaceFolders = (vscode.workspace.workspaceFolders ?? []).map((f) => f.uri.fsPath);

    // Active File & Selection Context
    let relativeActiveFile: string | undefined;
    let selectedText: string | undefined;

    if (editor) {
      relativeActiveFile = path.relative(repoPath, editor.document.uri.fsPath).replace(/\\/g, "/");
      const sel = editor.selection;
      if (!sel.isEmpty) {
        selectedText = editor.document.getText(sel);
      } else {
        selectedText = editor.document.getText().slice(0, 2500);
      }
    }

    // Git Branch Name
    let branchName = "main";
    try {
      branchName = await git(repoPath, ["rev-parse", "--abbrev-ref", "HEAD"]);
    } catch {
      /* ignore branch resolution error */
    }

    // Read Key Project Manifests (aggregating multiple if available)
    const manifest = await this.readProjectManifests(repoPath);

    // Read Staged/Unpushed Diffs
    let diff = await stagedDiff(repoPath).catch(() => "");
    if (!diff) {
      diff = await unpushedDiff(repoPath).catch(() => "");
    }

    // Active Findings Summary
    const findings = ReviewStateManager.getInstance().activeFindings;
    const findingsSummary = findings
      .map((f) => `[${f.severity.toUpperCase()}] ${f.file ?? "Workspace"}:${f.line ?? 1} - ${f.title}`)
      .join("; ");

    return {
      repositoryPath: repoPath,
      activeFile: relativeActiveFile,
      selection: selectedText,
      projectManifest: manifest,
      gitDiff: diff.slice(0, 10_000),
      branchName,
      findingsCount: findings.length,
      findingsSummary: findingsSummary.slice(0, 1500),
      workspaceFolders: allWorkspaceFolders
    };
  }

  private static async readProjectManifests(repoPath: string): Promise<string> {
    const manifestNames = [
      "package.json",
      "requirements.txt",
      "pyproject.toml",
      "tsconfig.json",
      "README.md",
      "pom.xml",
      "go.mod",
      "Cargo.toml",
      "Dockerfile"
    ];

    const results: string[] = [];
    for (const name of manifestNames) {
      const full = path.join(repoPath, name);
      try {
        const content = await fs.readFile(full, "utf8");
        results.push(`--- [${name}] ---\n${content.slice(0, 1000)}`);
        if (results.length >= 3) break;
      } catch {
        /* try next manifest */
      }
    }
    return results.length > 0 ? results.join("\n\n") : "Standard Repository Project";
  }
}

