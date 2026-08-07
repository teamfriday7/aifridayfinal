"""Enterprise Code Analysis — Commit Applier.

When a user accepts an AI review suggestion, this module:
  1. Reads the target file from the developer's working copy (C:\\aifridayfinal).
  2. Replaces the original_code block with suggested_code at the specified lines.
  3. Prepends an AI attribution comment above the changed block.
  4. Creates a structured git commit: "[AI-Review] Fix: <title>"
  5. Pushes the commit to C:\\GitRemote.

The resulting commit will be picked up by GitWatcher and re-analysed, creating
a virtuous cycle of continuous improvement.
"""
from __future__ import annotations

import logging
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

logger = logging.getLogger("commit_applier")

# Git binary path
GIT_BIN = r"C:\Users\GenAITVMSEZUSR4\AppData\Local\Programs\Git\cmd\git.exe"

# Developer working copy — the non-bare repo where patches are applied.
# Configurable per-project; defaults to the demo path.
DEFAULT_WORKING_COPY = r"C:\aifridayfinal"

# Remote to push to after applying the fix
GIT_REMOTE = r"C:\GitRemote"

# AI bot commit identity
AI_AUTHOR_NAME = "AI-Review Bot"
AI_AUTHOR_EMAIL = "ai-review@enterprise.com"

# Attribution comment templates per language
ATTRIBUTION_TEMPLATES: dict[str, str] = {
    ".py":   "# AI-Review: Fixed {category} ({severity}) — accepted by {user} on {date}\n",
    ".js":   "// AI-Review: Fixed {category} ({severity}) — accepted by {user} on {date}\n",
    ".jsx":  "// AI-Review: Fixed {category} ({severity}) — accepted by {user} on {date}\n",
    ".ts":   "// AI-Review: Fixed {category} ({severity}) — accepted by {user} on {date}\n",
    ".tsx":  "// AI-Review: Fixed {category} ({severity}) — accepted by {user} on {date}\n",
    ".java": "// AI-Review: Fixed {category} ({severity}) — accepted by {user} on {date}\n",
    ".go":   "// AI-Review: Fixed {category} ({severity}) — accepted by {user} on {date}\n",
    ".cs":   "// AI-Review: Fixed {category} ({severity}) — accepted by {user} on {date}\n",
    ".rb":   "# AI-Review: Fixed {category} ({severity}) — accepted by {user} on {date}\n",
    ".sh":   "# AI-Review: Fixed {category} ({severity}) — accepted by {user} on {date}\n",
    ".sql":  "-- AI-Review: Fixed {category} ({severity}) — accepted by {user} on {date}\n",
    ".html": "<!-- AI-Review: Fixed {category} ({severity}) — accepted by {user} on {date} -->\n",
    ".css":  "/* AI-Review: Fixed {category} ({severity}) — accepted by {user} on {date} */\n",
    ".scss": "/* AI-Review: Fixed {category} ({severity}) — accepted by {user} on {date} */\n",
}
DEFAULT_ATTRIBUTION = "# AI-Review: Fixed {category} ({severity}) — accepted by {user} on {date}\n"


