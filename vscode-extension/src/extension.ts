import * as path from "path";
import * as vscode from "vscode";
import { analyzeDiff, dedupe } from "./analyzer";
import { analyzeWithBackend, explainWithBackend, rewriteWithBackend } from "./beClient";
import { CodeGuardianCodeLensProvider } from "./codeLensProvider";
import { DiffEditorManager } from "./diffEditorManager";
import { applyPatchToFile, filesInDiff, latestCommit, latestCommitDiff, stagedDiff, unpushedDiff } from "./git";
import { installPreCommitHook, installPrePushHook } from "./hookInstaller";
import { CodeGuardianQuickFixProvider } from "./quickFixProvider";
import { ReviewStateManager } from "./stateManager";
import { CodeGuardianStatusBar } from "./statusBar";
import { FindingsTreeProvider } from "./treeViews/findingsTreeProvider";
import { HistoryTreeProvider } from "./treeViews/historyTreeProvider";
import { ReviewTreeProvider } from "./treeViews/reviewTreeProvider";
import { Finding } from "./types";
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
  const analyzeStagedCmd = vscode.commands.registerCommand("codeguardian.analyzeStaged", async () => {
    const folder = await chooseWorkspaceFolder();
    if (folder) await runAnalysis(folder.uri.fsPath, "pre-commit", output);
  });

  const analyzeLatestCommitCmd = vscode.commands.registerCommand("codeguardian.analyzeLatestCommit", async () => {
    const folder = await chooseWorkspaceFolder();
    if (folder) await runAnalysis(folder.uri.fsPath, "pre-push", output);
  });

  const openReviewStudioCmd = vscode.commands.registerCommand("codeguardian.openReviewStudio", () => {
    ReviewStudioPanel.createOrShow(context.extensionUri);
  });

  const installHooksCmd = vscode.commands.registerCommand("codeguardian.installHooks", async () => {
    const folder = await chooseWorkspaceFolder();
    if (!folder) return;
    try {
      const pushHook = await installPrePushHook(folder.uri.fsPath, context.extensionPath);
      const commitHook = await installPreCommitHook(folder.uri.fsPath, context.extensionPath);
      vscode.window.showInformationMessage(`CodeGuardian Git hooks installed:\nPre-Commit: ${commitHook}\nPre-Push: ${pushHook}`);
    } catch (error) {
      vscode.window.showErrorMessage(`Could not install CodeGuardian hooks: ${String(error)}`);
    }
  });

  const acceptFindingCmd = vscode.commands.registerCommand("codeguardian.acceptFinding", async (finding: Finding) => {
    if (!finding) return;
    const folder = await chooseWorkspaceFolder();
    if (!folder || !finding.file) return;

    const replacement = finding.replacementCode || finding.suggestion;
    const applied = await applyPatchToFile(folder.uri.fsPath, finding.file, finding.line, finding.originalCode, replacement);

    if (applied) {
      stateManager.updateFindingStatus(finding.id || finding.title, "accepted");
      updateDiagnostics(folder.uri.fsPath, stateManager.activeFindings);
      vscode.window.showInformationMessage(`Applied CodeGuardian suggestion to ${finding.file}`);
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

    vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: "Generating AI rewrite..." }, async () => {
      const res = await rewriteWithBackend(
        config.get<string>("beBaseUrl") ?? "http://127.0.0.1:8010",
        config.get<string>("authToken") ?? "",
        { finding, instruction, repositoryPath: folder?.uri.fsPath }
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

    vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: "Fetching AI explanation..." }, async () => {
      const res = await explainWithBackend(
        config.get<string>("beBaseUrl") ?? "http://127.0.0.1:8010",
        config.get<string>("authToken") ?? "",
        { finding }
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
    analyzeStagedCmd,
    analyzeLatestCommitCmd,
    openReviewStudioCmd,
    installHooksCmd,
    acceptFindingCmd,
    rejectFindingCmd,
    rewriteFindingCmd,
    explainFindingCmd,
    ignoreFindingCmd,
    openDiffCmd
  );

  // File System Watchers for Git changes
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

async function runAnalysis(root: string, mode: "pre-commit" | "pre-push", output: vscode.OutputChannel): Promise<void> {
  try {
    let diff = "";
    let commitSha = "STAGED";

    if (mode === "pre-commit") {
      diff = await stagedDiff(root);
      if (!diff) {
        // Fall back to unpushed/latest commit diff
        diff = await latestCommitDiff(root);
        commitSha = await latestCommit(root).catch(() => "HEAD");
      }
    } else {
      diff = await unpushedDiff(root);
      commitSha = await latestCommit(root).catch(() => "HEAD");
    }

    const localFindings = analyzeDiff(diff);
    const config = vscode.workspace.getConfiguration("codeguardian", vscode.Uri.file(root));

    const backend = await analyzeWithBackend(
      config.get<string>("beBaseUrl") ?? "http://127.0.0.1:8010",
      config.get<string>("authToken") ?? "",
      {
        repositoryPath: root,
        commit: commitSha,
        diff,
        files: filesInDiff(diff),
        localFindings
      }
    );

    const rawFindings = dedupe([...localFindings, ...(backend?.suggestions ?? [])]);
    ReviewStateManager.getInstance().setReviewResults(
      rawFindings,
      mode,
      root,
      commitSha,
      backend?.summary ?? "Local review completed."
    );

    const activeFindings = ReviewStateManager.getInstance().activeFindings;
    updateDiagnostics(root, activeFindings);

    output.clear();
    output.appendLine(`CodeGuardian Review [${mode.toUpperCase()}] for ${commitSha.slice(0, 12)}`);
    output.appendLine(backend?.summary ?? "Local review completed.");
    output.appendLine(`Total findings: ${activeFindings.length}`);

    for (const finding of activeFindings) {
      output.appendLine(`[${finding.severity.toUpperCase()}] ${finding.file ?? "change"}${finding.line ? `:${finding.line}` : ""} — ${finding.title}`);
      output.appendLine(`  ${finding.suggestion}`);
    }

    output.show(true);

    const highCount = activeFindings.filter((item) => item.severity === "high" || item.severity === "critical").length;
    if (highCount > 0) {
      vscode.window.showWarningMessage(`CodeGuardian Review: ${activeFindings.length} issue(s) found (${highCount} Critical/High). Review before push/commit!`, "Open Review Studio").then((choice) => {
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
