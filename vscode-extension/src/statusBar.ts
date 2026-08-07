import * as vscode from "vscode";
import { ReviewStateManager } from "./stateManager";

export class CodeGuardianStatusBar {
  private _item: vscode.StatusBarItem;

  constructor() {
    this._item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this._item.command = "codeguardian.openReviewStudio";
    this.update();

    ReviewStateManager.getInstance().onDidChangeState(() => this.update());
  }

  public update(): void {
    const state = ReviewStateManager.getInstance();
    const findings = state.activeFindings;
    const highCount = findings.filter((f) => f.severity === "high" || f.severity === "critical").length;

    if (findings.length === 0) {
      this._item.text = "$(shield) CodeGuardian: Ready";
      this._item.tooltip = "CodeGuardian Code Review: Clean (No active findings). Click to open Review Studio.";
      this._item.backgroundColor = undefined;
    } else if (highCount > 0) {
      this._item.text = `$(warning) CodeGuardian: ${highCount} Critical/High (${findings.length} total)`;
      this._item.tooltip = `CodeGuardian: ${highCount} blocking issues found! Click to review.`;
      this._item.backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground");
    } else {
      this._item.text = `$(info) CodeGuardian: ${findings.length} suggestion(s)`;
      this._item.tooltip = `CodeGuardian: ${findings.length} suggestion(s) available. Click to review.`;
      this._item.backgroundColor = undefined;
    }

    this._item.show();
  }

  public dispose(): void {
    this._item.dispose();
  }
}
