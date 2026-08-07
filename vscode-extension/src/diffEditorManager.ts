import * as path from "path";
import * as vscode from "vscode";
import { ReviewStateManager } from "./stateManager";

export class DiffEditorManager {
  private _highSeverityDecoration: vscode.TextEditorDecorationType;
  private _mediumSeverityDecoration: vscode.TextEditorDecorationType;

  constructor() {
    this._highSeverityDecoration = vscode.window.createTextEditorDecorationType({
      backgroundColor: "rgba(255, 0, 0, 0.15)",
      isWholeLine: true,
      overviewRulerColor: "red",
      overviewRulerLane: vscode.OverviewRulerLane.Right
    });

    this._mediumSeverityDecoration = vscode.window.createTextEditorDecorationType({
      backgroundColor: "rgba(255, 165, 0, 0.15)",
      isWholeLine: true,
      overviewRulerColor: "orange",
      overviewRulerLane: vscode.OverviewRulerLane.Right
    });

    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) this.updateEditorDecorations(editor);
    });

    vscode.workspace.onDidChangeTextDocument((event) => {
      const active = vscode.window.activeTextEditor;
      if (active && active.document === event.document) {
        this.updateEditorDecorations(active);
      }
    });

    ReviewStateManager.getInstance().onDidChangeState(() => {
      const active = vscode.window.activeTextEditor;
      if (active) this.updateEditorDecorations(active);
    });
  }

  public updateEditorDecorations(editor: vscode.TextEditor): void {
    const folder = vscode.workspace.getWorkspaceFolder(editor.document.uri);
    if (!folder) return;

    const relativePath = path.relative(folder.uri.fsPath, editor.document.uri.fsPath).replace(/\\/g, "/");
    const activeFindings = ReviewStateManager.getInstance().activeFindings;

    const fileFindings = activeFindings.filter(
      (f) => f.file === relativePath || (f.file && relativePath.endsWith(f.file))
    );

    const highRanges: vscode.Range[] = [];
    const mediumRanges: vscode.Range[] = [];

    for (const finding of fileFindings) {
      if (!finding.line) continue;
      const lineIndex = Math.max(0, finding.line - 1);
      const range = new vscode.Range(lineIndex, 0, lineIndex, 1000);

      if (finding.severity === "high" || finding.severity === "critical") {
        highRanges.push(range);
      } else {
        mediumRanges.push(range);
      }
    }

    editor.setDecorations(this._highSeverityDecoration, highRanges);
    editor.setDecorations(this._mediumSeverityDecoration, mediumRanges);
  }

  public dispose(): void {
    this._highSeverityDecoration.dispose();
    this._mediumSeverityDecoration.dispose();
  }
}
