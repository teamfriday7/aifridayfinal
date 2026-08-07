"""Enterprise Code Analysis — Knowledge Base Agent.

Adapts the chatbot OKF pipeline (extractor_agent + formatter_agent) to run
as an async FastAPI background task on each detected commit.

For every changed file in a commit the agent:
  1. Reads the file text from a temp clone of the repo at the commit hash.
  2. Calls the LLM extractor to produce a structured FileKnowledge record.
  3. Feeds all records into the formatter to produce a RAG-optimised Markdown
     knowledge base stored at  BE/data/kb/<commit_hash>.md.
  4. Returns the raw FileKnowledge records for downstream analysis.

The knowledge base is then consumed by CodeLogicAnalyzer for richer context.
"""
from __future__ import annotations

import asyncio
import json
import logging
import shutil
import subprocess
import sys
import tempfile
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any

logger = logging.getLogger("kb_agent")

# ── Chatbot pipeline path injection ────────────────────────────────────────────
# The chatbot/ package lives beside BE/ in the monorepo.  We add it to sys.path
# so we can import extractor_agent and formatter_agent without copying code.

CHATBOT_DIR = Path(__file__).resolve().parent.parent.parent / "chatbot"
if str(CHATBOT_DIR) not in sys.path and CHATBOT_DIR.is_dir():
    sys.path.insert(0, str(CHATBOT_DIR))

KB_OUTPUT_DIR = Path(__file__).resolve().parent.parent / "data" / "kb"
KB_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Git binary (same as git_watcher.py)
GIT_BIN = r"C:\Users\GenAITVMSEZUSR4\AppData\Local\Programs\Git\cmd\git.exe"

# Max chars to send per file to the extractor LLM
MAX_CHARS_PER_FILE = 60_000

SOURCE_SUFFIXES = {
    ".py", ".js", ".jsx", ".ts", ".tsx", ".java", ".kt", ".go",
    ".cs", ".rb", ".php", ".sh", ".ps1", ".sql", ".html", ".css",
    ".scss", ".json", ".yaml", ".yml", ".toml", ".xml", ".md",
}


