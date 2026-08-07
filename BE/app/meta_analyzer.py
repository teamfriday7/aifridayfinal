"""Enterprise Code Analysis — Meta-Analyzer / Synthesizer.

Receives findings from three parallel sources:
  - SonarCloud (existing sonar_analyzer.py)
  - Knowledge Base Agent (knowledge_base_agent.py)
  - LLM Code Logic Analyzer (code_logic_analyzer.py)

And then:
  1. Normalises all findings into a uniform structure.
  2. Deduplicates overlapping findings (same file + similar lines + same category).
  3. Re-ranks by severity × confidence.
  4. Calls LLM to generate a composite quality score (0-100) and executive summary.
  5. Persists enriched CodeReview rows (with original_code + suggested_code).
  6. Returns a summary report dict for WebSocket broadcast.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any

import httpx
from sqlalchemy.orm import Session

from .code_logic_analyzer import compute_composite_maintainability_score
from .database import SessionLocal
from .models import AnalysisSummary, CodeReview, Commit

logger = logging.getLogger("meta_analyzer")

# LLM config (same endpoint as logic analyzer)
BASE_URL = "https://genailab.tcs.in"
LLM_MODEL = "genailab-maas-gpt-4o"
API_KEY = "sk--1lLRHorZ8dhmySyuA5XrA"

# Severity ranking for deduplication
SEVERITY_RANK = {"critical": 5, "high": 4, "medium": 3, "low": 2, "info": 1}

# Category weights for composite scoring
CATEGORY_WEIGHTS = {
    "security": 0.30,
    "logic": 0.25,
    "performance": 0.20,
    "guideline": 0.15,
    "maintainability": 0.10,
    "style": 0.05,
    "bug": 0.25,
}

SCORING_SYSTEM_PROMPT = """You are an expert code quality evaluator.

You will receive a list of code findings from multiple analysis tools (SonarCloud,
static analysis, and LLM logic analysis). Based on these findings, compute a
COMPOSITE QUALITY SCORE from 0-100 (100 = perfect, 0 = critically broken) and
write a concise executive summary.

Respond with ONLY a JSON object:
{
  "composite_score": <integer 0-100>,
  "maintainability_score": <integer 0-100>,
  "reliability_score": <integer 0-100>,
  "security_score": <integer 0-100>,
  "performance_score": <integer 0-100>,
  "guideline_score": <integer 0-100>,
  "executive_summary": "<2-3 sentences explaining the main quality concerns and what needs priority attention>",
  "key_issues": ["<top 3 most critical issues as short phrases>"],
  "recommendations": ["<top 3 actionable improvement recommendations>"]
}

