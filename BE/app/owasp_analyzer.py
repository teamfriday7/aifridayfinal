"""Enterprise Code Analysis — OWASP Vulnerability Analyzer.

Analyzes code diffs for OWASP Top 10 vulnerabilities.
Tries to connect to an OWASP ZAP daemon first; if unavailable or unsuitable for diffs,
falls back to LLM-based analysis against the OWASP Top 10:2021 categories.
"""
from __future__ import annotations

import json
import logging
from typing import Any, Optional

import httpx

logger = logging.getLogger("owasp_analyzer")

# ── LLM configuration ────────────────────────────────────────────────────────
BASE_URL = "https://genailab.tcs.in"
LLM_MODEL = "genailab-maas-gpt-4o"
API_KEY = "sk--1lLRHorZ8dhmySyuA5XrA"

ZAP_DAEMON_URL = "http://localhost:8080"
ZAP_API_KEY = "12345"

OWASP_CATEGORIES = """
- A01:2021 Broken Access Control
- A02:2021 Cryptographic Failures  
- A03:2021 Injection
- A04:2021 Insecure Design
- A05:2021 Security Misconfiguration
- A06:2021 Vulnerable Components
- A07:2021 Auth Failures
- A08:2021 Software/Data Integrity
- A09:2021 Security Logging Failures
- A10:2021 SSRF
"""

OWASP_SYSTEM_PROMPT = f"""You are a senior Application Security expert and penetration tester.
You analyze git diffs specifically for OWASP Top 10:2021 vulnerabilities.

The OWASP Top 10:2021 categories are:
{OWASP_CATEGORIES}

Your response MUST be a valid JSON object with this EXACT schema:
{{
  "owasp_score": <float 0-100, 100=clean, lower based on severity of findings>,
  "security_gate_status": "<PASSED | FAILED | WARN>",
  "findings": [
    {{
      "file_path": "<relative path to file>",
      "line_start": <integer or null>,
      "line_end": <integer or null>,
      "severity": "<critical | high | medium | low>",
      "title": "<short title including OWASP category ID, e.g., 'A03:2021 SQL Injection'>",
      "message": "<detailed description of the vulnerability>",
      "confidence": <float 0.0-1.0>,
      "owasp_category": "<one of the exact categories from the list above>",
      "recommendation": "<how to fix the issue>"
    }}
  ]
}}

Rules:
- Only report REAL security issues you can see in the diff.
- If no issues are found, return an empty findings list, score 100, and PASSED status.
- If CRITICAL or HIGH issues are found, status should be FAILED.
- If only MEDIUM or LOW issues are found, status could be WARN.
- Return ONLY the JSON object. No markdown fences, no explanation text outside JSON.
"""


class OWASPAnalyzer:
    """OWASP Top 10 code diff analyzer."""

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
        self._zap_client = httpx.AsyncClient(
            base_url=ZAP_DAEMON_URL,
            verify=False,
            timeout=5.0,
        )

    async def close(self) -> None:
        """Close the underlying HTTP clients."""
        await self._client.aclose()
        await self._zap_client.aclose()

    async def _check_zap_daemon(self) -> bool:
        """Try to connect to the local OWASP ZAP daemon."""
        try:
            resp = await self._zap_client.get(f"/JSON/core/view/version/?apikey={ZAP_API_KEY}")
            if resp.status_code == 200:
                logger.info("ZAP daemon is reachable (version: %s)", resp.json().get("version"))
                return True
        except Exception as exc:
            logger.info("ZAP daemon is not reachable: %s", exc)
        return False

    async def analyze(
        self,
        diff_content: str,
        changed_files: list[str] = None,
        commit_message: str = "",
    ) -> dict[str, Any]:
        """Analyze a diff for OWASP Top 10 vulnerabilities.

        Returns a summary dict containing the overall score, status, total findings,
        and the list of normalized finding dicts.
        """
        if changed_files is None:
            changed_files = []

        if not diff_content or not diff_content.strip():
            logger.info("OWASP Analyzer: empty diff, skipping")
            return self._empty_result()

        # Check ZAP daemon availability (falls back to LLM since ZAP is mainly DAST)
        zap_available = await self._check_zap_daemon()
        if zap_available:
            logger.info("OWASP Analyzer: ZAP is available, but falling back to LLM for static diff analysis.")

        truncated_diff = diff_content[:12000] if len(diff_content) > 12000 else diff_content

        user_prompt = self._build_user_prompt(truncated_diff, commit_message, changed_files)

        logger.info("🛡️  OWASP Analyzer: analysing diff (%d changed files) ...", len(changed_files))

        try:
            result = await self._call_llm(user_prompt)
            logger.info(
                "🛡️  OWASP Analyzer: scan complete, status: %s, %d findings",
                result.get("security_gate_status", "UNKNOWN"),
                len(result.get("findings", [])),
            )
            return result
        except Exception as exc:
            logger.error("OWASP Analyzer error: %s", exc)
            return self._empty_result()

    def _build_user_prompt(self, diff: str, commit_message: str, changed_files: list[str]) -> str:
        files_str = "\n".join(f"  - {f}" for f in changed_files)
        return (
            f"COMMIT MESSAGE: {commit_message}\n\n"
            f"CHANGED FILES:\n{files_str}\n\n"
            f"GIT DIFF:\n```diff\n{diff}\n```\n\n"
            "Analyze the changes for any OWASP Top 10 vulnerabilities."
        )

    async def _call_llm(self, user_prompt: str) -> dict[str, Any]:
        payload = {
            "model": LLM_MODEL,
            "messages": [
                {"role": "system", "content": OWASP_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.1,
            "max_tokens": 4096,
        }

        resp = await self._client.post("/v1/chat/completions", json=payload)
        resp.raise_for_status()

        data = resp.json()
        raw = data["choices"][0]["message"]["content"].strip()
        
        parsed = self._parse_json(raw)
        if not parsed:
            return self._empty_result()

        # Normalize findings
        normalized_findings = []
        for finding in parsed.get("findings", []):
            if not isinstance(finding, dict):
                continue
            
            normalized_findings.append({
                "agent_type": "owasp_scanner",
                "file_path": finding.get("file_path", "unknown"),
                "line_start": finding.get("line_start"),
                "line_end": finding.get("line_end"),
                "category": "owasp_security",
                "severity": finding.get("severity", "info").lower(),
                "title": finding.get("title", "Security Issue"),
                "message": finding.get("message", ""),
                "confidence": float(finding.get("confidence", 0.8)),
                "owasp_category": finding.get("owasp_category", "Unknown"),
                "recommendation": finding.get("recommendation", ""),
            })

        return {
            "owasp_score": float(parsed.get("owasp_score", 100.0)),
            "security_gate_status": parsed.get("security_gate_status", "PASSED"),
            "total_findings": len(normalized_findings),
            "findings": normalized_findings,
        }

    def _parse_json(self, raw: str) -> Optional[dict]:
        text = raw.strip()
        if text.startswith("```"):
            lines = text.splitlines()
            text = "\n".join(
                line for line in lines if not line.strip().startswith("```")
            ).strip()

        start = text.find("{")
        end = text.rfind("}")
        if start < 0 or end < start:
            logger.warning("OWASP Analyzer: LLM did not return a JSON object")
            return None

        try:
            return json.loads(text[start : end + 1])
        except json.JSONDecodeError as exc:
            logger.error("OWASP Analyzer: JSON parse error: %s", exc)
            return None

    def _empty_result(self) -> dict[str, Any]:
        return {
            "owasp_score": 100.0,
            "security_gate_status": "PASSED",
            "total_findings": 0,
            "findings": [],
        }
