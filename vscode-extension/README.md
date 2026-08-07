# CodeGuardian Pre-Push Review

This extension reviews the latest commit, adds VS Code diagnostics for changed lines, and can install a repository-local `pre-push` hook. The hook runs even when developers push from the terminal, so high-severity findings are caught before code leaves the workstation.

## Use

1. Start the standalone backend in `BE/extensionService` (optional but recommended for server-side/AI suggestions).
2. Run `npm install`, `npm run compile`, and `npm run package` in this folder.
3. Install the produced `.vsix` from VS Code's **Extensions: Install from VSIX...** command (or run `code --install-extension codeguardian-review-0.1.0.vsix`).
4. In VS Code, use **CodeGuardian: Install Pre-Push Review Hook** once for each repository.
5. Commit normally. CodeGuardian detects the updated Git branch ref, analyzes the changed commit, and shows inline diagnostics. Before push, the hook re-runs the review and blocks only `high`/`critical` findings by default.

The extension always has local, deterministic security and quality rules. If the sidecar is unavailable, review continues locally and the hook still works.

## Settings

`codeguardian.beBaseUrl` defaults to `http://127.0.0.1:8010`. Set `codeguardian.authToken` when reviewing from VS Code. For the hook, export `CODEGUARDIAN_BE_TOKEN` in the terminal instead of storing a token in the Git hook configuration.

Set `codeguardian.blockPushOnHighSeverity` to `false` for advisory-only review. This setting applies on the next hook installation.