Scoring guidelines:
- 90-100: Excellent code, minor style issues only
- 75-89:  Good code, some medium issues needing attention
- 60-74:  Acceptable but has multiple issues requiring fixes
- 40-59:  Below standard, significant refactoring needed
- 20-39:  Poor quality, multiple critical/high issues
- 0-19:   Critical failure, security vulnerabilities or logic errors present
"""


class MetaAnalyzer:
    """Merges SonarCloud + KB + Logic Analyzer findings into a unified review."""

    def __init__(self) -> None:
        self._client = httpx.AsyncClient(
            base_url=BASE_URL,
            headers={
                "Authorization": f"Bearer {API_KEY}",
                "Content-Type": "application/json",
            },
            verify=False,
            timeout=60.0,
        )

    async def close(self) -> None:
        await self._client.aclose()

    # ── public API ──────────────────────────────────────────────────────────────

    async def synthesize(
        self,
        commit_info: dict,
        saved_commit: Commit | None,
        sonar_report: dict | None = None,
        kb_result: dict | None = None,
        logic_findings: list[dict] | None = None,
        codebert_result: dict | None = None,
    ) -> dict[str, Any]:
        """Merge all findings, score, persist, and return summary.

        Parameters
        ----------
        commit_info:    Commit metadata dict (hash, author, message, etc.)
        saved_commit:   SQLAlchemy Commit ORM object (may be None for testing).
        sonar_report:   Output from SonarAnalyzer.analyze_commit().
        kb_result:      Output from KnowledgeBaseAgent.generate_for_commit().
        logic_findings: Output from CodeLogicAnalyzer.analyze().

        Returns
        -------
        Summary dict for WebSocket broadcast.
        """
        short = commit_info.get("hash", "unknown")[:8]
        logger.info("=" * 62)
        logger.info("🧠  META-ANALYZER — commit %s", short)

        # 1. Normalise all findings
        all_findings = self._normalise(sonar_report, logic_findings or [], codebert_result)
        logger.info("    Raw merged findings: %d", len(all_findings))

        # 2. Deduplicate
        deduped = self._deduplicate(all_findings)
        logger.info("    After dedup: %d", len(deduped))

        # 3. Compute maintainability scores from logic findings
        maintainability = compute_composite_maintainability_score(
            [f for f in deduped if f.get("agent_type") == "logic_analyzer"]
        )

        # 4. LLM composite scoring
        scoring = await self._score_with_llm(deduped, commit_info)
        logger.info(
            "    Composite score: %s | Security: %s | Reliability: %s",
            scoring.get("composite_score", "?"),
            scoring.get("security_score", "?"),
            scoring.get("reliability_score", "?"),
        )

        # 5. Persist CodeReview rows
        reviews_created = 0
        if saved_commit:
            reviews_created = self._persist_reviews(saved_commit, deduped)

        # 6. Persist AnalysisSummary
        summary_id = None
        if saved_commit:
            summary_id = self._persist_summary(saved_commit, scoring, deduped, maintainability)

        # 7. Build broadcast payload
        result = {
            "type": "analysis_complete",
            "commit_hash": commit_info.get("hash"),
            "short_hash": short,
            "author": commit_info.get("author_name", ""),
            "composite_score": scoring.get("composite_score", 0),
            "maintainability_score": maintainability.get("composite", 0),
            "reliability_score": scoring.get("reliability_score", 0),
            "security_score": scoring.get("security_score", 0),
            "performance_score": scoring.get("performance_score", 0),
            "guideline_score": scoring.get("guideline_score", 0),
            "executive_summary": scoring.get("executive_summary", ""),
            "key_issues": scoring.get("key_issues", []),
            "recommendations": scoring.get("recommendations", []),
            "total_findings": len(deduped),
            "by_category": self._count_by_category(deduped),
            "by_severity": self._count_by_severity(deduped),
            "reviews_created": reviews_created,
            "sonar_findings": len(sonar_report.get("issues", [])) if sonar_report else 0,
            "logic_findings": len(logic_findings or []),
            "kb_processed": bool(kb_result and kb_result.get("records")),
        }

        logger.info("🧠  META-ANALYZER COMPLETE — score=%s, reviews=%d",
                    result["composite_score"], reviews_created)
        logger.info("=" * 62)

        return result

    # ── normalise sources ───────────────────────────────────────────────────────

    def _normalise(
        self,
        sonar_report: dict | None,
        logic_findings: list[dict],
        codebert_result: dict | None = None,
    ) -> list[dict]:
        """Unify SonarCloud issues + Logic Analyzer findings into one list."""
        normalised: list[dict] = []

        # ── SonarCloud issues
        if sonar_report and isinstance(sonar_report.get("issues"), list):
            for iss in sonar_report["issues"]:
                comp = iss.get("component", "")
                file_path = comp.split(":", 1)[1] if ":" in comp else comp
                normalised.append({
                    "agent_type": "sonarcloud",
                    "file_path": file_path,
                    "line_start": iss.get("line"),
                    "line_end": None,
                    "category": _map_sonar_category(iss.get("type", "CODE_SMELL")),
                    "severity": _map_sonar_severity(iss.get("severity", "INFO")),
                    "title": f"[{iss.get('rule', '?')}] {iss.get('type', 'ISSUE')}",
                    "message": iss.get("message", ""),
                    "original_code": None,
                    "suggested_code": None,
                    "confidence": 0.90,
                })

        # ── Logic Analyzer findings
        for finding in logic_findings:
            normalised.append(finding)

        # ── CodeBERT findings
        if codebert_result:
            for cat in ["code_smells", "bug_prone_patterns", "poor_naming"]:
                for item in codebert_result.get(cat, []):
                    normalised.append({
                        "agent_type": "codebert",
                        "file_path": "diff_content",
                        "line_start": None,
                        "line_end": None,
                        "category": "maintainability" if cat == "code_smells" else "quality",
                        "severity": item.get("severity", "medium"),
                        "title": f"[{item.get('rule', 'Semantic Issue')}]",
                        "message": item.get("description", ""),
                        "original_code": None,
                        "suggested_code": None,
                        "confidence": 0.85,
                    })

        return normalised

    # ── deduplication ───────────────────────────────────────────────────────────

    def _deduplicate(self, findings: list[dict]) -> list[dict]:
        """Remove near-duplicate findings (same file + overlapping lines + same category)."""
        seen: list[dict] = []
        for finding in sorted(
            findings,
            key=lambda f: SEVERITY_RANK.get(f.get("severity", "info"), 1),
            reverse=True,
        ):
            if not self._is_duplicate(finding, seen):
                seen.append(finding)
        return seen

    def _is_duplicate(self, candidate: dict, existing: list[dict]) -> bool:
        for ex in existing:
            if ex.get("file_path") != candidate.get("file_path"):
                continue
            if ex.get("category") != candidate.get("category"):
                continue
            # Check line overlap
            c_start = candidate.get("line_start") or 0
            c_end = candidate.get("line_end") or c_start
            e_start = ex.get("line_start") or 0
            e_end = ex.get("line_end") or e_start
            if c_start == 0 and e_start == 0:
                # Both have no line info — check message similarity
                if _similarity(candidate.get("message", ""), ex.get("message", "")) > 0.7:
                    return True
            elif c_start and e_start:
                # Check for overlap within 5 lines
                if max(c_start, e_start) - min(c_end or c_start, e_end or e_start) <= 5:
                    return True
        return False

    # ── LLM scoring ─────────────────────────────────────────────────────────────

    async def _score_with_llm(
        self, findings: list[dict], commit_info: dict,
    ) -> dict:
        """Ask LLM to compute composite quality scores."""
        if not findings:
            return {
                "composite_score": 95,
                "maintainability_score": 95,
                "reliability_score": 95,
                "security_score": 95,
                "performance_score": 95,
                "guideline_score": 95,
                "executive_summary": "No significant issues found in this commit. Code quality looks good.",
                "key_issues": [],
                "recommendations": ["Continue following current coding standards."],
            }

        # Build compact findings summary for LLM
        findings_summary = []
        for f in findings[:30]:  # cap at 30 to avoid token limit
            findings_summary.append({
                "agent": f.get("agent_type", "?"),
                "file": f.get("file_path", "?"),
                "line": f.get("line_start"),
                "category": f.get("category"),
                "severity": f.get("severity"),
                "title": f.get("title", ""),
                "message": (f.get("message", ""))[:200],
            })

        user_prompt = (
            f"Commit: {commit_info.get('hash', '')[:8]} by {commit_info.get('author_name', '')}\n"
            f"Message: {commit_info.get('message', '')}\n\n"
            f"FINDINGS ({len(findings)} total):\n"
            f"{json.dumps(findings_summary, indent=2)}\n\n"
            "Compute quality scores and write an executive summary."
        )

        try:
            resp = await self._client.post(
                "/v1/chat/completions",
                json={
                    "model": LLM_MODEL,
                    "messages": [
                        {"role": "system", "content": SCORING_SYSTEM_PROMPT},
                        {"role": "user", "content": user_prompt},
                    ],
                    "temperature": 0.1,
                    "max_tokens": 1024,
                },
            )
            resp.raise_for_status()
            raw = resp.json()["choices"][0]["message"]["content"].strip()

            # Parse JSON
            text = raw
            if text.startswith("```"):
                text = "\n".join(l for l in text.splitlines() if not l.strip().startswith("```"))
            start, end = text.find("{"), text.rfind("}")
            if start >= 0 and end > start:
                return json.loads(text[start : end + 1])

        except Exception as exc:
            logger.error("Meta-Analyzer LLM scoring failed: %s", exc)

        # Fallback: rule-based scoring
        return self._fallback_score(findings)

    def _fallback_score(self, findings: list[dict]) -> dict:
        """Rule-based composite score when LLM scoring fails."""
        penalty = sum(
            {"critical": 25, "high": 10, "medium": 5, "low": 2, "info": 0}.get(
                f.get("severity", "info"), 0
            )
            for f in findings
        )
        composite = max(0, 100 - penalty)
        categories = {f.get("category", "") for f in findings}
        summary = f"Found {len(findings)} issue(s) across {len(categories)} category/ies."
        return {
            "composite_score": composite,
            "maintainability_score": composite,
            "reliability_score": composite,
            "security_score": max(0, composite - 5) if "security" in categories else composite,
            "performance_score": composite,
            "guideline_score": composite,
            "executive_summary": summary,
            "key_issues": [f.get("title", "") for f in findings[:3]],
            "recommendations": ["Review and address the flagged issues."],
        }

    # ── persistence ─────────────────────────────────────────────────────────────

    def _persist_reviews(self, saved_commit: Commit, findings: list[dict]) -> int:
        """Write CodeReview rows for all findings."""
        db: Session = SessionLocal()
        count = 0
        try:
            # Remove old reviews for this commit (re-analysis)
            db.query(CodeReview).filter(
                CodeReview.commit_id == saved_commit.id,
                CodeReview.agent_type.in_(["logic_analyzer", "sonarcloud", "meta_analyzer"]),
            ).delete(synchronize_session="fetch")

            for f in findings:
                review = CodeReview(
                    commit_id=saved_commit.id,
                    agent_type=f.get("agent_type", "logic_analyzer"),
                    severity=f.get("severity", "info"),
                    file_path=f.get("file_path", ""),
                    line_start=f.get("line_start"),
                    line_end=f.get("line_end"),
                    category=f.get("category", "maintainability"),
                    title=f.get("title", "")[:200],
                    message=f.get("message", ""),
                    suggestion=f.get("message", "")[:500],
                    original_code=f.get("original_code"),
                    suggested_code=f.get("suggested_code"),
                    status="pending",
                    confidence=float(f.get("confidence", 0.75)),
                )
                db.add(review)
                count += 1

            db.commit()
        except Exception as exc:
            db.rollback()
            logger.error("Meta-Analyzer persist reviews error: %s", exc)
        finally:
            db.close()
        return count

    def _persist_summary(
        self,
        saved_commit: Commit,
        scoring: dict,
        findings: list[dict],
        maintainability: dict,
    ) -> int | None:
        """Write or update the AnalysisSummary row for this commit."""
        db: Session = SessionLocal()
        try:
            # Upsert
            existing = (
                db.query(AnalysisSummary)
                .filter(AnalysisSummary.commit_id == saved_commit.id)
                .first()
            )
            row = existing or AnalysisSummary(commit_id=saved_commit.id)
            row.composite_score = float(scoring.get("composite_score", 0))
            row.executive_summary = scoring.get("executive_summary", "")
            row.maintainability_score = float(maintainability.get("composite", scoring.get("maintainability_score", 0)))
            row.reliability_score = float(scoring.get("reliability_score", 0))
            row.security_score = float(scoring.get("security_score", 0))
            row.performance_score = float(scoring.get("performance_score", 0))
            row.guideline_score = float(scoring.get("guideline_score", 0))
            row.total_findings = len(findings)
            row.sonar_findings = sum(1 for f in findings if f.get("agent_type") == "sonarcloud")
            row.logic_findings = sum(1 for f in findings if f.get("agent_type") == "logic_analyzer")
            row.key_issues = json.dumps(scoring.get("key_issues", []))
            row.recommendations = json.dumps(scoring.get("recommendations", []))
            row.updated_at = datetime.now(timezone.utc)

            if not existing:
                db.add(row)
            db.commit()
            db.refresh(row)
            return row.id
        except Exception as exc:
            db.rollback()
            logger.error("Meta-Analyzer persist summary error: %s", exc)
            return None
        finally:
            db.close()

    # ── utility ─────────────────────────────────────────────────────────────────

    @staticmethod
    def _count_by_category(findings: list[dict]) -> dict[str, int]:
        counts: dict[str, int] = {}
        for f in findings:
            cat = f.get("category", "other")
            counts[cat] = counts.get(cat, 0) + 1
        return counts

    @staticmethod
    def _count_by_severity(findings: list[dict]) -> dict[str, int]:
        counts: dict[str, int] = {}
        for f in findings:
            sev = f.get("severity", "info")
            counts[sev] = counts.get(sev, 0) + 1
        return counts


# ── helpers ──────────────────────────────────────────────────────────────────────


def _map_sonar_severity(sonar_sev: str) -> str:
    return {"BLOCKER": "critical", "CRITICAL": "critical",
            "MAJOR": "high", "MINOR": "medium", "INFO": "low"}.get(sonar_sev, "info")


def _map_sonar_category(sonar_type: str) -> str:
    return {"BUG": "logic", "VULNERABILITY": "security",
            "CODE_SMELL": "maintainability", "SECURITY_HOTSPOT": "security"}.get(
        sonar_type, "maintainability",
    )


def _similarity(a: str, b: str) -> float:
    """Very lightweight Jaccard similarity on words (no deps)."""
    wa = set(a.lower().split())
    wb = set(b.lower().split())
    if not wa or not wb:
        return 0.0
    return len(wa & wb) / len(wa | wb)
