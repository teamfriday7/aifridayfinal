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
          case "resetIgnored":
            ReviewStateManager.getInstance().resetIgnoredKeys();
            vscode.window.showInformationMessage("Reset all ignored findings for workspace.");
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
      try {
        ReviewStudioPanel.currentPanel._panel.reveal(column);
        return;
      } catch {
        ReviewStudioPanel.currentPanel = undefined;
      }
    }

    try {
      const workspaceRoots = (vscode.workspace.workspaceFolders || []).map((f) => f.uri);
      const panel = vscode.window.createWebviewPanel(
        "codeguardianReviewStudio",
        "CodeGuardian Review Studio",
        column || vscode.ViewColumn.One,
        {
          enableScripts: true,
          retainContextWhenHidden: false,
          localResourceRoots: [extensionUri, ...workspaceRoots]
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
    try {
      const webview = this._panel.webview;
      this._panel.title = "CodeGuardian Review Studio";
      this._panel.webview.html = this._getHtmlForWebview(webview);
    } catch {
      void vscode.commands.executeCommand("codeguardian.openReviewReport");
    }
  }


  private _getHtmlForWebview(webview: vscode.Webview): string {
    const state = ReviewStateManager.getInstance();
    const findings = state.activeFindings;
    const mode = state.activeMode;
    const sessions = state.sessions;
    const highCount = findings.filter((f) => f.severity === "high" || f.severity === "critical").length;
    const mediumCount = findings.filter((f) => f.severity === "medium").length;
    const lowCount = findings.filter((f) => f.severity === "low" || f.severity === "info").length;
    const nonce = getNonce();

    const findingsHtml = findings.length
      ? findings
          .map(
            (finding, index) => `
        <div class="card severity-${finding.severity}" data-severity="${finding.severity}" data-text="${escapeHtml(finding.title + " " + finding.message + " " + (finding.file ?? ""))}">
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
            <button class="btn btn-rewrite" data-cmd="rewrite" data-idx="${index}">✏️ Rewrite with AI</button>
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
  <meta http-equiv="Content-Security-Policy" content="default-src 'self' ${webview.cspSource} 'unsafe-inline' 'unsafe-eval'; img-src ${webview.cspSource} https: data:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' ${webview.cspSource} 'unsafe-inline' 'unsafe-eval'; font-src ${webview.cspSource} data:;">

  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CodeGuardian Review Studio</title>
  <style>
    body {
      font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
      background-color: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
      padding: 24px;
      margin: 0;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 18px;
      border-bottom: 1px solid var(--vscode-widget-border, rgba(255,255,255,0.1));
      margin-bottom: 24px;
    }
    .title-area h2 {
      margin: 0;
      font-size: 22px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .mode-badge {
      font-size: 11px;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      padding: 4px 10px;
      border-radius: 12px;
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .top-actions {
      display: flex;
      gap: 10px;
    }
    .btn {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      padding: 8px 16px;
      font-size: 12px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.15s;
    }
    .btn:hover {
      background: var(--vscode-button-hoverBackground);
      transform: translateY(-1px);
    }
    .btn-secondary {
      background: var(--vscode-button-secondaryBackground, #3a3d41);
      color: var(--vscode-button-secondaryForeground, #fff);
    }
    .status-summary {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
    }
    .summary-card {
      background: var(--vscode-editor-inactiveSelectionBackground, #252526);
      padding: 16px 20px;
      border-radius: 8px;
      flex: 1;
      border-left: 4px solid #007acc;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .summary-card.warn {
      border-left-color: #f14c4c;
    }
    .toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      gap: 12px;
    }
    .filter-tabs { display: flex; gap: 8px; }
    .tab-btn {
      background: rgba(255,255,255,0.05);
      border: 1px solid var(--vscode-widget-border, #444);
      color: var(--vscode-editor-foreground);
      padding: 6px 12px;
      font-size: 11px;
      border-radius: 16px;
      cursor: pointer;
      font-weight: 500;
    }
    .tab-btn.active {
      background: var(--vscode-button-background);
      color: #fff;
      border-color: transparent;
    }
    .search-input {
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border, #444);
      padding: 6px 12px;
      font-size: 12px;
      border-radius: 6px;
      width: 220px;
    }
    .card {
      background: var(--vscode-sideBar-background, #1e1e1e);
      border: 1px solid var(--vscode-widget-border, rgba(255,255,255,0.1));
      border-radius: 8px;
      padding: 18px;
      margin-bottom: 16px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transition: border-color 0.15s;
    }
    .card:hover { border-color: rgba(0, 122, 204, 0.5); }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .badge {
      font-size: 10px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 4px;
    }
    .badge-critical, .badge-high { background: #f14c4c; color: #fff; }
    .badge-medium { background: #cca700; color: #000; }
    .badge-low, .badge-info { background: #3794ff; color: #fff; }
    .file-path { font-family: var(--vscode-editor-font-family, Consolas, monospace); font-size: 12px; opacity: 0.85; background: rgba(0,0,0,0.2); padding: 2px 6px; border-radius: 3px; }
    .card-title { font-weight: 700; font-size: 15px; margin-bottom: 8px; color: var(--vscode-editor-foreground); }
    .card-message { font-size: 13px; margin-bottom: 12px; opacity: 0.9; line-height: 1.4; }
    .card-suggestion { font-size: 12px; background: rgba(255,255,255,0.04); border-left: 3px solid #238636; padding: 10px 14px; border-radius: 4px; margin-bottom: 14px; }
    .code-snippet { font-family: var(--vscode-editor-font-family, Consolas, monospace); font-size: 11px; background: #0d1117; padding: 10px; border-radius: 6px; margin-bottom: 12px; overflow-x: auto; border: 1px solid #21262d; }
    .actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .btn-accept { background: #2e7d32; }
    .btn-reject { background: #c62828; }
    .btn-rewrite { background: #0277bd; }
    .btn-explain { background: #6a1b9a; }
    .btn-ignore { background: #424242; }
    .empty-state { text-align: center; padding: 60px 20px; font-size: 16px; opacity: 0.85; background: rgba(255,255,255,0.02); border-radius: 8px; border: 1px dashed var(--vscode-widget-border, #444); }
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
      <button class="btn btn-secondary" id="btnReset">🔄 Reset Ignored</button>
    </div>
  </div>

  <div class="status-summary">
    <div class="summary-card ${highCount > 0 ? "warn" : ""}">
      <div style="font-size:12px; opacity:0.8;">Total Active Findings</div>
      <div style="font-size:24px; font-weight:bold; margin-top:4px;">${findings.length}</div>
    </div>
    <div class="summary-card ${highCount > 0 ? "warn" : ""}">
      <div style="font-size:12px; opacity:0.8;">Critical / High Risk</div>
      <div style="font-size:24px; font-weight:bold; margin-top:4px;">${highCount}</div>
    </div>
    <div class="summary-card">
      <div style="font-size:12px; opacity:0.8;">Medium / Low Risk</div>
      <div style="font-size:24px; font-weight:bold; margin-top:4px;">${mediumCount + lowCount}</div>
    </div>
    <div class="summary-card">
      <div style="font-size:12px; opacity:0.8;">Audit Sessions</div>
      <div style="font-size:24px; font-weight:bold; margin-top:4px;">${sessions.length}</div>
    </div>
  </div>

  <div class="toolbar">
    <div class="filter-tabs">
      <button class="tab-btn active" data-filter="all">All (${findings.length})</button>
      <button class="tab-btn" data-filter="high">High/Critical (${highCount})</button>
      <button class="tab-btn" data-filter="medium">Medium (${mediumCount})</button>
      <button class="tab-btn" data-filter="low">Low/Info (${lowCount})</button>
    </div>
    <input type="text" class="search-input" id="searchInput" placeholder="Filter findings..." />
  </div>

  <div id="findingsContainer">
    ${findingsHtml}
  </div>

  <script nonce="${nonce}">
    (function() {
      const vscode = acquireVsCodeApi();
      const rawFindings = ${JSON.stringify(findings)};
      let activeFilter = 'all';

      const searchInput = document.getElementById('searchInput');
      const cards = document.querySelectorAll('.card');

      function filterCards() {
        const query = (searchInput.value || '').toLowerCase();
        cards.forEach(card => {
          const sev = card.getAttribute('data-severity');
          const text = card.getAttribute('data-text') || '';
          
          let matchesSev = activeFilter === 'all';
          if (activeFilter === 'high') matchesSev = sev === 'critical' || sev === 'high';
          if (activeFilter === 'medium') matchesSev = sev === 'medium';
          if (activeFilter === 'low') matchesSev = sev === 'low' || sev === 'info';

          const matchesQuery = !query || text.toLowerCase().includes(query);

          if (matchesSev && matchesQuery) {
            card.style.display = 'block';
          } else {
            card.style.display = 'none';
          }
        });
      }

      if (searchInput) {
        searchInput.addEventListener('input', filterCards);
      }

      document.addEventListener('click', function(e) {
        const target = e.target;
        if (!target) return;

        if (target.classList && target.classList.contains('tab-btn')) {
          document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
          target.classList.add('active');
          activeFilter = target.getAttribute('data-filter') || 'all';
          filterCards();
          return;
        }
        
        if (target.id === 'btnStaged') {
          vscode.postMessage({ command: 'analyzeStaged' });
        } else if (target.id === 'btnPush') {
          vscode.postMessage({ command: 'analyzeLatestCommit' });
        } else if (target.id === 'btnHooks') {
          vscode.postMessage({ command: 'installHooks' });
        } else if (target.id === 'btnReset') {
          vscode.postMessage({ command: 'resetIgnored' });
        } else if (target.hasAttribute && target.hasAttribute('data-cmd')) {
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
