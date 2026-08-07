import * as path from "path";
import * as vscode from "vscode";
import { ReviewStateManager } from "./stateManager";

export class CodeGuardianCodeLensProvider implements vscode.CodeLensProvider {
  private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

  constructor() {
    ReviewStateManager.getInstance().onDidChangeState(() => this._onDidChangeCodeLenses.fire());
  }

  public provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    const folder = vscode.workspace.getWorkspaceFolder(document.uri);
    if (!folder) return [];

    const relativePath = path.relative(folder.uri.fsPath, document.uri.fsPath).replace(/\\/g, "/");
    const activeFindings = ReviewStateManager.getInstance().activeFindings;
    const fileFindings = activeFindings.filter(
      (f) => f.file === relativePath || (f.file && relativePath.endsWith(f.file))
    );

    const codeLenses: vscode.CodeLens[] = [];

    for (const finding of fileFindings) {
      if (!finding.line) continue;
      const lineIndex = Math.max(0, finding.line - 1);
      const range = new vscode.Range(lineIndex, 0, lineIndex, 0);

      // Add CodeLens title header
      codeLenses.push(
        new vscode.CodeLens(range, {
          title: `🛡️ CodeGuardian: ${finding.title} [${finding.severity.toUpperCase()}]`,
          command: "codeguardian.explainFinding",
          arguments: [finding]
        }),
        new vscode.CodeLens(range, {
          title: "✅ Accept",
          command: "codeguardian.acceptFinding",
          arguments: [finding]
        }),
        new vscode.CodeLens(range, {
          title: "❌ Reject",
          command: "codeguardian.rejectFinding",
          arguments: [finding]
        }),
        new vscode.CodeLens(range, {
          title: "✏️ Rewrite with AI",
          command: "codeguardian.rewriteFinding",
          arguments: [finding]
        }),
        new vscode.CodeLens(range, {
          title: "💡 Explain",
          command: "codeguardian.explainFinding",
          arguments: [finding]
        }),
        new vscode.CodeLens(range, {
          title: "👁️ Ignore",
          command: "codeguardian.ignoreFinding",
          arguments: [finding]
        })
      );
    }

    return codeLenses;
  }
}
