import * as path from "path";
import * as vscode from "vscode";
import { analyzeDiff, dedupe } from "./analyzer";
import { analyzeWithBackend, checkBackendHealth, explainWithBackend, rewriteWithBackend } from "./beClient";
import { CodeGuardianCodeLensProvider } from "./codeLensProvider";
import { DiffEditorManager } from "./diffEditorManager";
import { applyPatchToFile, filesInDiff, findGitRoot, latestCommit, latestCommitDiff, stagedDiff, unpushedDiff } from "./git";
import { installPreCommitHook, installPrePushHook } from "./hookInstaller";
import { CodeGuardianQuickFixProvider } from "./quickFixProvider";
import { ReviewStateManager } from "./stateManager";
import { CodeGuardianStatusBar } from "./statusBar";
import { FindingsTreeProvider } from "./treeViews/findingsTreeProvider";
import { HistoryTreeProvider } from "./treeViews/historyTreeProvider";
import { ReviewTreeProvider } from "./treeViews/reviewTreeProvider";
import { Finding } from "./types";
import { ChatViewProvider } from "./views/chatViewProvider";
import { ReviewStudioPanel } from "./webview/reviewStudioPanel";

const diagnostics = vscode.languages.createDiagnosticCollection("codeguardian");

export function activate(context: vscode.ExtensionContext): void {
  const output = vscode.window.createOutputChannel("CodeGuardian Review");
  const stateManager = ReviewStateManager.getInstance();
  stateManager.initialize(context);

  const statusBar = new CodeGuardianStatusBar();
  const diffEditorManager = new DiffEditorManager();

  context.subscriptions.push(output, diagnostics, statusBar, diffEditorManager);

  output.appendLine("CodeGuardian Git-Native AI Assistant activated.");

  // Register AI Chat Assistant Sidebar View Provider
  const chatViewProvider = new ChatViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(ChatViewProvider.viewType, chatViewProvider)
  );

  // Tree Views
  const reviewTreeProvider = new ReviewTreeProvider();
  const findingsTreeProvider = new FindingsTreeProvider();
  const historyTreeProvider = new HistoryTreeProvider();

  vscode.window.registerTreeDataProvider("codeguardian.reviewTree", reviewTreeProvider);
  vscode.window.registerTreeDataProvider("codeguardian.findingsTree", findingsTreeProvider);
  vscode.window.registerTreeDataProvider("codeguardian.historyTree", historyTreeProvider);

  // CodeLens & CodeActions
  const codeLensProvider = new CodeGuardianCodeLensProvider();
  const quickFixProvider = new CodeGuardianQuickFixProvider();

  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider({ scheme: "file" }, codeLensProvider),
    vscode.languages.registerCodeActionsProvider({ scheme: "file" }, quickFixProvider, {
      providedCodeActionKinds: CodeGuardianQuickFixProvider.providedCodeActionKinds
    })
  );

  // Commands
  const openChatCmd = vscode.commands.registerCommand("codeguardian.openChat", () => {
    vscode.commands.executeCommand("codeguardian.chatView.focus");
  });

  const clearChatCmd = vscode.commands.registerCommand("codeguardian.clearChat", () => {
    chatViewProvider.clearChat();
  });

  const checkConnectionCmd = vscode.commands.registerCommand("codeguardian.checkConnection", async () => {
    const folder = await chooseWorkspaceFolder();
    const config = vscode.workspace.getConfiguration("codeguardian", folder?.uri);
    const configuredUrl = config.get<string>("beBaseUrl") ?? "http://127.0.0.1:8010";

    const res = await checkBackendHealth(configuredUrl);
    if (res.online) {
      vscode.window.showInformationMessage(`✅ CodeGuardian: Connected to backend at ${res.url}`);
    } else {
      vscode.window.showWarningMessage(`⚠️ CodeGuardian: Backend sidecar offline (${configuredUrl}). Extension using local deterministic rules.`);
    }
  });

  const explainSelectionCmd = vscode.commands.registerCommand("codeguardian.explainSelection", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;
    const text = editor.document.getText(editor.selection) || editor.document.getText();
    await chatViewProvider.handleUserMessage(`Explain this code snippet in context of our repository:\n\`\`\`\n${text.slice(0, 2000)}\n\`\`\``);
    vscode.commands.executeCommand("codeguardian.chatView.focus");
  });

  const generateTestsCmd = vscode.commands.registerCommand("codeguardian.generateTests", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;
    const relativePath = path.basename(editor.document.fileName);
    await chatViewProvider.handleUserMessage(`Generate unit tests for active file ${relativePath}.`);
    vscode.commands.executeCommand("codeguardian.chatView.focus");
  });

  const analyzeStagedCmd = vscode.commands.registerCommand("codeguardian.analyzeStaged", async () => {
    const folder = await chooseWorkspaceFolder();
    if (folder) await runAnalysisWithProgress(folder.uri.fsPath, "pre-commit", output);
  });

  const analyzeLatestCommitCmd = vscode.commands.registerCommand("codeguardian.analyzeLatestCommit", async () => {
    const folder = await chooseWorkspaceFolder();
    if (folder) await runAnalysisWithProgress(folder.uri.fsPath, "pre-push", output);
  });

  const openReviewStudioCmd = vscode.commands.registerCommand("codeguardian.openReviewStudio", () => {
    ReviewStudioPanel.createOrShow(context.extensionUri);
  });

  const openReviewReportCmd = vscode.commands.registerCommand("codeguardian.openReviewReport", async () => {
    const state = stateManager;
    const findings = state.activeFindings;
    const mode = state.activeMode;
    let md = `# 🛡️ CodeGuardian AI Code Review Report\n\n`;
    md += `**Review Mode**: \`${mode.toUpperCase()}\` | **Total Findings**: \`${findings.length}\` | **Date**: \`${new Date().toLocaleString()}\`\n\n`;
    md += `---\n\n`;

    if (findings.length === 0) {
      md += `### 🎉 Code Status: CLEAN\nNo security vulnerabilities or quality issues detected in this review cycle.\n`;
    } else {
      md += `### Active Security & Quality Findings\n\n`;
      findings.forEach((finding, idx) => {
        md += `#### ${idx + 1}. [${finding.severity.toUpperCase()}] ${finding.title}\n`;
        md += `- **File**: \`${finding.file ?? "Workspace"}:${finding.line ?? 1}\`\n`;
        md += `- **Message**: ${finding.message}\n`;
        md += `- **Suggestion**: ${finding.suggestion}\n`;
        if (finding.originalCode) {
          md += `\n\`\`\`\n${finding.originalCode}\n\`\`\`\n`;
        }
        md += `\n`;
      });
    }

    const doc = await vscode.workspace.openTextDocument({ content: md, language: "markdown" });
    await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
  });

  const installHooksCmd = vscode.commands.registerCommand("codeguardian.installHooks", async () => {
    const folder = await chooseWorkspaceFolder();
    if (!folder) return;
    try {
      const gitRoot = await findGitRoot(folder.uri.fsPath);
      const pushHook = await installPrePushHook(gitRoot, context.extensionPath);
      const commitHook = await installPreCommitHook(gitRoot, context.extensionPath);
      vscode.window.showInformationMessage(`CodeGuardian Git hooks installed:\nPre-Commit: ${commitHook}\nPre-Push: ${pushHook}`);
    } catch (error) {
      vscode.window.showErrorMessage(`Could not install CodeGuardian hooks: ${String(error)}`);
    }
  });

  const acceptFindingCmd = vscode.commands.registerCommand("codeguardian.acceptFinding", async (finding: Finding) => {
    if (!finding) return;
    const folder = await chooseWorkspaceFolder();
    if (!folder || !finding.file) return;

    if (!finding.replacementCode) {
      const choice = await vscode.window.showInformationMessage(
        `CodeGuardian: No automated code fix payload attached to "${finding.title}". Generate an AI code rewrite fix now?`,
        "✏️ Rewrite with AI",
        "Mark as Resolved",
        "Cancel"
      );
      if (choice === "✏️ Rewrite with AI") {
        await vscode.commands.executeCommand("codeguardian.rewriteFinding", finding);
        return;
      } else if (choice === "Mark as Resolved") {
        stateManager.updateFindingStatus(finding.id || finding.title, "accepted");
        const gitRoot = await findGitRoot(folder.uri.fsPath);
        updateDiagnostics(gitRoot, stateManager.activeFindings);
        vscode.window.showInformationMessage(`Marked finding as resolved: ${finding.title}`);
        return;
      } else {
        return;
      }
    }

    const gitRoot = await findGitRoot(folder.uri.fsPath);
    const applied = await applyPatchToFile(gitRoot, finding.file, finding.line, finding.originalCode, finding.replacementCode);

    if (applied) {
      stateManager.updateFindingStatus(finding.id || finding.title, "accepted");
      updateDiagnostics(gitRoot, stateManager.activeFindings);
      vscode.window.showInformationMessage(`Applied CodeGuardian patch to ${finding.file}`);
    } else {
      vscode.window.showErrorMessage(`Could not automatically apply patch to ${finding.file}. Please apply manually.`);
    }
  });

  const rejectFindingCmd = vscode.commands.registerCommand("codeguardian.rejectFinding", (finding: Finding) => {
    if (!finding) return;
    stateManager.updateFindingStatus(finding.id || finding.title, "rejected");
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (folder) updateDiagnostics(folder.uri.fsPath, stateManager.activeFindings);
    vscode.window.showInformationMessage(`Dismissed suggestion: ${finding.title}`);
  });

  const rewriteFindingCmd = vscode.commands.registerCommand("codeguardian.rewriteFinding", async (finding: Finding) => {
    if (!finding) return;
    const instruction = await vscode.window.showInputBox({
      prompt: "Enter custom instructions for AI code rewrite",
      value: finding.suggestion,
      placeHolder: "e.g. Use parameterized query with async/await"
    });

    if (!instruction) return;

    const folder = await chooseWorkspaceFolder();
    const config = vscode.workspace.getConfiguration("codeguardian", folder?.uri);

    await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: "Generating AI rewrite..." }, async () => {
      const res = await rewriteWithBackend(
        config.get<string>("beBaseUrl") ?? "http://127.0.0.1:8010",
        config.get<string>("authToken") ?? "",
        { finding, instruction, repositoryPath: folder?.uri.fsPath },
        config.get<string>("apiKey")
      );

      if (res && res.replacementCode) {
        finding.replacementCode = res.replacementCode;
        const choice = await vscode.window.showInformationMessage(
          `AI Proposed Rewrite:\n\n${res.replacementCode.slice(0, 150)}...\n\nAccept and apply this patch?`,
          "Accept & Apply",
          "Cancel"
        );
        if (choice === "Accept & Apply") {
          await vscode.commands.executeCommand("codeguardian.acceptFinding", finding);
        }
      } else {
        vscode.window.showErrorMessage("Could not generate rewrite suggestion. Check backend sidecar status.");
      }
    });
  });

  const explainFindingCmd = vscode.commands.registerCommand("codeguardian.explainFinding", async (finding: Finding) => {
    if (!finding) return;
    const folder = await chooseWorkspaceFolder();
    const config = vscode.workspace.getConfiguration("codeguardian", folder?.uri);

    await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: "Fetching AI explanation..." }, async () => {
      const res = await explainWithBackend(
        config.get<string>("beBaseUrl") ?? "http://127.0.0.1:8010",
        config.get<string>("authToken") ?? "",
        { finding },
        config.get<string>("apiKey")
      );

      const explanationText = res?.explanation ?? `### ${finding.title}\n${finding.message}\n\n**Suggestion**: ${finding.suggestion}`;
      const doc = await vscode.workspace.openTextDocument({
        content: explanationText,
        language: "markdown"
      });
      await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
    });
  });

  const ignoreFindingCmd = vscode.commands.registerCommand("codeguardian.ignoreFinding", (finding: Finding) => {
    if (!finding) return;
    stateManager.ignoreFinding(finding);
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (folder) updateDiagnostics(folder.uri.fsPath, stateManager.activeFindings);
    vscode.window.showInformationMessage(`Ignored finding for workspace: ${finding.title}`);
  });

  const openDiffCmd = vscode.commands.registerCommand("codeguardian.openDiff", async (fileUri?: vscode.Uri) => {
    if (!fileUri) return;
    await vscode.commands.executeCommand("vscode.diff", fileUri, fileUri, `CodeGuardian Review: ${path.basename(fileUri.fsPath)}`);
  });

  context.subscriptions.push(
    openChatCmd,
    clearChatCmd,
    checkConnectionCmd,
    explainSelectionCmd,
    generateTestsCmd,
    analyzeStagedCmd,
    analyzeLatestCommitCmd,
    openReviewStudioCmd,
    openReviewReportCmd,
    installHooksCmd,
    acceptFindingCmd,
    rejectFindingCmd,
    rewriteFindingCmd,
    explainFindingCmd,
    ignoreFindingCmd,
    openDiffCmd
  );

  // Configuration change listener
  vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration("codeguardian")) {
      output.appendLine("CodeGuardian settings changed. Re-initializing status...");
      statusBar.update();
    }
  }, undefined, context.subscriptions);


  // Setup watchers for all workspace folders
  setupWorkspaceWatchers(context, output);

  vscode.workspace.onDidChangeWorkspaceFolders(() => {
    setupWorkspaceWatchers(context, output);
  }, undefined, context.subscriptions);
}

