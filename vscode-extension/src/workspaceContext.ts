import * as fs from "fs/promises";
import * as path from "path";
import * as vscode from "vscode";
import { findGitRoot, stagedDiff, unpushedDiff } from "./git";
import { ReviewStateManager } from "./stateManager";

export interface WorkspaceContext {
  repositoryPath: string;
  activeFile?: string;
  selection?: string;
  projectManifest?: string;
  gitDiff?: string;
  findingsCount: number;
  findingsSummary: string;
}

export class WorkspaceContextRetriever {
  public static async getWorkspaceContext(): Promise<WorkspaceContext> {
    const editor = vscode.window.activeTextEditor;
    const folder = editor
      ? vscode.workspace.getWorkspaceFolder(editor.document.uri)
      : vscode.workspace.workspaceFolders?.[0];

    const rootPath = folder ? folder.uri.fsPath : process.cwd();
    const repoPath = await findGitRoot(rootPath);

    // Active File & Selection Context
    let relativeActiveFile: string | undefined;
    let selectedText: string | undefined;

    if (editor) {
      relativeActiveFile = path.relative(repoPath, editor.document.uri.fsPath).replace(/\\/g, "/");
      const sel = editor.selection;
      if (!sel.isEmpty) {
        selectedText = editor.document.getText(sel);
      } else {
        selectedText = editor.document.getText().slice(0, 2000);
      }
    }

    // Read Key Project Manifests
    const manifest = await this.readProjectManifest(repoPath);

    // Read Staged/Unpushed Diffs
    let diff = await stagedDiff(repoPath).catch(() => "");
    if (!diff) {
      diff = await unpushedDiff(repoPath).catch(() => "");
    }

    // Active Findings Summary
    const findings = ReviewStateManager.getInstance().activeFindings;
    const findingsSummary = findings.map((f) => `[${f.severity.toUpperCase()}] ${f.file}:${f.line} - ${f.title}`).join("; ");

    return {
      repositoryPath: repoPath,
      activeFile: relativeActiveFile,
      selection: selectedText,
      projectManifest: manifest,
      gitDiff: diff.slice(0, 8000),
      findingsCount: findings.length,
      findingsSummary: findingsSummary.slice(0, 1000)
    };
  }

  private static async readProjectManifest(repoPath: string): Promise<string> {
    const manifestNames = [
      "package.json",
      "requirements.txt",
      "pyproject.toml",
      "tsconfig.json",
      "README.md",
      "pom.xml",
      "go.mod",
      "Cargo.toml"
    ];

    for (const name of manifestNames) {
      const full = path.join(repoPath, name);
      try {
        const content = await fs.readFile(full, "utf8");
        return `[${name}]\n${content.slice(0, 1500)}`;
      } catch {
        /* try next manifest */
      }
    }
    return "Standard Repository Project";
  }
}
