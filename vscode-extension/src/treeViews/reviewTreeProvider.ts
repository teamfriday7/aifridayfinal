import * as path from "path";
import * as vscode from "vscode";
import { filesInDiff, latestCommitDiff, stagedDiff, unpushedDiff } from "../git";
import { ReviewStateManager } from "../stateManager";

export class FileReviewItem extends vscode.TreeItem {
  constructor(
    public readonly filePath: string,
    public readonly statusLabel: string,
    public readonly findingCount: number,
    public readonly hasBlocking: boolean,
    public readonly rootFolder: string
  ) {
    super(path.basename(filePath), vscode.TreeItemCollapsibleState.None);

    this.description = `${statusLabel}${findingCount > 0 ? ` • ${findingCount} finding(s)` : ""}`;
    this.tooltip = `${filePath} — ${statusLabel}`;

    if (hasBlocking) {
      this.iconPath = new vscode.ThemeIcon("warning", new vscode.ThemeColor("list.warningForeground"));
    } else if (findingCount > 0) {
      this.iconPath = new vscode.ThemeIcon("info", new vscode.ThemeColor("list.highlightForeground"));
    } else {
      this.iconPath = new vscode.ThemeIcon("file-code");
    }

    const uri = vscode.Uri.file(path.join(rootFolder, filePath));
    this.command = {
      command: "vscode.open",
      title: "Open File",
      arguments: [uri]
    };
  }
}

export class ReviewTreeProvider implements vscode.TreeDataProvider<FileReviewItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<FileReviewItem | undefined | void> = new vscode.EventEmitter<FileReviewItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<FileReviewItem | undefined | void> = this._onDidChangeTreeData.event;

  constructor() {
    ReviewStateManager.getInstance().onDidChangeState(() => this.refresh());
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: FileReviewItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: FileReviewItem): Promise<FileReviewItem[]> {
    if (element) return [];

    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) return [];

    const root = folder.uri.fsPath;
    const state = ReviewStateManager.getInstance();
    const activeFindings = state.activeFindings;

    const [staged, unpushed, latest] = await Promise.all([
      stagedDiff(root).catch(() => ""),
      unpushedDiff(root).catch(() => ""),
      latestCommitDiff(root).catch(() => "")
    ]);

    const stagedFiles = filesInDiff(staged);
    const unpushedFiles = filesInDiff(unpushed);
    const latestFiles = filesInDiff(latest);

    const allFiles = Array.from(new Set([...stagedFiles, ...unpushedFiles, ...latestFiles]));
    if (allFiles.length === 0) {
      return [];
    }

    return allFiles.map((file) => {
      const fileFindings = activeFindings.filter((f) => f.file === file || (f.file && f.file.endsWith(file)));
      const count = fileFindings.length;
      const blocking = fileFindings.some((f) => f.severity === "high" || f.severity === "critical");
      const isStaged = stagedFiles.includes(file);
      const isUnpushed = unpushedFiles.includes(file);
      const statusLabel = isStaged ? "Staged" : isUnpushed ? "Unpushed" : "Committed";

      return new FileReviewItem(file, statusLabel, count, blocking, root);
    });
  }
}
