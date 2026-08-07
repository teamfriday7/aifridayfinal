import * as crypto from "crypto";
import * as path from "path";
import * as vscode from "vscode";
import { ReviewStateManager } from "../stateManager";
import { Finding } from "../types";

export class ReviewStudioPanel {
  public static currentPanel: ReviewStudioPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    this._update();

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    ReviewStateManager.getInstance().onDidChangeState(() => {
      if (this._panel && this._panel.visible) {
        this._update();
      }
    }, null, this._disposables);

    this._panel.onDidChangeViewState(
      (e) => {
        if (e.webviewPanel.visible) {
          this._update();
        }
      },
      null,
      this._disposables
    );

    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case "accept":
            await vscode.commands.executeCommand("codeguardian.acceptFinding", message.finding);
            break;
          case "reject":
            await vscode.commands.executeCommand("codeguardian.rejectFinding", message.finding);
            break;
          case "rewrite":
            await vscode.commands.executeCommand("codeguardian.rewriteFinding", message.finding);
            break;
          case "explain":
            await vscode.commands.executeCommand("codeguardian.explainFinding", message.finding);
            break;
          case "ignore":
            await vscode.commands.executeCommand("codeguardian.ignoreFinding", message.finding);
            break;
          case "analyzeStaged":
            await vscode.commands.executeCommand("codeguardian.analyzeStaged");
            break;
          case "analyzeLatestCommit":
            await vscode.commands.executeCommand("codeguardian.analyzeLatestCommit");
            break;
          case "installHooks":
            await vscode.commands.executeCommand("codeguardian.installHooks");
            break;
        }
      },
      null,
      this._disposables
    );
  }

  public static createOrShow(extensionUri: vscode.Uri): void {
    const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

    if (ReviewStudioPanel.currentPanel) {
      ReviewStudioPanel.currentPanel._panel.reveal(column);
      return;
    }

    try {
      const panel = vscode.window.createWebviewPanel(
        "codeguardianReviewStudio",
        "CodeGuardian Review Studio",
        column || vscode.ViewColumn.One,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [extensionUri]
        }
      );

      ReviewStudioPanel.currentPanel = new ReviewStudioPanel(panel, extensionUri);
    } catch (err) {
      // Fall back gracefully to Markdown Review Report if VS Code webview host blocks Service Workers
      void vscode.commands.executeCommand("codeguardian.openReviewReport");
    }
  }

  private _update(): void {
    if (!this._panel) return;
    const webview = this._panel.webview;
    this._panel.title = "CodeGuardian Review Studio";
    this._panel.webview.html = this._getHtmlForWebview(webview);
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const state = ReviewStateManager.getInstance();
    const findings = state.activeFindings;
    const mode = state.activeMode;
    const sessions = state.sessions;
    const highCount = findings.filter((f) => f.severity === "high" || f.severity === "critical").length;
    const nonce = getNonce();

    const findingsHtml = findings.length
      ? findings
          .map(
            (finding, index) => `
        <div class="card severity-${finding.severity}">
          <div class="card-header">
            <span class="badge badge-${finding.severity}">${finding.severity.toUpperCase()}</span>
            <span class="file-path">${finding.file ?? "Workspace"}${finding.line ? `:${finding.line}` : ""}</span>
          </div>
          <div class="card-title">${escapeHtml(finding.title)}</div>
          <div class="card-message">${escapeHtml(finding.message)}</div>
          ${
            finding.originalCode
              ? `<div class="code-snippet original"><code>${escapeHtml(finding.originalCode)}</code></div>`
              : ""
          }
          <div class="card-suggestion">💡 <strong>Suggestion:</strong> ${escapeHtml(finding.suggestion)}</div>
          <div class="actions">
            <button class="btn btn-accept" data-cmd="accept" data-idx="${index}">✅ Accept</button>
            <button class="btn btn-reject" data-cmd="reject" data-idx="${index}">❌ Reject</button>
            <button class="btn btn-rewrite" data-cmd="rewrite" data-idx="${index}">✏️ Rewrite</button>
            <button class="btn btn-explain" data-cmd="explain" data-idx="${index}">💡 Explain</button>
            <button class="btn btn-ignore" data-cmd="ignore" data-idx="${index}">👁️ Ignore</button>
          </div>
        </div>
      `
          )
          .join("")
      : `<div class="empty-state">🎉 No active findings. Your staged/committed changes look clean!</div>`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CodeGuardian Review Studio</title>
  <style>
    body {
      font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
      background-color: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
      padding: 20px;
      margin: 0;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--vscode-widget-border, #333);
      margin-bottom: 20px;
    }
    .title-area h2 {
      margin: 0;
      font-size: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .mode-badge {
      font-size: 11px;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      padding: 3px 8px;
      border-radius: 12px;
      text-transform: uppercase;
      font-weight: 600;
    }
    .top-actions {
      display: flex;
      gap: 10px;
    }
    .btn {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      padding: 7px 14px;
      font-size: 12px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
    }
    .btn:hover {
      background: var(--vscode-button-hoverBackground);
    }
    .btn-secondary {
      background: var(--vscode-button-secondaryBackground, #3a3d41);
      color: var(--vscode-button-secondaryForeground, #fff);
    }
    .status-summary {
      display: flex;
      gap: 16px;
      margin-bottom: 20px;
    }
    .summary-card {
      background: var(--vscode-editor-inactiveSelectionBackground, #252526);
      padding: 12px 18px;
      border-radius: 6px;
      flex: 1;
      border-left: 4px solid #007acc;
    }
    .summary-card.warn {
      border-left-color: #f14c4c;
    }
    .card {
      background: var(--vscode-sideBar-background, #1e1e1e);
      border: 1px solid var(--vscode-widget-border, #333);
      border-radius: 6px;
      padding: 16px;
      margin-bottom: 16px;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .badge {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 3px;
    }
    .badge-critical, .badge-high { background: #f14c4c; color: #fff; }
    .badge-medium { background: #cca700; color: #000; }
    .badge-low, .badge-info { background: #3794ff; color: #fff; }
    .file-path { font-family: monospace; font-size: 12px; opacity: 0.8; }
    .card-title { font-weight: 600; font-size: 14px; margin-bottom: 6px; }
    .card-message { font-size: 13px; margin-bottom: 10px; opacity: 0.9; }
    .card-suggestion { font-size: 12px; background: rgba(255,255,255,0.05); padding: 8px 12px; border-radius: 4px; margin-bottom: 12px; }
    .code-snippet { font-family: monospace; font-size: 12px; background: #000; padding: 8px; border-radius: 4px; margin-bottom: 10px; overflow-x: auto; }
    .actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .btn-accept { background: #2e7d32; }
    .btn-reject { background: #c62828; }
    .btn-rewrite { background: #0277bd; }
    .btn-explain { background: #6a1b9a; }
    .btn-ignore { background: #424242; }
    .empty-state { text-align: center; padding: 40px; font-size: 15px; opacity: 0.8; }
  </style>
</head>
<body>
  <div class="header">
    <div class="title-area">
      <h2>🛡️ CodeGuardian Review Studio <span class="mode-badge">${mode}</span></h2>
    </div>
    <div class="top-actions">
      <button class="btn" id="btnStaged">🔍 Pre-Commit Review</button>
      <button class="btn" id="btnPush">🚀 Pre-Push Review</button>
      <button class="btn btn-secondary" id="btnHooks">🔌 Install Git Hooks</button>
    </div>
  </div>

  <div class="status-summary">
    <div class="summary-card ${highCount > 0 ? "warn" : ""}">
      <div style="font-size:12px; opacity:0.8;">Active Findings</div>
      <div style="font-size:22px; font-weight:bold;">${findings.length}</div>
    </div>
    <div class="summary-card ${highCount > 0 ? "warn" : ""}">
      <div style="font-size:12px; opacity:0.8;">Critical / High Risk</div>
      <div style="font-size:22px; font-weight:bold;">${highCount}</div>
    </div>
    <div class="summary-card">
      <div style="font-size:12px; opacity:0.8;">Audit Sessions</div>
      <div style="font-size:22px; font-weight:bold;">${sessions.length}</div>
    </div>
  </div>

  <h3>Findings & Suggestions</h3>
  ${findingsHtml}

  <script nonce="${nonce}">
    (function() {
      const vscode = acquireVsCodeApi();
      const rawFindings = ${JSON.stringify(findings)};

      document.addEventListener('click', function(e) {
        const target = e.target;
        if (!target || !target.classList) return;
        
        if (target.id === 'btnStaged') {
          vscode.postMessage({ command: 'analyzeStaged' });
        } else if (target.id === 'btnPush') {
          vscode.postMessage({ command: 'analyzeLatestCommit' });
        } else if (target.id === 'btnHooks') {
          vscode.postMessage({ command: 'installHooks' });
        } else if (target.hasAttribute('data-cmd')) {
          const cmd = target.getAttribute('data-cmd');
          const idx = parseInt(target.getAttribute('data-idx') || '0', 10);
          vscode.postMessage({ command: cmd, finding: rawFindings[idx] });
        }
      });
    })();
  </script>
</body>
</html>`;
  }

  public dispose(): void {
    ReviewStudioPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) x.dispose();
    }
  }
}

function getNonce(): string {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
