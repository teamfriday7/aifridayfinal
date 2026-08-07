import * as vscode from "vscode";
import { ReviewStateManager } from "../stateManager";
import { ReviewSession } from "../types";

export class HistoryItem extends vscode.TreeItem {
  constructor(public readonly session: ReviewSession) {
    super(`Review ${session.timestamp}`, vscode.TreeItemCollapsibleState.None);

    const highCount = session.findings.filter((f) => f.severity === "high" || f.severity === "critical").length;
    this.description = `[${session.mode.toUpperCase()}] ${session.findings.length} findings (${highCount} high)`;
    this.tooltip = `Commit: ${session.commit.slice(0, 12)}\nMode: ${session.mode}\nPassed: ${session.passed ? "Yes" : "No"}\nSummary: ${session.summary}`;

    if (session.passed) {
      this.iconPath = new vscode.ThemeIcon("pass", new vscode.ThemeColor("testing.iconPassed"));
    } else {
      this.iconPath = new vscode.ThemeIcon("error", new vscode.ThemeColor("testing.iconFailed"));
    }

    this.command = {
      command: "codeguardian.openReviewStudio",
      title: "View Session"
    };
  }
}

export class HistoryTreeProvider implements vscode.TreeDataProvider<HistoryItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<HistoryItem | undefined | void> = new vscode.EventEmitter<HistoryItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<HistoryItem | undefined | void> = this._onDidChangeTreeData.event;

  constructor() {
    ReviewStateManager.getInstance().onDidChangeState(() => this.refresh());
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: HistoryItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: HistoryItem): vscode.ProviderResult<HistoryItem[]> {
    if (element) return [];

    const sessions = ReviewStateManager.getInstance().sessions;
    return sessions.map((session) => new HistoryItem(session));
  }
}
