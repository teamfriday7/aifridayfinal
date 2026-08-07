"""Enterprise Code Analysis — Real-time Git commit watcher.

Polls local git repositories for new commits and emits events when detected.
Supports both bare and regular repositories.
"""
from __future__ import annotations

import asyncio
import logging
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Any, Callable, Optional

from sqlalchemy.orm import Session

from .database import SessionLocal
from .models import Commit, Project

logger = logging.getLogger("git_watcher")

# ─── Git binary path (auto-detected or hardcoded) ──────────────────────────────
GIT_BINARY = r"C:\Users\GenAITVMSEZUSR4\AppData\Local\Programs\Git\cmd\git.exe"


class GitWatcher:
    """Watches a single git repository for new commits via polling."""

    def __init__(
        self,
        project_id: int,
        repo_path: str,
        on_commit: Optional[Callable] = None,
        polling_interval: float = 3.0,
    ) -> None:
        self.project_id = project_id
        self.repo_path = Path(repo_path)
        self.on_commit = on_commit
        self.polling_interval = polling_interval
        self.last_commit_hash: Optional[str] = None
        self.running = False
        self._task: Optional[asyncio.Task] = None

    # ── low-level git helpers ───────────────────────────────────────────────

    def _git(self, *args: str) -> subprocess.CompletedProcess[str]:
        """Run a git command against the watched repository."""
        cmd = [GIT_BINARY, "-C", str(self.repo_path)] + list(args)
        return subprocess.run(
            cmd, capture_output=True, text=True, timeout=30,
            encoding="utf-8", errors="replace",
        )

    def _is_bare(self) -> bool:
        result = self._git("rev-parse", "--is-bare-repository")
        return result.returncode == 0 and result.stdout.strip() == "true"

    # ── commit introspection ────────────────────────────────────────────────

    def get_latest_commit_hash(self) -> Optional[str]:
        """Return the hash of the latest commit on the default branch."""
        for ref in ("refs/heads/main", "refs/heads/master", "HEAD"):
            result = self._git("rev-parse", ref)
            if result.returncode == 0 and result.stdout.strip():
                return result.stdout.strip()
        return None

    def get_commit_info(self, commit_hash: str) -> Optional[dict[str, Any]]:
        """Return structured metadata for a single commit."""
        result = self._git(
            "log", "-1", "--format=%H|%an|%ae|%at|%s", commit_hash,
        )
        if result.returncode != 0:
            return None
        parts = result.stdout.strip().split("|", 4)
        if len(parts) < 4:
            return None
        return {
            "hash": parts[0],
            "author_name": parts[1],
            "author_email": parts[2],
            "timestamp": datetime.fromtimestamp(int(parts[3])),
            "message": parts[4] if len(parts) > 4 else "",
        }

    def get_commit_diff(self, commit_hash: str) -> str:
        """Return the full diff introduced by *commit_hash*."""
        result = self._git("diff", f"{commit_hash}~1", commit_hash)
        if result.returncode != 0:
            # First commit in the repo — use `show` as fallback.
            result = self._git("show", "--format=", "--patch", commit_hash)
        return result.stdout if result.returncode == 0 else ""

    def get_commit_stats(self, commit_hash: str) -> dict[str, int]:
        """Return files_changed / insertions / deletions for a commit."""
        result = self._git("diff", "--numstat", f"{commit_hash}~1", commit_hash)
        files_changed = insertions = deletions = 0
        if result.returncode == 0 and result.stdout.strip():
            for line in result.stdout.strip().splitlines():
                parts = line.split("\t")
                if len(parts) >= 3:
                    files_changed += 1
                    try:
                        insertions += int(parts[0]) if parts[0] != "-" else 0
                        deletions += int(parts[1]) if parts[1] != "-" else 0
                    except ValueError:
                        pass
        return {
            "files_changed": files_changed,
            "insertions": insertions,
            "deletions": deletions,
        }

    def get_changed_files(self, commit_hash: str) -> list[str]:
        """Return the list of file paths changed in a commit."""
        result = self._git("diff", "--name-only", f"{commit_hash}~1", commit_hash)
        if result.returncode != 0:
            result = self._git("show", "--format=", "--name-only", commit_hash)
        if result.returncode == 0 and result.stdout.strip():
            return [f.strip() for f in result.stdout.strip().splitlines() if f.strip()]
        return []

    # ── new-commit detection ────────────────────────────────────────────────

    def get_new_commits(self) -> list[dict[str, Any]]:
        """Return a list of commits that appeared since the last poll."""
        current_head = self.get_latest_commit_hash()
        if not current_head:
            return []

        # First poll — record HEAD; don't replay history.
        if self.last_commit_hash is None:
            self.last_commit_hash = current_head
            logger.info(
                "📌 Initialized watcher at HEAD: %s (project %d)",
                current_head[:8], self.project_id,
            )
            return []

        if current_head == self.last_commit_hash:
            return []

        # Gather new commits in chronological order.
        result = self._git(
            "log", f"{self.last_commit_hash}..{current_head}",
            "--format=%H", "--reverse",
        )
        if result.returncode != 0 or not result.stdout.strip():
            # Possible force-push or rebase — just jump to current HEAD.
            self.last_commit_hash = current_head
            return []

        commits: list[dict[str, Any]] = []
        for line in result.stdout.strip().splitlines():
            sha = line.strip()
            if not sha:
                continue
            info = self.get_commit_info(sha)
            if info:
                info.update(self.get_commit_stats(sha))
                info["diff_content"] = self.get_commit_diff(sha)
                info["changed_files"] = self.get_changed_files(sha)
                info["project_id"] = self.project_id
                commits.append(info)

        if commits:
            self.last_commit_hash = commits[-1]["hash"]

        return commits

    # ── persistence ─────────────────────────────────────────────────────────

    @staticmethod
    def save_commit(commit_info: dict[str, Any]) -> Optional[Commit]:
        """Persist a commit record to the database."""
        db: Session = SessionLocal()
        try:
            if db.query(Commit).filter(Commit.hash == commit_info["hash"]).first():
                return None  # already recorded

            commit = Commit(
                hash=commit_info["hash"],
                author_name=commit_info["author_name"],
                author_email=commit_info["author_email"],
                message=commit_info["message"],
                timestamp=commit_info["timestamp"],
                project_id=commit_info["project_id"],
                files_changed=commit_info.get("files_changed", 0),
                insertions=commit_info.get("insertions", 0),
                deletions=commit_info.get("deletions", 0),
                diff_content=commit_info.get("diff_content", ""),
                analysis_status="pending",
            )
            db.add(commit)

            # Update the project bookmark.
            project = db.query(Project).filter(
                Project.id == commit_info["project_id"],
            ).first()
            if project:
                project.last_watched_commit = commit_info["hash"]

            db.commit()
            db.refresh(commit)
            return commit
        except Exception as exc:
            db.rollback()
            logger.error("Error saving commit %s: %s", commit_info["hash"][:8], exc)
            return None
        finally:
            db.close()

    # ── main loop ───────────────────────────────────────────────────────────

    async def _poll_loop(self) -> None:
        is_bare = self._is_bare()
        logger.info("=" * 62)
        logger.info("🔍  GIT WATCHER STARTED")
        logger.info("    Project ID : %d", self.project_id)
        logger.info("    Repo       : %s (%s)", self.repo_path, "bare" if is_bare else "regular")
        logger.info("    Interval   : %.1fs", self.polling_interval)
        logger.info("=" * 62)

        # Resume from last-known commit if present in the DB.
        db = SessionLocal()
        try:
            project = db.query(Project).filter(Project.id == self.project_id).first()
            if project and project.last_watched_commit:
                self.last_commit_hash = project.last_watched_commit
                logger.info("    Resuming from commit %s", self.last_commit_hash[:8])
        finally:
            db.close()

        while self.running:
            try:
                new_commits = self.get_new_commits()
                for info in new_commits:
                    logger.info("=" * 62)
                    logger.info("🚀  COMMIT DETECTED!")
                    logger.info("    Hash    : %s", info["hash"][:12])
                    logger.info("    Author  : %s <%s>", info["author_name"], info["author_email"])
                    logger.info("    Message : %s", info["message"])
                    logger.info("    Stats   : %d file(s), +%d -%d",
                                info.get("files_changed", 0),
                                info.get("insertions", 0),
                                info.get("deletions", 0))
                    if info.get("changed_files"):
                        for fp in info["changed_files"][:10]:
                            logger.info("    File    : %s", fp)
                    logger.info("=" * 62)

                    saved = self.save_commit(info)

                    if self.on_commit:
                        try:
                            await self.on_commit(info, saved)
                        except Exception as cb_err:
                            logger.error("Commit callback error: %s", cb_err)
            except Exception as poll_err:
                logger.error("Polling error: %s", poll_err)

            await asyncio.sleep(self.polling_interval)

    async def start(self) -> None:
        """Launch the polling loop as a background asyncio Task."""
        self.running = True
        self._task = asyncio.create_task(self._poll_loop())

    def stop(self) -> None:
        """Signal the polling loop to exit."""
        self.running = False
        if self._task and not self._task.done():
            self._task.cancel()
        logger.info("🛑  Git Watcher STOPPED for project %d", self.project_id)