function setupWorkspaceWatchers(context: vscode.ExtensionContext, output: vscode.OutputChannel): void {
  for (const folder of vscode.workspace.workspaceFolders ?? []) {
    const headWatcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(folder, ".git/HEAD"));
    const refsWatcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(folder, ".git/refs/heads/**"));
    const indexWatcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(folder, ".git/index"));

    let timer: NodeJS.Timeout | undefined;
    const trigger = (mode: "pre-commit" | "pre-push") => {
      if (vscode.workspace.getConfiguration("codeguardian", folder.uri).get<boolean>("analyzeAfterCommit")) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => void runAnalysis(folder.uri.fsPath, mode, output), 400);
      }
    };

    indexWatcher.onDidChange(() => trigger("pre-commit"), undefined, context.subscriptions);
    headWatcher.onDidChange(() => trigger("pre-push"), undefined, context.subscriptions);
    refsWatcher.onDidChange(() => trigger("pre-push"), undefined, context.subscriptions);

    context.subscriptions.push(headWatcher, refsWatcher, indexWatcher, {
      dispose: () => {
        if (timer) clearTimeout(timer);
      }
    });
  }
}

async function chooseWorkspaceFolder(): Promise<vscode.WorkspaceFolder | undefined> {
  const folders = vscode.workspace.workspaceFolders ?? [];
  if (folders.length === 1) return folders[0];
  return vscode.window.showWorkspaceFolderPick({ placeHolder: "Choose a Git repository for CodeGuardian review" });
}

