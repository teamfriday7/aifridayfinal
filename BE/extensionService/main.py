"""Standalone CodeGuardian extension-analysis sidecar.

This service deliberately does not import or modify BE/app. Run it separately
on port 8010 and point the VS Code extension to it.
"""
from __future__ import annotations

import json
import os
import re
from typing import Literal

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

Severity = Literal["critical", "high", "medium", "low", "info"]


class Finding(BaseModel):
    id: str | None = None
    severity: Severity
    title: str
    message: str
    suggestion: str
    file: str | None = None
    line: int | None = None
    source: Literal["local", "be"] = "be"
    replacementCode: str | None = None
    originalCode: str | None = None
    ruleId: str | None = None
    explanation: str | None = None


class AnalysisRequest(BaseModel):
    repositoryPath: str = Field(max_length=2000)
    commit: str = Field(max_length=128)
    diff: str = Field(max_length=60_000)
    files: list[str] = Field(default_factory=list)
    localFindings: list[Finding] = Field(default_factory=list)


class AnalysisResponse(BaseModel):
    suggestions: list[Finding]
    summary: str


class RewriteRequest(BaseModel):
    finding: Finding
    repositoryPath: str = Field(max_length=2000, default="")
    instruction: str | None = None
    originalSnippet: str | None = None


class RewriteResponse(BaseModel):
    replacementCode: str
    explanation: str


class ExplainRequest(BaseModel):
    finding: Finding
    contextSnippet: str | None = None


class ExplainResponse(BaseModel):
    explanation: str
    owaspReference: str | None = None
    remediationSteps: list[str] = Field(default_factory=list)


app = FastAPI(title="CodeGuardian Extension Analysis", version="1.0.0")
_TOKEN = os.getenv("ANALYSIS_SHARED_TOKEN", "")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "CodeGuardian extension analysis"}


@app.post("/api/extension/analyze", response_model=AnalysisResponse)
def analyze(request: AnalysisRequest, x_codeguardian_token: str | None = Header(default=None)) -> AnalysisResponse:
    if _TOKEN and x_codeguardian_token != _TOKEN:
        raise HTTPException(status_code=401, detail="Invalid CodeGuardian analysis token")

    suggestions = _rule_based_findings(request.diff)
    suggestions.extend(_ai_findings(request, suggestions))
    suggestions = _dedupe(suggestions)
    return AnalysisResponse(
        suggestions=suggestions,
        summary=f"Reviewed {len(request.files)} changed file(s) in {request.commit[:12]}; generated {len(suggestions)} server-side suggestion(s).",
    )


@app.post("/api/extension/rewrite", response_model=RewriteResponse)
def rewrite(request: RewriteRequest, x_codeguardian_token: str | None = Header(default=None)) -> RewriteResponse:
    if _TOKEN and x_codeguardian_token != _TOKEN:
        raise HTTPException(status_code=401, detail="Invalid CodeGuardian analysis token")

    original = request.finding.originalCode or request.originalSnippet or request.finding.message
    instruction = request.instruction or request.finding.suggestion

    # If AI key is present, attempt LLM rewrite, else return smart template fix
    api_key = os.getenv("OPENAI_API_KEY") or os.getenv("GENAILAB_API_KEY")
    if api_key and os.getenv("CODEGUARDIAN_ENABLE_AI", "false").lower() == "true":
        try:
            from openai import OpenAI
            client = OpenAI(api_key=api_key, base_url=os.getenv("OPENAI_BASE_URL") or os.getenv("GENAILAB_BASE_URL"))
            prompt = (
                f"You are CodeGuardian AI Code Reviewer. Rewrite the following code snippet to fix the security or quality issue:\n\n"
                f"Issue Title: {request.finding.title}\n"
                f"Suggestion: {instruction}\n\n"
                f"Original Snippet:\n```\n{original}\n```\n\n"
                f"Return JSON object: {{\n  \"replacementCode\": \"<fixed snippet here>\",\n  \"explanation\": \"<short description of changes>\"\n}}"
            )
            resp = client.chat.completions.create(
                model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                response_format={"type": "json_object"}
            )
            payload = json.loads(resp.choices[0].message.content or "{}")
            if "replacementCode" in payload:
                return RewriteResponse(
                    replacementCode=payload["replacementCode"],
                    explanation=payload.get("explanation", "AI suggested fix generated.")
                )
        except Exception:
            pass

    # Deterministic fallback replacement
    rewritten = _generate_fallback_rewrite(request.finding, original, instruction)
    return RewriteResponse(
        replacementCode=rewritten,
        explanation=f"Refactored snippet according to '{instruction}'."
    )


@app.post("/api/extension/explain", response_model=ExplainResponse)
def explain(request: ExplainRequest, x_codeguardian_token: str | None = Header(default=None)) -> ExplainResponse:
    if _TOKEN and x_codeguardian_token != _TOKEN:
        raise HTTPException(status_code=401, detail="Invalid CodeGuardian analysis token")

    finding = request.finding
    owasp = _get_owasp_ref(finding.title)
    steps = [
        "Review the highlighted line and check for dynamic user inputs.",
        "Apply the suggested replacement or refactor to use safe parameterized APIs.",
        "Re-run pre-commit or CodeGuardian review to confirm resolution."
    ]

    exp = (
        f"### Finding: {finding.title}\n\n"
        f"**Severity**: {finding.severity.upper()}\n\n"
        f"**Message**: {finding.message}\n\n"
        f"**Recommended Action**: {finding.suggestion}\n\n"
        f"**Context**: File `{finding.file or 'unknown'}` at line `{finding.line or 'N/A'}`."
    )

    return ExplainResponse(
        explanation=exp,
        owaspReference=owasp,
        remediationSteps=steps
    )


