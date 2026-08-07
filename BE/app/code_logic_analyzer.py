"""Enterprise Code Analysis — LLM Code Logic Analyzer.

Uses the enterprise LLM to perform a deep analysis of code changes, checking for:
  - Logical flaws (off-by-one, null dereference, race conditions, dead code paths)
  - Enterprise guideline violations (naming, SOLID, exception handling, logging)
  - Maintainability issues (inspired by arXiv:2401.12714 LLM-as-judge framework)
  - Performance anti-patterns (N+1 queries, blocking async, unnecessary allocations)

Returns structured findings with original_code + suggested_code pairs and
maintainability sub-scores for each finding.
"""
from __future__ import annotations

import asyncio
import json
import logging
import re
from pathlib import Path
from typing import Any

import httpx

logger = logging.getLogger("logic_analyzer")

# ── LLM configuration (reuses BE/config.py values) ─────────────────────────────
BASE_URL = "https://genailab.tcs.in"
LLM_MODEL = "genailab-maas-gpt-4o"
API_KEY = "sk--1lLRHorZ8dhmySyuA5XrA"

# Maintainability scoring dimensions (arXiv:2401.12714 inspired)
MAINTAINABILITY_DIMENSIONS = [
    "readability",      # How easy is the code to read and understand?
    "modularity",       # Are functions/classes focused on a single responsibility?
    "testability",      # Can logic be unit-tested without heavy mocking?
    "documentation",    # Are functions/classes documented with docstrings?
    "error_handling",   # Are errors handled gracefully with specific exceptions?
    "complexity",       # Cyclomatic complexity / cognitive load (lower=better)
]

ENTERPRISE_GUIDELINES = """
ENTERPRISE CODING STANDARDS (all violations must be reported):

1. NAMING: Python → snake_case for vars/funcs, PascalCase for classes.
   TypeScript/JS → camelCase for vars/funcs, PascalCase for components/classes.
   Constants → UPPER_SNAKE_CASE. No single-letter variable names except loop counters.

2. FUNCTIONS: Maximum 50 lines per function. Each function must have a single,
   clearly stated responsibility. Avoid deeply nested conditionals (max 3 levels).

3. EXCEPTION HANDLING: Always catch specific exception types. Never use bare
   `except:` or `except Exception as e: pass`. Log exceptions with context.
   Re-raise or handle; never silently swallow errors.

4. LOGGING: Use structured logging (Python: logging module; JS: structured logger).
   Never use print() or console.log() in production paths. Include request IDs,
   user IDs, and relevant context in all log statements.

5. SECURITY: No hardcoded credentials, tokens, or secrets in code.
   Validate and sanitize all user inputs. Use parameterized queries for DB access.
   Never expose internal stack traces to API responses.

6. ASYNC/PERFORMANCE: Do not call blocking I/O inside async functions without
   executor. Avoid N+1 database query patterns. Cache expensive computations.
   Use connection pooling for DB and HTTP clients.

7. DOCUMENTATION: All public functions, classes, and modules must have docstrings.
   Describe parameters, return values, and raised exceptions.

8. RESOURCE MANAGEMENT: Always use context managers (with/using) for
   file handles, database sessions, network connections.

9. SOLID PRINCIPLES: Favor composition over inheritance. Depend on abstractions.
   Open for extension, closed for modification.

10. DEAD CODE: Remove unreachable branches, unused imports, commented-out code,
    and unused variables. They increase cognitive load and maintenance burden.
"""