class KnowledgeBaseAgent:
    """Generates a structured knowledge base from changed files in a commit."""

    def __init__(self, workers: int = 3, retries: int = 2) -> None:
        self.workers = workers
        self.retries = retries

    # ── public API ──────────────────────────────────────────────────────────────

    async def generate_for_commit(
        self,
        repo_path: str,
        commit_hash: str,
        changed_files: list[str],
    ) -> dict[str, Any]:
        """Run KB extraction for a single commit.

        Returns
        -------
        dict with keys:
          - ``knowledge_base_path``: Path to the written .md file
          - ``records``: list[FileKnowledge.to_dict()]
          - ``summary``: dict with counts / status
        """
        logger.info("📚  KB Agent started — commit %s, %d file(s)", commit_hash[:8], len(changed_files))

        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            self._run_sync,
            repo_path,
            commit_hash,
            changed_files,
        )
        return result

    # ── internal sync implementation (runs in thread pool) ─────────────────────

    def _run_sync(
        self,
        repo_path: str,
        commit_hash: str,
        changed_files: list[str],
    ) -> dict[str, Any]:
        """Sync implementation executed inside an executor thread."""
        with tempfile.TemporaryDirectory(prefix="kb_agent_") as tmpdir:
            tmp_path = Path(tmpdir)

            # 1. Clone bare repo and checkout the commit
            try:
                subprocess.run(
                    [GIT_BIN, "clone", repo_path, "."],
                    cwd=str(tmp_path), capture_output=True, check=True,
                )
                subprocess.run(
                    [GIT_BIN, "checkout", commit_hash],
                    cwd=str(tmp_path), capture_output=True, check=True,
                )
            except subprocess.CalledProcessError as exc:
                logger.error("KB Agent: git clone/checkout failed: %s", exc)
                return {"knowledge_base_path": None, "records": [], "summary": {"status": "git_error"}}

            # 2. Resolve files to analyse — use changed_files if provided, else scan all
            if changed_files:
                target_paths = []
                for rel in changed_files:
                    p = tmp_path / rel.replace("\\", "/")
                    if p.exists() and p.is_file() and p.suffix.lower() in SOURCE_SUFFIXES:
                        target_paths.append(p)
            else:
                target_paths = [
                    p for p in tmp_path.rglob("*")
                    if p.is_file() and p.suffix.lower() in SOURCE_SUFFIXES
                    and not any(part in {".git", "node_modules", "__pycache__", ".next", "dist", "build"}
                                for part in p.parts)
                ]

            if not target_paths:
                logger.warning("KB Agent: no source files to extract for commit %s", commit_hash[:8])
                return {"knowledge_base_path": None, "records": [], "summary": {"status": "no_files"}}

            # 3. Extract FileKnowledge records in parallel
            records = self._extract_parallel(target_paths, tmp_path)

            if not records:
                return {"knowledge_base_path": None, "records": [], "summary": {"status": "extraction_failed"}}

            # 4. Format into Markdown knowledge base
            kb_md = self._format_kb(records, str(tmp_path))

            # 5. Write to disk
            kb_path = KB_OUTPUT_DIR / f"{commit_hash}.md"
            kb_path.write_text(kb_md, encoding="utf-8")
            logger.info("📚  KB Agent: wrote %s (%d files)", kb_path.name, len(records))

            return {
                "knowledge_base_path": str(kb_path),
                "records": [r.to_dict() for r in records],
                "kb_markdown": kb_md,
                "summary": {
                    "status": "ok",
                    "files_processed": len(records),
                    "kb_path": str(kb_path),
                },
            }

    def _extract_parallel(self, target_paths: list[Path], root: Path) -> list:
        """Extract FileKnowledge from files using a thread pool."""
        try:
            from extractor_agent import extract_file  # type: ignore[import]
        except ImportError as exc:
            logger.error("KB Agent: cannot import extractor_agent: %s", exc)
            return []

        records = []
        failures = []

        with ThreadPoolExecutor(max_workers=self.workers, thread_name_prefix="kb_ext") as pool:
            futures = {
                pool.submit(extract_file, path, root, self.retries): path
                for path in target_paths
            }
            for future in as_completed(futures):
                path = futures[future]
                try:
                    rec = future.result()
                    records.append(rec)
                except Exception as exc:
                    rel = path.relative_to(root)
                    failures.append(str(rel))
                    logger.warning("KB Agent: skipped %s — %s", rel, exc)

        if failures:
            logger.warning("KB Agent: %d extraction failure(s): %s", len(failures), failures)
        return records

    def _format_kb(self, records: list, root: str) -> str:
        """Format records into RAG-optimised Markdown."""
        try:
            from formatter_agent import format_knowledge_base  # type: ignore[import]
            return format_knowledge_base(records, root, retries=self.retries)
        except ImportError as exc:
            logger.error("KB Agent: cannot import formatter_agent: %s", exc)
            return self._fallback_format(records)

    @staticmethod
    def _fallback_format(records: list) -> str:
        """Deterministic fallback if formatter_agent is unavailable."""
        lines = ["# Knowledge Base (fallback)", ""]
        for r in records:
            d = r.to_dict() if hasattr(r, "to_dict") else r
            lines.append(f"## File: {d.get('path', '?')}")
            lines.append(f"Language: **{d.get('language', '?')}**")
            for sym in d.get("symbols", []):
                lines.append(f"- {sym.get('kind','symbol')}: `{sym.get('name','?')}`")
            lines.append("")
        return "\n".join(lines)

    def load_kb(self, commit_hash: str) -> str | None:
        """Load a previously generated KB markdown for a commit."""
        kb_path = KB_OUTPUT_DIR / f"{commit_hash}.md"
        if kb_path.exists():
            return kb_path.read_text(encoding="utf-8")
        return None
