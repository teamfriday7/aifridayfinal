import * as path from "path";
import * as vscode from "vscode";
import { chatWithBackendStreaming } from "../beClient";
import { applyPatchToFile } from "../git";
import { ChatMessage } from "../types";
import { WorkspaceContext, WorkspaceContextRetriever } from "../workspaceContext";

export class ChatViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "codeguardian.chatView";
  private _view?: vscode.WebviewView;
  private _messages: ChatMessage[] = [];
  private _isThinking = false;
  private _latestContext?: WorkspaceContext;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    void this.refreshContextAndRender();

    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case "sendMessage":
          await this.handleUserMessage(data.text);
          break;
        case "insertCode":
          this.insertCodeAtCursor(data.code);
          break;
        case "applyPatch":
          await this.applyPatchToActiveFile(data.code);
          break;
        case "clearChat":
          this.clearChat();
          break;
      }
    });
  }

  public async refreshContextAndRender(): Promise<void> {
    this._latestContext = await WorkspaceContextRetriever.getWorkspaceContext();
    this._updateHtml();
  }

  public async handleUserMessage(promptText: string): Promise<void> {
    if (!promptText.trim()) return;

    this._messages.push({ role: "user", content: promptText });
    this._isThinking = true;
    this._updateHtml();

    const context = await WorkspaceContextRetriever.getWorkspaceContext();
    this._latestContext = context;
    const folder = vscode.workspace.workspaceFolders?.[0];
    const config = vscode.workspace.getConfiguration("codeguardian", folder?.uri);

    const baseUrl = config.get<string>("beBaseUrl") ?? "http://127.0.0.1:8010";
    const token = config.get<string>("authToken") ?? "";
    const apiKey = config.get<string>("apiKey") ?? "";

    const assistantMsgIndex = this._messages.length;
    this._messages.push({ role: "assistant", content: "" });

    let accumulatedText = "";

    const res = await chatWithBackendStreaming(
      baseUrl,
      token,
      {
        messages: this._messages.slice(0, -1),
        repositoryPath: context.repositoryPath,
        activeFile: context.activeFile,
        selection: context.selection,
        gitDiff: context.gitDiff,
        projectManifest: context.projectManifest
      },
      apiKey,
      (chunkText: string) => {
        accumulatedText += chunkText;
        this._messages[assistantMsgIndex].content = accumulatedText;
        this._isThinking = false;
        this._updateHtml();
      }
    );

    this._isThinking = false;

    if (!accumulatedText && res?.reply) {
      accumulatedText = res.reply;
    }

    if (!accumulatedText) {
      accumulatedText =
        `### 🛡️ CodeGuardian AI Assistant\n\nAnalyzed active workspace at \`${context.repositoryPath}\` on branch \`${context.branchName ?? "HEAD"}\`.\n\n` +
        `*(Sidecar response completed. Configure \`codeguardian.apiKey\` in VS Code settings for multi-step LLM reasoning).*`;
    }

    this._messages[assistantMsgIndex].content = accumulatedText;
    this._updateHtml();
  }

  public clearChat(): void {
    this._messages = [];
    this._isThinking = false;
    this._updateHtml();
  }

  private insertCodeAtCursor(code: string): void {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      editor.edit((editBuilder) => {
        editBuilder.insert(editor.selection.active, code);
      });
      vscode.window.showInformationMessage("Inserted code snippet at cursor!");
    } else {
      vscode.window.showWarningMessage("No active text editor open to insert snippet.");
    }
  }

  private async applyPatchToActiveFile(code: string): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage("No active text editor open to apply patch.");
      return;
    }

    const folder = vscode.workspace.getWorkspaceFolder(editor.document.uri);
    const rootPath = folder ? folder.uri.fsPath : process.cwd();
    const relativePath = path.relative(rootPath, editor.document.fileName).replace(/\\/g, "/");

    const applied = await applyPatchToFile(
      rootPath,
      relativePath,
      editor.selection.start.line + 1,
      editor.document.getText(editor.selection),
      code
    );

    if (applied) {
      vscode.window.showInformationMessage(`Applied CodeGuardian patch to ${relativePath}!`);
    } else {
      vscode.window.showErrorMessage("Could not auto-apply patch. Use 'Insert at Cursor' instead.");
    }
  }

  private _updateHtml(): void {
    if (!this._view) return;
    const nonce = getNonce();
    this._view.webview.html = this.getHtmlForWebview(nonce);
  }


  private getHtmlForWebview(nonce: string): string {
    const ctx = this._latestContext;
    const repoName = ctx?.repositoryPath ? path.basename(ctx.repositoryPath) : "Workspace";
    const branchName = ctx?.branchName ?? "main";
    const activeFile = ctx?.activeFile;

    const chatHtml = this._messages.length
      ? this._messages
          .map((msg, index) => {
            const isUser = msg.role === "user";
            return `
        <div class="message-bubble ${isUser ? "user" : "assistant"}">
          <div class="msg-header">
            <span class="avatar">${isUser ? "👤 You" : "🛡️ CodeGuardian AI"}</span>
          </div>
          <div class="msg-content">${formatMarkdown(msg.content)}</div>
          ${
            !isUser && index === this._messages.length - 1
              ? `<div class="followup-chips">
                  <button class="chip" data-prompt="Explain this selection in detail">💡 Explain Selection</button>
                  <button class="chip" data-prompt="Generate unit tests for active file">🧪 Generate Tests</button>
                  <button class="chip" data-prompt="Refactor for security and performance">⚡ Refactor Code</button>
                 </div>`
              : ""
          }
        </div>
      `;
          })
          .join("")
      : `
      <div class="welcome-card">
        <div class="welcome-header">🛡️ CodeGuardian AI Assistant</div>
        <p>Repository-aware AI pair programmer with live Git diff context.</p>
        <div class="quick-prompts">
          <button class="btn-prompt" data-prompt="Analyze this repository and explain the architecture.">🏗️ Explain Architecture</button>
          <button class="btn-prompt" data-prompt="Review my staged changes before I commit.">🔍 Review Staged Changes</button>
          <button class="btn-prompt" data-prompt="Generate unit tests for the active file.">🧪 Generate Unit Tests</button>
          <button class="btn-prompt" data-prompt="Find potential bugs or performance bottlenecks in active file.">🐞 Find Bugs & Bottlenecks</button>
          <button class="btn-prompt" data-prompt="Summarize recent code changes.">📝 Summarize Recent Changes</button>
        </div>
      </div>
    `;

    const thinkingHtml = this._isThinking
      ? `<div class="thinking-card">
          <span class="spinner"></span> CodeGuardian AI is thinking...
         </div>`
      : "";

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${this._view?.webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CodeGuardian Chat</title>
  <style>
    body {
      font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
      background-color: var(--vscode-sideBar-background);
      color: var(--vscode-sideBar-foreground);
      padding: 10px;
      margin: 0;
      display: flex;
      flex-direction: column;
      height: 100vh;
      box-sizing: border-box;
    }
    
    .context-banner {
      background: rgba(255, 255, 255, 0.04);
      backdrop-filter: blur(10px);
      border: 1px solid var(--vscode-widget-border, rgba(255,255,255,0.1));
      border-radius: 8px;
      padding: 8px 12px;
      margin-bottom: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
    }
    .repo-info { display: flex; align-items: center; gap: 6px; font-weight: 600; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: #238636; display: inline-block; }
    .branch-tag { background: rgba(55, 148, 255, 0.15); color: #58a6ff; padding: 2px 6px; border-radius: 4px; font-size: 10px; }
    .active-file-tag { font-size: 10px; opacity: 0.8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px; }

    .chat-container {
      flex: 1;
      overflow-y: auto;
      margin-bottom: 10px;
      padding-right: 4px;
    }
    .message-bubble {
      background: var(--vscode-editor-inactiveSelectionBackground, #252526);
      padding: 12px 14px;
      border-radius: 8px;
      margin-bottom: 12px;
      border-left: 3px solid #007acc;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      animation: fadeIn 0.2s ease-in-out;
    }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }

    .message-bubble.user {
      border-left-color: #3794ff;
      background: var(--vscode-input-background, #1e1e1e);
    }
    .msg-header {
      font-size: 11px;
      font-weight: 600;
      opacity: 0.85;
      margin-bottom: 6px;
      display: flex;
      justify-content: space-between;
    }
    .msg-content { font-size: 12px; line-height: 1.5; word-break: break-word; }
    
    /* Code Blocks */
    .code-block-wrapper {
      background: #0d1117;
      border: 1px solid var(--vscode-widget-border, #30363d);
      border-radius: 6px;
      margin: 8px 0;
      overflow: hidden;
    }
    .code-header {
      background: #161b22;
      padding: 5px 10px;
      font-size: 10px;
      font-weight: 600;
      color: #8b949e;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #21262d;
    }
    .code-header-actions { display: flex; gap: 6px; }
    pre { margin: 0; padding: 10px; overflow-x: auto; background: transparent; }
    code { font-family: var(--vscode-editor-font-family, Consolas, monospace); font-size: 11px; color: #e6edf3; }
    
    .btn-action {
      background: var(--vscode-button-background, #238636);
      color: var(--vscode-button-foreground, #fff);
      border: none;
      padding: 3px 8px;
      font-size: 10px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
      transition: background 0.15s;
    }
    .btn-action:hover { opacity: 0.9; }
    .btn-action.sec { background: var(--vscode-button-secondaryBackground, #30363d); }
    
    .followup-chips { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 10px; }
    .chip { background: rgba(255,255,255,0.06); border: 1px solid var(--vscode-widget-border, #444); color: var(--vscode-sideBar-foreground); padding: 4px 10px; font-size: 10px; border-radius: 12px; cursor: pointer; transition: all 0.15s; }
    .chip:hover { background: var(--vscode-button-hoverBackground); color: #fff; transform: translateY(-1px); }

    .welcome-card { padding: 16px; background: rgba(255,255,255,0.03); border-radius: 8px; border: 1px solid var(--vscode-widget-border, #333); }
    .welcome-header { font-size: 14px; font-weight: bold; margin-bottom: 6px; }
    .quick-prompts { display: flex; flex-direction: column; gap: 6px; margin-top: 12px; }
    .btn-prompt { background: var(--vscode-button-secondaryBackground, #3a3d41); color: var(--vscode-button-secondaryForeground, #fff); border: none; padding: 8px 12px; font-size: 11px; border-radius: 6px; cursor: pointer; text-align: left; transition: background 0.15s; }
    .btn-prompt:hover { background: var(--vscode-button-hoverBackground); }
    
    .thinking-card { padding: 8px 12px; font-size: 11px; opacity: 0.85; font-style: italic; display: flex; align-items: center; gap: 8px; }
    .spinner {
      width: 12px;
      height: 12px;
      border: 2px solid rgba(255,255,255,0.3);
      border-radius: 50%;
      border-top-color: #007acc;
      animation: spin 1s ease-in-out infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .input-area { display: flex; gap: 6px; padding-top: 8px; border-top: 1px solid var(--vscode-widget-border, #333); }
    input[type="text"] {
      flex: 1;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border, #444);
      padding: 8px 12px;
      font-size: 12px;
      border-radius: 6px;
      outline: none;
    }
    input[type="text"]:focus { border-color: #007acc; }
    .btn-send { background: var(--vscode-button-background); color: #fff; border: none; padding: 8px 16px; font-size: 12px; border-radius: 6px; cursor: pointer; font-weight: 600; }
  </style>
</head>
<body>
  <div class="context-banner">
    <div class="repo-info">
      <span class="dot"></span>
      <span>${escapeHtml(repoName)}</span>
      <span class="branch-tag">🌿 ${escapeHtml(branchName)}</span>
    </div>
    <div class="active-file-tag">${activeFile ? `📄 ${escapeHtml(activeFile)}` : "Workspace Context"}</div>
  </div>

  <div class="chat-container" id="chatContainer">
    ${chatHtml}
    ${thinkingHtml}
  </div>

  <div class="input-area">
    <input type="text" id="promptInput" placeholder="Ask AI Assistant about your codebase..." />
    <button class="btn-send" id="btnSend">Send</button>
  </div>

  <script nonce="${nonce}">
    (function() {
      const vscode = acquireVsCodeApi();
      const input = document.getElementById('promptInput');
      const btnSend = document.getElementById('btnSend');
      const container = document.getElementById('chatContainer');

      container.scrollTop = container.scrollHeight;

      function doSend() {
        const val = input.value;
        if (val.trim()) {
          vscode.postMessage({ type: 'sendMessage', text: val });
          input.value = '';
        }
      }

      btnSend.addEventListener('click', doSend);
      input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') doSend();
      });

      document.addEventListener('click', function(e) {
        const t = e.target;
        if (!t) return;
        if (t.classList.contains('btn-prompt') || t.classList.contains('chip')) {
          const p = t.getAttribute('data-prompt');
          if (p) vscode.postMessage({ type: 'sendMessage', text: p });
        } else if (t.classList.contains('btn-insert')) {
          const code = decodeURIComponent(t.getAttribute('data-code') || '');
          vscode.postMessage({ type: 'insertCode', code });
        } else if (t.classList.contains('btn-patch')) {
          const code = decodeURIComponent(t.getAttribute('data-code') || '');
          vscode.postMessage({ type: 'applyPatch', code });
        } else if (t.classList.contains('btn-copy')) {
          const code = decodeURIComponent(t.getAttribute('data-code') || '');
          navigator.clipboard.writeText(code);
          t.innerText = '✓ Copied';
          setTimeout(() => { t.innerText = '📋 Copy'; }, 2000);
        }
      });
    })();
  </script>
</body>
</html>`;
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

function formatMarkdown(text: string): string {
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Code block matching ```lang ... ```
  html = html.replace(/```([a-z0-9_]*)\r?\n([\s\S]*?)```/gi, (match, lang, code) => {
    const langLabel = (lang || "code").toUpperCase();
    const encCode = encodeURIComponent(code.trim());
    return `<div class="code-block-wrapper">
      <div class="code-header">
        <span>${langLabel}</span>
        <div class="code-header-actions">
          <button class="btn-action btn-copy sec" data-code="${encCode}">📋 Copy</button>
          <button class="btn-action btn-insert sec" data-code="${encCode}">📥 Insert</button>
          <button class="btn-action btn-patch" data-code="${encCode}">⚡ Apply Patch</button>
        </div>
      </div>
      <pre><code>${code.trim()}</code></pre>
    </div>`;
  });

  html = html.replace(/^### (.*$)/gim, "<strong>$1</strong>");
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\n/g, "<br/>");
  return html;
}

