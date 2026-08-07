import * as fs from "fs/promises";
import * as path from "path";
import * as vscode from "vscode";
import { findGitRoot } from "./git";
import { Finding, FindingStatus, ReviewSession } from "./types";

export class ReviewStateManager {
  private static instance: ReviewStateManager;
  private _context?: vscode.ExtensionContext;
  private _activeFindings: Finding[] = [];
  private _sessions: ReviewSession[] = [];
  private _ignoredKeys: Set<string> = new Set();
  private _activeMode: "pre-commit" | "pre-push" | "on-demand" = "on-demand";

  private _onDidChangeState = new vscode.EventEmitter<void>();
  public readonly onDidChangeState = this._onDidChangeState.event;

  private constructor() {}

  public static getInstance(): ReviewStateManager {
    if (!ReviewStateManager.instance) {
      ReviewStateManager.instance = new ReviewStateManager();
    }
    return ReviewStateManager.instance;
  }

  public initialize(context: vscode.ExtensionContext): void {
    this._context = context;
    const savedIgnored = context.workspaceState.get<string[]>("codeguardian.ignoredKeys", []);
    this._ignoredKeys = new Set(savedIgnored);
    const savedSessions = context.workspaceState.get<ReviewSession[]>("codeguardian.sessions", []);
    this._sessions = savedSessions;
  }

  public get activeFindings(): Finding[] {
    return this._activeFindings.filter(
      (f) => f.status !== "ignored" && f.status !== "rejected" && f.status !== "accepted" && !this.isIgnored(f)
    );
  }

  public get allActiveFindings(): Finding[] {
    return [...this._activeFindings];
  }

  public get sessions(): ReviewSession[] {
    return [...this._sessions];
  }

  public get activeMode(): "pre-commit" | "pre-push" | "on-demand" {
    return this._activeMode;
  }

  public setReviewResults(
    findings: Finding[],
    mode: "pre-commit" | "pre-push" | "on-demand",
    repositoryPath: string,
    commit: string,
    summary: string,
    targetRef?: string
  ): void {
    this._activeMode = mode;
    this._activeFindings = findings.map((f) => ({
      ...f,
      status: this.isIgnored(f) ? "ignored" : "open"
    }));

    const session: ReviewSession = {
      id: `session-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      repositoryPath,
      commit,
      targetRef,
      mode,
      findings: [...this._activeFindings],
      summary,
      passed: !this._activeFindings.some((f) => f.severity === "high" || f.severity === "critical")
    };

    this._sessions.unshift(session);
    if (this._sessions.length > 20) {
      this._sessions = this._sessions.slice(0, 20);
    }

    if (this._context) {
      void this._context.workspaceState.update("codeguardian.sessions", this._sessions);
    }

    this._onDidChangeState.fire();
  }

  public updateFindingStatus(findingIdOrTitle: string, status: FindingStatus): void {
    const finding = this._activeFindings.find(
      (f) => (f.id && f.id === findingIdOrTitle) || `${f.title}:${f.file}:${f.line}` === findingIdOrTitle || f.title === findingIdOrTitle
    );
    if (finding) {
      finding.status = status;
      if (status === "ignored" || status === "rejected" || status === "accepted") {
        this.ignoreFinding(finding);
      }
      this._onDidChangeState.fire();
    }
  }

  public ignoreFinding(finding: Finding): void {
    const key1 = `${finding.file ?? ""}:${finding.line ?? ""}`;
    const key2 = `${finding.title}:${finding.file ?? ""}:${finding.line ?? ""}`;
    const key3 = finding.title;

    this._ignoredKeys.add(key1);
    this._ignoredKeys.add(key2);
    this._ignoredKeys.add(key3);

    finding.status = "ignored";

    if (this._context) {
      void this._context.workspaceState.update("codeguardian.ignoredKeys", Array.from(this._ignoredKeys));
    }

    void this.syncIgnoredKeysToGitHooks();
    this._onDidChangeState.fire();
  }

  public isIgnored(finding: Finding): boolean {
    const key1 = `${finding.file ?? ""}:${finding.line ?? ""}`;
    const key2 = `${finding.title}:${finding.file ?? ""}:${finding.line ?? ""}`;
    const key3 = finding.title;
    return this._ignoredKeys.has(key1) || this._ignoredKeys.has(key2) || this._ignoredKeys.has(key3);
  }

  private async syncIgnoredKeysToGitHooks(): Promise<void> {
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) return;
    try {
      const gitRoot = await findGitRoot(folder.uri.fsPath);
      const ignoredFile = path.join(gitRoot, ".git", "hooks", "codeguardian-ignored.json");
      await fs.writeFile(ignoredFile, JSON.stringify(Array.from(this._ignoredKeys), null, 2), "utf8");
    } catch {
      /* ignore sync error */
    }
  }

  public clear(): void {
    this._activeFindings = [];
    this._onDidChangeState.fire();
  }
}