def _generate_fallback_rewrite(finding: Finding, original: str, instruction: str) -> str:
    if "credential" in finding.title.lower() or "secret" in finding.title.lower():
        return f"# Load from environment variable\nimport os\napi_key = os.getenv('API_KEY')"
    if "process execution" in finding.title.lower():
        return f"import subprocess\nsubprocess.run(['command', 'arg1', 'arg2'], check=True)"
    if "sql" in finding.title.lower():
Use parameterized queries and keep SQL structure static.
    if "cors" in finding.title.lower():
        return f"allow_origins=['https://your-trusted-domain.com']"
    if "innerhtml" in finding.title.lower():
        return f"element.textContent = safeText;"
    return f"// Fixed: {instruction}\n{original}"


def _get_owasp_ref(title: str) -> str | None:
    t = title.lower()
    if "sql" in t or "injection" in t:
        return "A03:2021-Injection (OWASP Top 10)"
    if "credential" in t or "secret" in t:
        return "A07:2021-Identification and Authentication Failures"
    if "cors" in t or "tls" in t:
        return "A02:2021-Cryptographic Failures / Misconfiguration"
    if "process" in t or "code execution" in t:
        return "A03:2021-Injection / Code Execution"
    return "A05:2021-Security Misconfiguration"


def _rule_based_findings(diff: str) -> list[Finding]:
    rules: list[tuple[re.Pattern[str], Severity, str, str, str, str]] = [
        (re.compile(r"\b(subprocess\.run|os\.system|child_process\.exec)\b"), "medium", "Process execution added", "Executing commands requires clear input boundaries.", "Pass arguments as an array, avoid a shell, and validate every externally derived value.", "rule-proc-exec"),
        (re.compile(r"\bSELECT\b.+\+|f[\"'].*\bSELECT\b", re.I), "high", "Possible SQL construction", "The change appears to construct SQL dynamically.", "Use parameterized queries and keep SQL structure static.", "rule-sql-inject"),
        (re.compile(r"allow_origins\s*=\s*\[\s*[\"']\*[\"']"), "medium", "Open CORS policy", "A wildcard CORS origin is being enabled.", "Restrict origins to explicitly trusted frontend domains.", "rule-open-cors"),
Sanitize untrusted content or render it as text/components instead.
    ]
    findings: list[Finding] = []
    file_name: str | None = None
    line_number: int | None = None
    for line in diff.splitlines():
        if line.startswith("+++ b/"):
            file_name = line[6:]
            continue
        hunk = re.match(r"@@ -\d+(?:,\d+)? \+(\d+)", line)
        if hunk:
            line_number = int(hunk.group(1))
            continue
        if not line.startswith("+") or line.startswith("+++"):
            continue
        content = line[1:]
        for pattern, severity, title, message, suggestion, rule_id in rules:
            if pattern.search(content):
                findings.append(Finding(
                    id=f"{rule_id}:{file_name}:{line_number}",
                    severity=severity,
                    title=title,
                    message=message,
                    suggestion=suggestion,
                    file=file_name,
                    line=line_number,
                    originalCode=content,
                    ruleId=rule_id,
                    source="be"
                ))
        if line_number is not None:
            line_number += 1
    return findings


def _ai_findings(request: AnalysisRequest, existing: list[Finding]) -> list[Finding]:
    """Optional AI enrichment. The deterministic checks remain available without an API key."""
    api_key = os.getenv("OPENAI_API_KEY") or os.getenv("GENAILAB_API_KEY")
    if not api_key or os.getenv("CODEGUARDIAN_ENABLE_AI", "false").lower() != "true":
        return []
    try:
        from openai import OpenAI

        client = OpenAI(api_key=api_key, base_url=os.getenv("OPENAI_BASE_URL") or os.getenv("GENAILAB_BASE_URL"))
        prompt = {
            "task": "Review this Git diff. Return JSON only: an array of at most 8 findings. Each finding must have severity (critical/high/medium/low/info), title, message, suggestion, file, and line. Report only issues evidenced by the diff; do not expose secrets.",
            "existing_findings": [item.model_dump() for item in existing],
            "diff": request.diff,
        }
        response = client.chat.completions.create(
            model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
            messages=[{"role": "user", "content": json.dumps(prompt)}],
            temperature=0.1,
            response_format={"type": "json_object"},
        )
        payload = json.loads(response.choices[0].message.content or "{}")
        values = payload.get("findings", payload if isinstance(payload, list) else [])
        return [Finding(**{**item, "source": "be"}) for item in values if isinstance(item, dict)][:8]
    except Exception:
        return []


def _dedupe(findings: list[Finding]) -> list[Finding]:
    seen: set[tuple[str, str | None, int | None]] = set()
    result: list[Finding] = []
    for finding in findings:
        key = (finding.title, finding.file, finding.line)
        if key not in seen:
            seen.add(key)
            result.append(finding)
    return result