# ─── Manager: coordinate watchers for multiple projects ─────────────────────────


class GitWatcherManager:
    """Lifecycle manager for per-project GitWatcher instances."""

    def __init__(self) -> None:
        self.watchers: dict[int, GitWatcher] = {}
        self._callbacks: list[Callable] = []

    def add_callback(self, callback: Callable) -> None:
        """Register a callback invoked on every new commit across all projects."""
        self._callbacks.append(callback)

    async def _relay_commit(self, commit_info: dict, saved_commit: Optional[Commit]) -> None:
        for cb in self._callbacks:
            try:
                await cb(commit_info, saved_commit)
            except Exception as exc:
                logger.error("Relay callback error: %s", exc)

    async def start_watching(self, project_id: int, repo_path: str) -> None:
        if project_id in self.watchers:
            logger.warning("Already watching project %d — skipping", project_id)
            return
        watcher = GitWatcher(
            project_id=project_id,
            repo_path=repo_path,
            on_commit=self._relay_commit,
        )
        self.watchers[project_id] = watcher
        await watcher.start()

    async def stop_watching(self, project_id: int) -> None:
        watcher = self.watchers.pop(project_id, None)
        if watcher:
            watcher.stop()

    async def stop_all(self) -> None:
        for watcher in self.watchers.values():
            watcher.stop()
        self.watchers.clear()

    async def start_all_active_projects(self) -> None:
        """Start watchers for every active project whose repo path exists."""
        db = SessionLocal()
        try:
            projects = (
                db.query(Project)
                .filter(Project.is_active == True)  # noqa: E712
                .all()
            )
            for project in projects:
                if Path(project.repo_path).exists():
                    await self.start_watching(project.id, project.repo_path)
                else:
                    logger.warning(
                        "⚠️  Repo path does not exist for project '%s': %s",
                        project.name, project.repo_path,
                    )
        finally:
            db.close()
