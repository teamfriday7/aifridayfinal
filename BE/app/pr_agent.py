"""Pull Request AI Agent — Branch comparison, conflict detection & AI resolution.

Analyzes diffs between git branches, uses LLM to generate intelligent merge
resolutions, and optionally commits approved resolutions as AI commits.
"""
from __future__ import annotations

import json
import logging
import subprocess
from pathlib import Path
from typing import Any, Optional

import httpx

logger = logging.getLogger("pr_agent")

# ── Configuration ────────────────────────────────────────────────────────────
BASE_URL = "https://genailab.tcs.in"
LLM_MODEL = "genailab-maas-gpt-4o"
API_KEY = "sk--1lLRHorZ8dhmySyuA5XrA"
GIT_BINARY = r"C:\Users\GenAITVMSEZUSR4\AppData\Local\Programs\Git\cmd\git.exe"
DEFAULT_REPO = r"C:\GitRemote"

PR_SYSTEM_PROMPT = """You are a senior merge resolution expert. You analyze git diffs between two branches
and produce clean, conflict-free merged code.

Your response MUST be a valid JSON object with this EXACT schema:
{
  "has_conflicts": <boolean>,
  "summary": "<2-3 sentence summary of what changed between the branches>",
  "files_changed": <integer>,
  "insertions": <integer>,
  "deletions": <integer>,
  "conflicts": [
    {
      "file_path": "<relative path>",
      "conflict_type": "<Both Modified | Delete/Modify | Add/Add>",
      "description": "<what the conflict is about>",
      "source_code": "<the code from the source branch>",
      "dest_code": "<the code from the destination branch>",
      "ai_resolution": "<your intelligently merged code that combines both changes>",
      "resolution_explanation": "<explain why this merge is correct>"
    }
  ],
  "recommendations": ["<list of recommendations for the developer>"]
}

Rules:
- Analyze the diff carefully to detect ANY conflicting changes.
- For each conflict, provide a complete, working AI resolution that intelligently merges both sides.
- If there are no conflicts, set has_conflicts to false and return an empty conflicts array.
- Be thorough — even subtle conflicts like different import additions should be caught.
- Return ONLY the JSON object. No markdown fences, no explanation text outside JSON.
"""