ANALYSIS_SYSTEM_PROMPT = f"""You are a senior enterprise software architect and code quality expert with 20 years of experience.
You perform rigorous code reviews to find logical flaws, enterprise guideline violations,
and maintainability issues.

{ENTERPRISE_GUIDELINES}

Your response MUST be a valid JSON array. Each element is a finding object with this EXACT schema:
{{
  "file_path": "relative/path/to/file.py",
  "line_start": <integer or null>,
  "line_end": <integer or null>,
  "category": "<one of: logic|guideline|maintainability|performance|security>",
  "severity": "<one of: critical|high|medium|low|info>",
  "title": "<concise title, max 80 chars>",
  "message": "<DETAILED explanation of the issue, why it is bad, what exact lines are affected, and what needs to be changed. Include review comments in a detailed manner.>",
  "original_code": "<the exact problematic code snippet, max 20 lines>",
  "suggested_code": "<the highly detailed, complete improved code snippet that fixes the issue>",
  "maintainability_scores": {{
    "readability": <1-10>,
    "modularity": <1-10>,
    "testability": <1-10>,
    "documentation": <1-10>,
    "error_handling": <1-10>,
    "complexity": <1-10, where 10=simple, 1=very complex>
  }},
  "confidence": <0.0 to 1.0>,
  "guideline_ref": "<which guideline number from 1-10, or null>"
}}

Rules:
- Only report REAL issues you can see in the code. Never invent problems.
- For each issue, provide a concrete suggested fix, not just a description.
- Do NOT report issues about the knowledge base / documentation text itself.
- Focus on the DIFF (changed lines), not the entire file.
- Maintainability scores apply to the CHANGED CODE block, not the whole file.
- Return [] if the code is good and you find no meaningful issues.
- Return ONLY the JSON array. No markdown fences, no explanation text.
"""