async function runAnalysisWithProgress(root: string, mode: "pre-commit" | "pre-push", output: vscode.OutputChannel): Promise<void> {
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `CodeGuardian ${mode === "pre-commit" ? "Pre-Commit" : "Pre-Push"} Reviewing...`,
      cancellable: false
    },
    async () => {
      await runAnalysis(root, mode, output);
    }
  );
}

async function runAnalysis(root: string, mode: "pre-commit" | "pre-push", output: vscode.OutputChannel): Promise<void> {
  try {
    const gitRoot = await findGitRoot(root);
    let diff = "";
    let commitSha = "STAGED";

    if (mode === "pre-commit") {
      diff = await stagedDiff(gitRoot);
      if (!diff) {
        diff = await latestCommitDiff(gitRoot);
        commitSha = await latestCommit(gitRoot).catch(() => "HEAD");
      }
    } else {
      diff = await unpushedDiff(gitRoot);
      commitSha = await latestCommit(gitRoot).catch(() => "HEAD");
    }

    const localFindings = analyzeDiff(diff);
    const config = vscode.workspace.getConfiguration("codeguardian", vscode.Uri.file(gitRoot));

    const backend = await analyzeWithBackend(
      config.get<string>("beBaseUrl") ?? "http://127.0.0.1:8010",
      config.get<string>("authToken") ?? "",
      {
        repositoryPath: gitRoot,
        commit: commitSha,
        diff,
        files: filesInDiff(diff),
        localFindings
      },
      config.get<string>("apiKey")
    );

    const rawFindings = dedupe([...localFindings, ...(backend?.suggestions ?? [])]);
    ReviewStateManager.getInstance().setReviewResults(
      rawFindings,
      mode,
      gitRoot,
      commitSha,
      backend?.summary ?? "Local review completed."
    );

    const activeFindings = ReviewStateManager.getInstance().activeFindings;
    updateDiagnostics(gitRoot, activeFindings);

    output.clear();
    output.appendLine(`CodeGuardian Review [${mode.toUpperCase()}] for ${commitSha.slice(0, 12)}`);
    output.appendLine(`Repository: ${gitRoot}`);
    output.appendLine(backend?.summary ?? "Local review completed (BE sidecar offline or returning local rules).");
    output.appendLine(`Total findings: ${activeFindings.length}`);

    for (const finding of activeFindings) {
      output.appendLine(`[${finding.severity.toUpperCase()}] ${finding.file ?? "change"}${finding.line ? `:${finding.line}` : ""} — ${finding.title}`);
      output.appendLine(`  ${finding.suggestion}`);
    }

    output.show(true);

    const highCount = activeFindings.filter((item) => item.severity === "high" || item.severity === "critical").length;
    if (highCount > 0) {
      vscode.window
        .showWarningMessage(
          `CodeGuardian Review: ${activeFindings.length} issue(s) found (${highCount} Critical/High). Review before push/commit!`,
          "Open Review Studio"
        )
        .then((choice) => {
          if (choice === "Open Review Studio") {
            vscode.commands.executeCommand("codeguardian.openReviewStudio");
          }
        });
    } else {
      vscode.window.showInformationMessage(`CodeGuardian Review: ${activeFindings.length} issue(s) detected. Code is clean.`);
    }
  } catch (error) {
    output.appendLine(`CodeGuardian analysis error: ${String(error)}`);
    output.show(true);
    vscode.window.showErrorMessage(`CodeGuardian analysis failed: ${String(error)}`);
  }
}

function updateDiagnostics(root: string, findings: Finding[]): void {
  diagnostics.clear();
  const map = new Map<string, vscode.Diagnostic[]>();

  for (const finding of findings) {
    if (!finding.file || !finding.line) continue;
    const uri = vscode.Uri.file(path.isAbsolute(finding.file) ? finding.file : path.join(root, finding.file));
    const severity =
      finding.severity === "critical" || finding.severity === "high"
        ? vscode.DiagnosticSeverity.Error
        : finding.severity === "medium"
        ? vscode.DiagnosticSeverity.Warning
        : vscode.DiagnosticSeverity.Information;

    const lineIndex = Math.max(0, finding.line - 1);
    const diag = new vscode.Diagnostic(
      new vscode.Range(lineIndex, 0, lineIndex, 200),
      `CodeGuardian: [${finding.title}] ${finding.suggestion}`,
      severity
    );
    diag.source = "CodeGuardian";

    const key = uri.fsPath;
    const existing = map.get(key) ?? [];
    existing.push(diag);
    map.set(key, existing);
  }

  for (const [filepath, diagList] of map.entries()) {
    diagnostics.set(vscode.Uri.file(filepath), diagList);
  }
}

export function deactivate(): void {
  /* Disposed via context subscriptions */
}