class PRAgent:
    """AI-powered Pull Request agent for branch comparison and merge resolution."""

    def __init__(self, repo_path: str = DEFAULT_REPO) -> None:
        self.repo_path = Path(repo_path)
        self._client = httpx.AsyncClient(
            base_url=BASE_URL,
            headers={
                "Authorization": f"Bearer {API_KEY}",
                "Content-Type": "application/json",
            },
            verify=False,
            timeout=90.0,
        )

    async def close(self) -> None:
        await self._client.aclose()

    # ── Git helpers ──────────────────────────────────────────────────────────

    def _git(self, *args: str) -> subprocess.CompletedProcess[str]:
        """Run a git command against the repository."""
        cmd = [GIT_BINARY, "-C", str(self.repo_path)] + list(args)
        return subprocess.run(
            cmd, capture_output=True, text=True, timeout=30,
            encoding="utf-8", errors="replace",
        )

    def list_branches(self) -> list[dict[str, str]]:
        """List all branches (local + remote) in the repository."""
        result = self._git("branch", "-a", "--format=%(refname:short) %(objectname:short) %(committerdate:relative)")
        if result.returncode != 0:
            logger.error("Failed to list branches: %s", result.stderr)
            return []

        branches = []
        seen = set()
        for line in result.stdout.strip().splitlines():
            parts = line.strip().split(" ", 2)
            if len(parts) < 2:
                continue
            name = parts[0]
            # Normalize remote branch names
            if name.startswith("origin/"):
                name = name[7:]  # strip origin/
            if name == "HEAD" or name in seen:
                continue
            seen.add(name)
            branches.append({
                "name": name,
                "short_hash": parts[1],
                "last_activity": parts[2] if len(parts) > 2 else "unknown",
            })

        logger.info("PR Agent: found %d branches", len(branches))
        return branches

    def get_branch_diff(self, source: str, destination: str) -> dict[str, Any]:
        """Get the diff between two branches."""
        # Try with and without origin/ prefix
        for src in [source, f"origin/{source}"]:
            for dst in [destination, f"origin/{destination}"]:
                result = self._git("diff", f"{dst}...{src}")
                if result.returncode == 0 and result.stdout.strip():
                    diff = result.stdout

                    # Get changed file names
                    stat_result = self._git("diff", "--stat", f"{dst}...{src}")
                    stat_text = stat_result.stdout.strip() if stat_result.returncode == 0 else ""

                    # Get list of changed files
                    name_result = self._git("diff", "--name-only", f"{dst}...{src}")
                    changed_files = (
                        name_result.stdout.strip().splitlines()
                        if name_result.returncode == 0 else []
                    )

                    return {
                        "success": True,
                        "diff": diff,
                        "stat": stat_text,
                        "changed_files": changed_files,
                        "files_changed": len(changed_files),
                    }

        return {
            "success": False,
            "error": f"Could not compute diff between '{source}' and '{destination}'. Check branch names.",
            "diff": "",
            "changed_files": [],
            "files_changed": 0,
        }

    # ── LLM Analysis ─────────────────────────────────────────────────────────

    async def analyze_pr(self, source: str, destination: str) -> dict[str, Any]:
        """Full PR analysis: get diff, run AI agent, return structured result."""
        logger.info("🔀  PR Agent: comparing %s → %s", source, destination)

        diff_result = self.get_branch_diff(source, destination)
        if not diff_result["success"]:
            return {
                "success": False,
                "error": diff_result["error"],
                "agent_log": ["❌ Failed to compute branch diff"],
            }

        diff_content = diff_result["diff"]
        changed_files = diff_result["changed_files"]

        # Truncate to avoid token limits
        truncated_diff = diff_content[:12000] if len(diff_content) > 12000 else diff_content

        user_prompt = (
            f"SOURCE BRANCH: {source}\n"
            f"DESTINATION BRANCH: {destination}\n"
            f"\nCHANGED FILES ({len(changed_files)}):\n"
            + "\n".join(f"  - {f}" for f in changed_files)
            + f"\n\nGIT DIFF:\n```diff\n{truncated_diff}\n```\n\n"
            "Analyze this diff for merge conflicts and provide AI resolutions."
        )

        agent_log = [
            f"🔍 Computing diff: {source} → {destination}",
            f"📂 Found {len(changed_files)} changed file(s)",
            "🤖 Running AI merge conflict analysis...",
        ]

        try:
            payload = {
                "model": LLM_MODEL,
                "messages": [
                    {"role": "system", "content": PR_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                "temperature": 0.1,
                "max_tokens": 4096,
            }

            resp = await self._client.post("/v1/chat/completions", json=payload)
            resp.raise_for_status()

            data = resp.json()
            raw = data["choices"][0]["message"]["content"].strip()

            analysis = self._parse_json(raw)
            if analysis is None:
                agent_log.append("⚠️ LLM returned non-JSON, using raw text")
                analysis = {
                    "has_conflicts": False,
                    "summary": raw[:500],
                    "files_changed": len(changed_files),
                    "insertions": 0,
                    "deletions": 0,
                    "conflicts": [],
                    "recommendations": [],
                }

            agent_log.append(
                f"✅ Analysis complete: {len(analysis.get('conflicts', []))} conflict(s) found"
            )

            logger.info(
                "🔀  PR Agent: analysis done — %d conflicts",
                len(analysis.get("conflicts", [])),
            )

            return {
                "success": True,
                "source_branch": source,
                "destination_branch": destination,
                "diff_stat": diff_result["stat"],
                "changed_files": changed_files,
                "analysis": analysis,
                "agent_log": agent_log,
            }

        except Exception as exc:
            logger.error("PR Agent LLM error: %s", exc)
            agent_log.append(f"❌ AI analysis failed: {exc}")
            return {
                "success": False,
                "error": str(exc),
                "agent_log": agent_log,
            }

    # ── Merge commit ─────────────────────────────────────────────────────────

    def apply_ai_merge(self, source: str, destination: str, resolution_files: list[dict]) -> dict[str, Any]:
        """Apply AI-generated merge resolution and commit.

        Parameters
        ----------
        source:           Source branch name.
        destination:      Destination branch name.
        resolution_files: List of {"file_path": ..., "content": ...} AI resolutions.
        """
        logger.info("🔀  PR Agent: applying AI merge %s → %s", source, destination)

        try:
            # Checkout destination branch
            checkout = self._git("checkout", destination)
            if checkout.returncode != 0:
                return {"success": False, "error": f"Failed to checkout {destination}: {checkout.stderr}"}

            # Write resolved files
            for f in resolution_files:
                file_path = self.repo_path / f["file_path"]
                file_path.parent.mkdir(parents=True, exist_ok=True)
                file_path.write_text(f["content"], encoding="utf-8")

            # Stage and commit
            self._git("add", ".")
            commit_msg = f"AI Merge: {source} → {destination} (resolved by PR Agent)"
            commit_result = self._git("commit", "-m", commit_msg)

            if commit_result.returncode != 0:
                return {"success": False, "error": f"Commit failed: {commit_result.stderr}"}

            # Get the new commit hash
            hash_result = self._git("rev-parse", "HEAD")
            commit_hash = hash_result.stdout.strip() if hash_result.returncode == 0 else "unknown"

            logger.info("✅  PR Agent: AI merge committed as %s", commit_hash[:8])
            return {
                "success": True,
                "commit_hash": commit_hash,
                "message": commit_msg,
            }

        except Exception as exc:
            logger.error("PR Agent merge error: %s", exc)
            return {"success": False, "error": str(exc)}

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _parse_json(self, raw: str) -> Optional[dict]:
        """Parse LLM JSON output, handling markdown fences."""
        text = raw.strip()
        if text.startswith("```"):
            lines = text.splitlines()
            text = "\n".join(
                line for line in lines if not line.strip().startswith("```")
            ).strip()

        start = text.find("{")
        end = text.rfind("}")
        if start < 0 or end < start:
            return None

        try:
            return json.loads(text[start : end + 1])
        except json.JSONDecodeError:
            logger.warning("PR Agent: failed to parse LLM JSON")
            return None