class CodeLogicAnalyzer:
    """LLM-powered analyzer for logic, guidelines, and maintainability."""

    def __init__(self, timeout: float = 90.0) -> None:
        self._client = httpx.AsyncClient(
            base_url=BASE_URL,
            headers={
                "Authorization": f"Bearer {API_KEY}",
                "Content-Type": "application/json",
            },
            verify=False,
            timeout=timeout,
        )

    async def close(self) -> None:
        await self._client.aclose()

    async def analyze(
        self,
        diff_content: str,
        knowledge_base: str | None,
        changed_files: list[str],
        commit_message: str = "",
    ) -> list[dict[str, Any]]:
        """Run logic + guideline + maintainability analysis on a commit diff.

        Parameters
        ----------
        diff_content:    Full git diff output for the commit.
        knowledge_base:  Optional KB markdown from KnowledgeBaseAgent.
        changed_files:   List of relative file paths that changed.
        commit_message:  The git commit message.

        Returns
        -------
        List of finding dicts conforming to the schema above.
        """
        if not diff_content or not diff_content.strip():
            logger.info("Logic Analyzer: empty diff, skipping")
            return []

        # Truncate diff to avoid token limits
        truncated_diff = diff_content[:8000] if len(diff_content) > 8000 else diff_content

        # Extract only the relevant KB sections for changed files
        kb_context = self._extract_relevant_kb(knowledge_base, changed_files)

        user_prompt = self._build_user_prompt(truncated_diff, kb_context, commit_message, changed_files)

        logger.info("🔍  Logic Analyzer: analysing commit diff (%d changed files) ...", len(changed_files))

        try:
            findings = await self._call_llm(user_prompt)
            logger.info("🔍  Logic Analyzer: found %d issue(s)", len(findings))
            return findings
        except Exception as exc:
            logger.error("Logic Analyzer error: %s", exc)
            return []

    # ── helpers ─────────────────────────────────────────────────────────────────

    def _build_user_prompt(
        self,
        diff: str,
        kb_context: str,
        commit_message: str,
        changed_files: list[str],
    ) -> str:
        files_str = "\n".join(f"  - {f}" for f in changed_files)
        parts = [
            f"COMMIT MESSAGE: {commit_message}",
            "",
            f"CHANGED FILES:\n{files_str}",
            "",
        ]
        if kb_context:
            parts += [
                "KNOWLEDGE BASE CONTEXT (architecture + symbols for context):",
                "```",
                kb_context[:3000],
                "```",
                "",
            ]
        parts += [
            "GIT DIFF (focus your analysis here):",
            "```diff",
            diff,
            "```",
            "",
            "Analyse the diff above and return your findings as a JSON array.",
            "Pay special attention to:",
            "  1. Logic errors introduced by the changes",
            "  2. Violations of the 10 enterprise coding standards",
            "  3. Maintainability regressions (score each changed block)",
            "  4. Performance and security issues",
        ]
        return "\n".join(parts)

    def _extract_relevant_kb(self, kb_markdown: str | None, changed_files: list[str]) -> str:
        """Extract sections from the KB markdown relevant to the changed files."""
        if not kb_markdown:
            return ""
        if not changed_files:
            return kb_markdown[:2000]

        lines = kb_markdown.splitlines()
        relevant_lines: list[str] = []
        in_section = False

        for line in lines:
            # Look for "### File: <path>" headers
            if line.startswith("### File:"):
                in_section = any(
                    cf.replace("\\", "/").lower() in line.lower()
                    for cf in changed_files
                )
            if in_section:
                relevant_lines.append(line)

        return "\n".join(relevant_lines) if relevant_lines else kb_markdown[:1500]

    async def _call_llm(self, user_prompt: str) -> list[dict]:
        """Call the enterprise LLM and parse the JSON response."""
        payload = {
            "model": LLM_MODEL,
            "messages": [
                {"role": "system", "content": ANALYSIS_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.1,
            "max_tokens": 4096,
        }

        resp = await self._client.post("/v1/chat/completions", json=payload)
        resp.raise_for_status()

        data = resp.json()
        raw = data["choices"][0]["message"]["content"].strip()

        return self._parse_findings(raw)

    def _parse_findings(self, raw: str) -> list[dict]:
        """Parse LLM JSON output, handling markdown fences gracefully."""
        text = raw.strip()

        # Strip markdown fences
        if text.startswith("```"):
            lines = text.splitlines()
            text = "\n".join(
                line for line in lines
                if not line.strip().startswith("```")
            ).strip()

        # Find JSON array
        start = text.find("[")
        end = text.rfind("]")
        if start < 0 or end < start:
            logger.warning("Logic Analyzer: LLM did not return a JSON array")
            return []

        try:
            findings = json.loads(text[start : end + 1])
        except json.JSONDecodeError as exc:
            logger.error("Logic Analyzer: JSON parse error: %s", exc)
            return []

        if not isinstance(findings, list):
            return []

        # Validate and normalize each finding
        validated = []
        for item in findings:
            if not isinstance(item, dict):
                continue
            # Ensure required fields exist
            item.setdefault("file_path", "unknown")
            item.setdefault("line_start", None)
            item.setdefault("line_end", None)
            item.setdefault("category", "maintainability")
            item.setdefault("severity", "info")
            item.setdefault("title", "Code quality issue")
            item.setdefault("message", "")
            item.setdefault("original_code", None)
            item.setdefault("suggested_code", None)
            item.setdefault("maintainability_scores", {})
            item.setdefault("confidence", 0.75)
            item.setdefault("guideline_ref", None)
            # Mark source
            item["agent_type"] = "logic_analyzer"
            validated.append(item)

        return validated


# ── Maintainability composite scorer ────────────────────────────────────────────

def compute_composite_maintainability_score(findings: list[dict]) -> dict[str, float]:
    """Aggregate maintainability sub-scores across all findings.

    Returns a dict with dimension scores (avg) and an overall 0-100 composite.
    Lower scores = more issues.  Based on the arXiv:2401.12714 rubric.
    """
    if not findings:
        return {dim: 10.0 for dim in MAINTAINABILITY_DIMENSIONS} | {"composite": 100.0}

    totals: dict[str, float] = {dim: 0.0 for dim in MAINTAINABILITY_DIMENSIONS}
    counts: dict[str, int] = {dim: 0 for dim in MAINTAINABILITY_DIMENSIONS}

    for finding in findings:
        scores = finding.get("maintainability_scores", {})
        for dim in MAINTAINABILITY_DIMENSIONS:
            if dim in scores and isinstance(scores[dim], (int, float)):
                totals[dim] += float(scores[dim])
                counts[dim] += 1

    averages: dict[str, float] = {}
    for dim in MAINTAINABILITY_DIMENSIONS:
        averages[dim] = round(totals[dim] / counts[dim], 1) if counts[dim] > 0 else 10.0

    # Composite = weighted average of dimension averages (0-10) → scaled to 0-100
    weights = {
        "readability": 0.25,
        "modularity": 0.20,
        "testability": 0.15,
        "documentation": 0.15,
        "error_handling": 0.15,
        "complexity": 0.10,
    }
    composite = sum(averages[dim] * weights.get(dim, 0) for dim in MAINTAINABILITY_DIMENSIONS)
    averages["composite"] = round(composite * 10, 1)  # scale 0-10 → 0-100

    return averages
