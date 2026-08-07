import * as path from "path";
import * as vscode from "vscode";
import { ReviewStateManager } from "../stateManager";
import { Finding, Severity } from "../types";

export type FindingTreeElement = SeverityGroupItem | FindingItem;

export class SeverityGroupItem extends vscode.TreeItem {
  constructor(public readonly severity: Severity, public readonly count: number) {
    super(`${severity.toUpperCase()} (${count})`, vscode.TreeItemCollapsibleState.Expanded);
    this.contextValue = "severityGroup";

    switch (severity) {
      case "critical":
      case "high":
        this.iconPath = new vscode.ThemeIcon("error", new vscode.ThemeColor("problemsErrorIcon.foreground"));
        break;
      case "medium":
        this.iconPath = new vscode.ThemeIcon("warning", new vscode.ThemeColor("problemsWarningIcon.foreground"));
        break;
      default:
        this.iconPath = new vscode.ThemeIcon("info", new vscode.ThemeColor("problemsInfoIcon.foreground"));
        break;
    }
  }
}

export class FindingItem extends vscode.TreeItem {
  constructor(public readonly finding: Finding) {
    super(finding.title, vscode.TreeItemCollapsibleState.None);
    this.contextValue = "findingItem";
    this.description = `${finding.file ?? "Workspace"}${finding.line ? `:${finding.line}` : ""}`;
    this.tooltip = `${finding.title}\n${finding.message}\nSuggestion: ${finding.suggestion}`;

    switch (finding.severity) {
      case "critical":
      case "high":
        this.iconPath = new vscode.ThemeIcon("shield", new vscode.ThemeColor("errorForeground"));
        break;
      case "medium":
        this.iconPath = new vscode.ThemeIcon("issue-opened", new vscode.ThemeColor("editorWarning.foreground"));
        break;
      default:
        this.iconPath = new vscode.ThemeIcon("lightbulb", new vscode.ThemeColor("editorInfo.foreground"));
        break;
    }

    const folder = vscode.workspace.workspaceFolders?.[0];
    if (finding.file && folder) {
      const uri = vscode.Uri.file(path.join(folder.uri.fsPath, finding.file));
      const line = Math.max(0, (finding.line ?? 1) - 1);
      this.command = {
        command: "vscode.open",
        title: "Go to Finding",
        arguments: [uri, { selection: new vscode.Range(line, 0, line, 100) }]
      };
    }
  }
}

export class FindingsTreeProvider implements vscode.TreeDataProvider<FindingTreeElement> {
  private _onDidChangeTreeData: vscode.EventEmitter<FindingTreeElement | undefined | void> = new vscode.EventEmitter<FindingTreeElement | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<FindingTreeElement | undefined | void> = this._onDidChangeTreeData.event;

  constructor() {
    ReviewStateManager.getInstance().onDidChangeState(() => this.refresh());
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: FindingTreeElement): vscode.TreeItem {
    return element;
  }

  getChildren(element?: FindingTreeElement): vscode.ProviderResult<FindingTreeElement[]> {
    const findings = ReviewStateManager.getInstance().activeFindings;

    if (!element) {
      const severities: Severity[] = ["critical", "high", "medium", "low", "info"];
      const groups: SeverityGroupItem[] = [];

      for (const sev of severities) {
        const count = findings.filter((f) => f.severity === sev).length;
        if (count > 0) {
          groups.push(new SeverityGroupItem(sev, count));
        }
      }
      return groups;
    }

    if (element instanceof SeverityGroupItem) {
      return findings
        .filter((f) => f.severity === element.severity)
        .map((f) => new FindingItem(f));
    }

    return [];
  }
}
