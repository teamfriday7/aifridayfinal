"""Enterprise Code Analysis — SonarCloud integration.

Fetches code quality data from SonarCloud's Web API after each commit,
maps findings to CodeReview records, and writes analysis reports to disk.
"""
from __future__ import annotations

import asyncio
import json
import logging
import shutil
import subprocess
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

import httpx
from sqlalchemy.orm import Session

from .database import SessionLocal
from .models import CodeReview, Commit, SonarConfig

logger = logging.getLogger("sonar")

REPORTS_DIR = Path(__file__).resolve().parent.parent / "data" / "reports"
REPORTS_DIR.mkdir(parents=True, exist_ok=True)


class SonarAnalyzer:
    """Fetches issues, metrics, and quality-gate status from SonarCloud."""

    def __init__(self, host: str, token: str, project_key: str) -> None:
        self.host = host.rstrip("/")
        self.token = token
        self.project_key = project_key
        
        username, password = token, ""
        if ":" in token:
            username, password = token.split(":", 1)
            
        self.username = username
        self.password = password
        
        self._client = httpx.AsyncClient(
            auth=httpx.BasicAuth(username=username, password=password),
            verify=False,
            timeout=30.0,
        )

    async def close(self) -> None:
        await self._client.aclose()

    # ── low-level API helper ────────────────────────────────────────────────

    async def _get(self, endpoint: str, params: dict | None = None) -> dict:
        url = f"{self.host}/api/{endpoint}"
        try:
            resp = await self._client.get(url, params=params)
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as exc:
            logger.error(
                "SonarCloud HTTP %d on %s: %s",
                exc.response.status_code, endpoint,
                exc.response.text[:300],
            )
            return {}
        except Exception as exc:
            logger.error("SonarCloud API error [%s]: %s", endpoint, exc)
            return {}

    # ── data fetchers ───────────────────────────────────────────────────────

    async def fetch_issues(
        self, page_size: int = 500, file_paths: list[str] | None = None,
    ) -> list[dict]:
        """Return open issues for the project, optionally filtered by files."""
        params: dict[str, Any] = {
            "componentKeys": self.project_key,
            "ps": min(page_size, 500),
            "statuses": "OPEN,CONFIRMED,REOPENED",
            "resolved": "false",
        }
        data = await self._get("issues/search", params)
        issues: list[dict] = data.get("issues", [])

        if not file_paths or not issues:
            return issues

        # Normalise the changed-file paths for comparison
        norm = {fp.replace("\\", "/").lower().strip("/") for fp in file_paths}
        filtered: list[dict] = []
        for issue in issues:
            comp = issue.get("component", "")
            # component looks like "projectKey:BE/app/main.py"
            issue_path = (comp.split(":", 1)[1] if ":" in comp else comp).lower()
            if any(issue_path.endswith(p) or p.endswith(issue_path) for p in norm):
                filtered.append(issue)
        return filtered

    async def fetch_metrics(self) -> dict[str, str]:
        """Return key quality metrics for the project."""
        keys = ",".join([
            "bugs", "vulnerabilities", "code_smells", "coverage",
            "duplicated_lines_density", "ncloc", "sqale_rating",
            "reliability_rating", "security_rating", "sqale_index",
            "security_hotspots",
        ])
        data = await self._get(
            "measures/component",
            {"component": self.project_key, "metricKeys": keys},
        )
        return {
            m["metric"]: m.get("value", "N/A")
            for m in data.get("component", {}).get("measures", [])
        }

    async def fetch_quality_gate(self) -> dict:
        """Return quality-gate status and conditions."""
        data = await self._get(
            "qualitygates/project_status",
            {"projectKey": self.project_key},
        )
        return data.get("projectStatus", {})

    # ── local scanning ──────────────────────────────────────────────────────

    async def _run_local_scan(self, commit_hash: str, changed_files: list[str]) -> bool:
        """Checkout code to a temp dir and run sonar-scanner."""
        logger.info("    [SONAR] Started scanning commit %s...", commit_hash[:8])
        
        repo_path = r"C:\GitRemote"
        git_bin = r"C:\Users\GenAITVMSEZUSR4\AppData\Local\Programs\Git\cmd\git.exe"
        sonar_bin = r"C:\Users\GenAITVMSEZUSR4\Downloads\sonar-scanner-cli-8.1.0.6389-windows-x64\sonar-scanner-8.1.0.6389-windows-x64\bin\sonar-scanner.bat"
        
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            try:
                # Clone the bare repo to the temp directory
                subprocess.run(
                    [git_bin, "clone", repo_path, "."],
                    cwd=str(temp_path), capture_output=True, check=True
                )
                
                # Checkout the specific commit
                subprocess.run(
                    [git_bin, "checkout", commit_hash],
                    cwd=str(temp_path), capture_output=True, check=True
                )
                
                # Write sonar-project.properties
                logger.info("    [SONAR] Writing sonar-project.properties...")
                
                inclusions = ""
                if changed_files:
                    inclusions = f"sonar.inclusions={','.join(changed_files)}\n"
                    
                props = (
                    f"sonar.projectKey={self.project_key}\n"
                    f"sonar.host.url={self.host}\n"
                    f"sonar.token={self.token}\n"
                    f"{inclusions}"
                )
                (temp_path / "sonar-project.properties").write_text(props, encoding="utf-8")
                
                # Run Sonar Scanner
                logger.info("    [SONAR] Running sonar-scanner CLI...")
                cmd = [sonar_bin]
                
                result = subprocess.run(
                    cmd, cwd=str(temp_path), capture_output=True, text=True,
                )
                if result.returncode != 0:
                    logger.error("    [SONAR] Scanner failed:\n%s\n%s", result.stdout, result.stderr)
                    return False
                
                # Parse .scannerwork/report-task.txt for ceTaskId
                report_file = temp_path / ".scannerwork" / "report-task.txt"
                if not report_file.exists():
                    logger.error("    [SONAR] report-task.txt not found!")
                    return False
                
                task_id = None
                for line in report_file.read_text(encoding="utf-8").splitlines():
                    if line.startswith("ceTaskId="):
                        task_id = line.split("=", 1)[1].strip()
                        break
                        
                if not task_id:
                    logger.error("    [SONAR] No ceTaskId found in report-task.txt!")
                    return False
                    
                logger.info("    [SONAR] Task queued on SonarCloud (Task ID: %s)", task_id)
                return await self._poll_sonar_task(task_id)
                
            except Exception as e:
                logger.error("    [SONAR] Local scan failed: %s", e)
                return False

    async def _poll_sonar_task(self, task_id: str) -> bool:
        """Poll the SonarCloud API until the background task finishes."""
        logger.info("    [SONAR] Waiting for SonarCloud to process analysis...")
        for _ in range(60):  # Wait up to 120 seconds (60 * 2s)
            data = await self._get(f"ce/task", params={"id": task_id})
            status = data.get("task", {}).get("status", "UNKNOWN")
            
            if status == "SUCCESS":
                logger.info("    [SONAR] Analysis completed successfully!")
                return True
            elif status in ("FAILED", "CANCELED"):
                logger.error("    [SONAR] Analysis failed on SonarCloud (Status: %s)", status)
                return False
                
            await asyncio.sleep(2.0)
            
        logger.warning("    [SONAR] Timeout waiting for analysis to complete.")
        return False

    # ── severity / type mapping ─────────────────────────────────────────────

    @staticmethod
    def _map_severity(sonar_sev: str) -> str:
        return {"BLOCKER": "critical", "CRITICAL": "critical",
                "MAJOR": "high", "MINOR": "medium", "INFO": "low"}.get(
            sonar_sev, "info",
        )

    @staticmethod
    def _map_category(sonar_type: str) -> str:
        return {"BUG": "bug", "VULNERABILITY": "security",
                "CODE_SMELL": "style", "SECURITY_HOTSPOT": "security"}.get(
            sonar_type, "style",
        )

    # ── full commit analysis ────────────────────────────────────────────────

    async def analyze_commit(
        self, commit_info: dict, saved_commit: Commit | None,
    ) -> dict:
        """Fetch SonarCloud data, persist reviews, write report files."""
        short = commit_info["hash"][:8]
        changed = commit_info.get("changed_files", [])

        logger.info("=" * 62)
        logger.info("🔬  SONARCLOUD ANALYSIS — commit %s", short)
        logger.info("    Changed files: %s",
                     ", ".join(changed[:5]) or "(none)")
        logger.info("=" * 62)

        # ── run local scan and wait for cloud processing ────────────────────
        scan_success = await self._run_local_scan(commit_info["hash"], changed)
        if not scan_success:
            logger.warning("    [SONAR] Skipping issue fetch due to scan failure.")
            return {}
            
        logger.info("    [SONAR] Ended. Fetching results...")

        # ── fetch from SonarCloud ───────────────────────────────────────────
        all_issues = await self.fetch_issues()
        file_issues = (
            await self.fetch_issues(file_paths=changed)
            if changed else all_issues
        )
        metrics = await self.fetch_metrics()
        quality_gate = await self.fetch_quality_gate()

        logger.info("    Project-wide issues : %d", len(all_issues))
        logger.info("    On changed files    : %d", len(file_issues))
        logger.info("    Quality gate        : %s",
                     quality_gate.get("status", "UNKNOWN"))

        # ── persist CodeReview rows ─────────────────────────────────────────
        reviews_created = 0
        if saved_commit:
            db: Session = SessionLocal()
            try:
                for issue in file_issues:
                    comp = issue.get("component", "")
                    fpath = comp.split(":", 1)[1] if ":" in comp else comp
                    review = CodeReview(
                        commit_id=saved_commit.id,
                        agent_type="sonarcloud",
                        severity=self._map_severity(issue.get("severity", "INFO")),
                        file_path=fpath,
                        line_start=issue.get("line"),
                        line_end=issue.get("textRange", {}).get("endLine"),
                        category=self._map_category(issue.get("type", "CODE_SMELL")),
                        title=f"[{issue.get('rule', '?')}] {issue.get('type', 'ISSUE')}",
                        message=issue.get("message", ""),
                        suggestion=(
                            f"Rule: {issue.get('rule', 'N/A')} │ "
                            f"Effort: {issue.get('effort', 'N/A')} │ "
                            f"Tags: {', '.join(issue.get('tags', []))}"
                        ),
                        status="pending",
                        confidence=0.9,
                    )
                    db.add(review)
                    reviews_created += 1

                # mark commit as analysed
                rec = db.query(Commit).filter(Commit.id == saved_commit.id).first()
                if rec:
                    rec.analysis_status = "completed"
                db.commit()
            except Exception as exc:
                db.rollback()
                logger.error("DB error saving SonarCloud reviews: %s", exc)
            finally:
                db.close()

        # ── build report payload ────────────────────────────────────────────
        type_counts = {}
        for i in all_issues:
            t = i.get("type", "OTHER")
            type_counts[t] = type_counts.get(t, 0) + 1

        report: dict[str, Any] = {
            "commit_hash": commit_info["hash"],
            "commit_message": commit_info.get("message", ""),
            "author": commit_info.get("author_name", ""),
            "analyzed_at": datetime.utcnow().isoformat(),
            "changed_files": changed,
            "sonar_project_key": self.project_key,
            "quality_gate": quality_gate,
            "metrics": metrics,
            "total_project_issues": len(all_issues),
            "issues_on_changed_files": len(file_issues),
            "reviews_created": reviews_created,
            "issues_by_type": type_counts,
            "issues": [
                {
                    "rule": iss.get("rule"),
                    "severity": iss.get("severity"),
                    "type": iss.get("type"),
                    "message": iss.get("message"),
                    "component": iss.get("component"),
                    "line": iss.get("line"),
                    "effort": iss.get("effort"),
                    "tags": iss.get("tags", []),
                    "status": iss.get("status"),
                }
                for iss in file_issues
            ],
        }

        # ── write JSON report ───────────────────────────────────────────────
        json_path = REPORTS_DIR / f"commit_{short}_sonar_report.json"
        json_path.write_text(
            json.dumps(report, indent=2, default=str), encoding="utf-8",
        )

        # ── write human-readable summary ────────────────────────────────────
        txt_path = REPORTS_DIR / f"commit_{short}_sonar_summary.txt"
        lines = [
            "=" * 62,
            "SONARCLOUD ANALYSIS REPORT",
            "=" * 62,
            f"Commit    : {short} — {commit_info.get('message', '')}",
            f"Author    : {commit_info.get('author_name', '')}",
            f"Analyzed  : {datetime.utcnow():%Y-%m-%d %H:%M:%S UTC}",
            "─" * 62,
            f"Quality Gate : {quality_gate.get('status', 'UNKNOWN')}",
            "",
            "METRICS:",
        ]
        for k, v in metrics.items():
            lines.append(f"  {k:35s} : {v}")
        lines += [
            "",
            "─" * 62,
            f"TOTAL PROJECT ISSUES : {len(all_issues)}",
            f"  Bugs               : {type_counts.get('BUG', 0)}",
            f"  Vulnerabilities    : {type_counts.get('VULNERABILITY', 0)}",
            f"  Code Smells        : {type_counts.get('CODE_SMELL', 0)}",
            f"  Security Hotspots  : {type_counts.get('SECURITY_HOTSPOT', 0)}",
            "",
            f"ISSUES ON CHANGED FILES : {len(file_issues)}",
            "─" * 62,
        ]
        for idx, iss in enumerate(file_issues, 1):
            comp = iss.get("component", "")
            fpath = comp.split(":", 1)[1] if ":" in comp else comp
            lines += [
                "",
                f"  [{idx}] {iss.get('severity', '?')} │ {iss.get('type', '?')}",
                f"      File : {fpath}:{iss.get('line', '?')}",
                f"      Rule : {iss.get('rule', 'N/A')}",
                f"      {iss.get('message', '')}",
            ]
        if not file_issues:
            lines.append("  ✅ No issues found on changed files!")
        lines += ["", "=" * 62]
        txt_path.write_text("\n".join(lines), encoding="utf-8")

        logger.info("    📄 JSON  : %s", json_path.name)
        logger.info("    📄 Text  : %s", txt_path.name)
        logger.info("=" * 62)
        logger.info("🔬  SONARCLOUD ANALYSIS COMPLETE")
        logger.info("    Reviews created : %d", reviews_created)
        logger.info("=" * 62)

        return report


# ─── Helper: build analyser from DB config ──────────────────────────────────────


async def get_sonar_analyzer_for_project(
    project_id: int | None = None,
) -> SonarAnalyzer | None:
    """Instantiate a SonarAnalyzer from the active DB configuration."""
    db: Session = SessionLocal()
    try:
        q = db.query(SonarConfig).filter(SonarConfig.is_active == True)  # noqa: E712
        if project_id is not None:
            q = q.filter(SonarConfig.project_id == project_id)
        cfg = q.first()
        if not cfg:
            logger.warning("No active SonarCloud config found in DB")
            return None
        return SonarAnalyzer(
            host=cfg.sonar_host,
            token=cfg.sonar_token,
            project_key=cfg.sonar_project_key,
        )
    finally:
        db.close()
