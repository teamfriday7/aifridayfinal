import * as path from "path";
import * as vscode from "vscode";
import { ReviewStateManager } from "./stateManager";
import { Finding } from "./types";

export class CodeGuardianQuickFixProvider implements vscode.CodeActionProvider {
  public static readonly providedCodeActionKinds = [vscode.CodeActionKind.QuickFix];

  public provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext
  ): vscode.CodeAction[] {
    const folder = vscode.workspace.getWorkspaceFolder(document.uri);
    if (!folder) return [];

    const relativePath = path.relative(folder.uri.fsPath, document.uri.fsPath).replace(/\\/g, "/");
    const activeFindings = ReviewStateManager.getInstance().activeFindings;
    const fileFindings = activeFindings.filter(
      (f) =>
        (f.file === relativePath || (f.file && relativePath.endsWith(f.file))) &&
        f.line &&
        Math.max(0, f.line - 1) === range.start.line
    );

    const actions: vscode.CodeAction[] = [];

    for (const finding of fileFindings) {
      actions.push(
        this.createCodeAction("🛡️ CodeGuardian: Accept AI Suggestion", "codeguardian.acceptFinding", finding, true),
        this.createCodeAction("❌ CodeGuardian: Reject Finding", "codeguardian.rejectFinding", finding),
        this.createCodeAction("✏️ CodeGuardian: Rewrite Fix with AI", "codeguardian.rewriteFinding", finding),
        this.createCodeAction("💡 CodeGuardian: Explain Security/Quality Details", "codeguardian.explainFinding", finding),
        this.createCodeAction("👁️ CodeGuardian: Ignore This Finding", "codeguardian.ignoreFinding", finding)
      );
    }

    return actions;
  }

  private createCodeAction(title: string, command: string, finding: Finding, isPreferred = false): vscode.CodeAction {
    const action = new vscode.CodeAction(title, vscode.CodeActionKind.QuickFix);
    action.command = {
      command,
      title,
      arguments: [finding]
    };
    action.isPreferred = isPreferred;
    return action;
  }
}