class CommitApplier:
    """Applies accepted AI review suggestions and creates attributed commits."""

    def __init__(self, working_copy: str = DEFAULT_WORKING_COPY) -> None:
        self.working_copy = Path(working_copy)

    # ── public API ──────────────────────────────────────────────────────────────

    def apply_fix(
        self,
        review: dict[str, Any],
        accepted_by: str,
    ) -> dict[str, Any]:
        """Apply a single accepted review suggestion.

        Parameters
        ----------
        review:      The CodeReview ORM record serialised to dict.
                     Must contain: file_path, line_start, line_end,
                     original_code, suggested_code, category, severity, title.
        accepted_by: Username of the developer who accepted the suggestion.

        Returns
        -------
        dict with keys: success, commit_hash, message, error.
        """
        file_path = review.get("file_path", "")
        original_code = review.get("original_code") or ""
        suggested_code = review.get("suggested_code") or ""
        category = review.get("category", "improvement")
        severity = review.get("severity", "info")
        title = review.get("title", "Code improvement")
        line_start = review.get("line_start")
        line_end = review.get("line_end")

        if not suggested_code.strip():
            return {"success": False, "error": "No suggested_code available for this review"}

        target = self.working_copy / file_path.lstrip("/\\").replace("\\", "/")

        if not target.exists():
            # Try alternate: just the filename without directory nesting
            alt = self.working_copy / Path(file_path).name
            if alt.exists():
                target = alt
            else:
                return {"success": False, "error": f"File not found in working copy: {target}"}

        # 1. Read current file content
        try:
            content = target.read_text(encoding="utf-8")
        except OSError as exc:
            return {"success": False, "error": f"Cannot read file: {exc}"}

        # 2. Patch the content
        attribution = self._make_attribution(
            target.suffix, category, severity, accepted_by,
        )
        patched, ok = self._patch_content(
            content, original_code, suggested_code, attribution, line_start, line_end,
        )
        if not ok:
            return {"success": False, "error": "Could not locate original_code in file to replace"}

        # 3. Write patched file
        try:
            target.write_text(patched, encoding="utf-8")
        except OSError as exc:
            return {"success": False, "error": f"Cannot write patched file: {exc}"}

        # 4. Git add + commit + push
        commit_msg = (
            f"[AI-Review] Fix: {title}\n\n"
            f"Category: {category} | Severity: {severity}\n"
            f"Accepted-By: {accepted_by}\n"
            f"Reviewed-By: AI-Review Bot\n"
            f"Timestamp: {datetime.now(timezone.utc).isoformat()}"
        )
        result = self._git_commit_and_push(
            file_path=str(target.relative_to(self.working_copy)),
            commit_message=commit_msg,
        )
        return result

    # ── internal helpers ────────────────────────────────────────────────────────

    def _make_attribution(
        self, suffix: str, category: str, severity: str, user: str,
    ) -> str:
        template = ATTRIBUTION_TEMPLATES.get(suffix.lower(), DEFAULT_ATTRIBUTION)
        return template.format(
            category=category,
            severity=severity,
            user=user,
            date=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        )

    def _patch_content(
        self,
        content: str,
        original_code: str,
        suggested_code: str,
        attribution: str,
        line_start: int | None,
        line_end: int | None,
    ) -> tuple[str, bool]:
        """Replace original_code with attribution + suggested_code in content.

        Strategy:
          1. Try exact string match (most reliable when original_code is exact).
          2. Fall back to line-range replacement if line numbers are available.
          3. If both fail, return (content, False).
        """
        if original_code.strip() and original_code.strip() in content:
            # Exact match — replace first occurrence
            patched = content.replace(
                original_code.strip(),
                attribution + suggested_code,
                1,
            )
            return patched, True

        # Line-range replacement
        if line_start is not None:
            lines = content.splitlines(keepends=True)
            start_idx = max(0, line_start - 1)
            end_idx = line_end if line_end else line_start
            end_idx = min(end_idx, len(lines))

            suggested_lines = (suggested_code + "\n").splitlines(keepends=True)
            attribution_line = [attribution] if not attribution.endswith("\n") else [attribution]

            patched_lines = lines[:start_idx] + attribution_line + suggested_lines + lines[end_idx:]
            return "".join(patched_lines), True

        return content, False

    def _git_commit_and_push(
        self, file_path: str, commit_message: str,
    ) -> dict[str, Any]:
        """Stage, commit, and push the change."""
        cwd = str(self.working_copy)
        env_extra = {
            "GIT_AUTHOR_NAME": AI_AUTHOR_NAME,
            "GIT_AUTHOR_EMAIL": AI_AUTHOR_EMAIL,
            "GIT_COMMITTER_NAME": AI_AUTHOR_NAME,
            "GIT_COMMITTER_EMAIL": AI_AUTHOR_EMAIL,
        }

        import os
        env = {**os.environ, **env_extra}

        try:
            # git add <file>
            subprocess.run(
                [GIT_BIN, "add", file_path],
                cwd=cwd, env=env, capture_output=True, check=True,
            )

            # git commit
            result = subprocess.run(
                [GIT_BIN, "commit", "-m", commit_message],
                cwd=cwd, env=env, capture_output=True, text=True, check=True,
            )

            # Extract commit hash
            hash_result = subprocess.run(
                [GIT_BIN, "rev-parse", "HEAD"],
                cwd=cwd, capture_output=True, text=True, check=True,
            )
            commit_hash = hash_result.stdout.strip()

            # git push origin <default-branch>
            subprocess.run(
                [GIT_BIN, "push"],
                cwd=cwd, env=env, capture_output=True, check=True,
            )

            logger.info(
                "✅  AI commit applied: %s → pushed to remote", commit_hash[:8],
            )
            return {
                "success": True,
                "commit_hash": commit_hash,
                "message": result.stdout.strip(),
            }

        except subprocess.CalledProcessError as exc:
            stderr = exc.stderr if isinstance(exc.stderr, str) else exc.stderr.decode("utf-8", errors="replace")
            logger.error("CommitApplier git error: %s", stderr[:500])
            return {"success": False, "error": f"Git error: {stderr[:300]}"}
        except Exception as exc:
            logger.error("CommitApplier unexpected error: %s", exc)
            return {"success": False, "error": str(exc)}
