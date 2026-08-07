"""Enterprise Code Analysis — FastAPI application server.

Provides REST endpoints for project management, commit browsing, code reviews,
authentication, and a WebSocket feed for real-time commit notifications.

Phase 2: Orchestrates three parallel analysis pipelines on each new commit:
  1. SonarCloud scanner          (sonar_analyzer.py)
  2. Knowledge Base Agent        (knowledge_base_agent.py)
  3. LLM Code Logic Analyzer     (code_logic_analyzer.py)
  → Meta-Analyzer synthesises all three into composite scores + suggestions
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import (
    Depends, FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect,
)
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from .auth import (
    create_access_token, get_current_user, hash_password, require_role,
    verify_password,
)
from .database import SessionLocal, get_db, init_db
from .notifications import send_review_email, send_slack_notification
from .git_watcher import GitWatcherManager
from .models import (
    AnalysisSummary, CodeReview, Commit, DeveloperScore, Project, User, SonarConfig,
)
from .sonar_analyzer import get_sonar_analyzer_for_project
from .knowledge_base_agent import KnowledgeBaseAgent
from .code_logic_analyzer import CodeLogicAnalyzer
from .meta_analyzer import MetaAnalyzer
from .commit_applier import CommitApplier

# ─── Logging ────────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(name)-18s │ %(levelname)-5s │ %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("code_analysis")


# ─── WebSocket connection manager ──────────────────────────────────────────────


class ConnectionManager:
    """Tracks active WebSocket connections and broadcasts JSON messages."""

    def __init__(self) -> None:
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(
            "📡  WebSocket connected (%d total)", len(self.active_connections),
        )

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(
            "📡  WebSocket disconnected (%d total)", len(self.active_connections),
        )

    async def broadcast(self, message: dict) -> None:
        gone: list[WebSocket] = []
        for ws in self.active_connections:
            try:
                await ws.send_json(message)
            except Exception:
                gone.append(ws)
        for ws in gone:
            self.disconnect(ws)


ws_manager = ConnectionManager()
watcher_manager = GitWatcherManager()

# ─── Singleton analysis pipeline components ─────────────────────────────────────
kb_agent = KnowledgeBaseAgent(workers=3, retries=2)
meta_analyzer = MetaAnalyzer()


# ─── Seed data ──────────────────────────────────────────────────────────────────


def _seed_initial_data() -> None:
    db = SessionLocal()
    try:
        if db.query(User).count() > 0:
            return

        logger.info("🌱  Seeding initial data …")

        admin = User(
            username="admin", email="admin@enterprise.com",
            password_hash=hash_password("admin123"),
            full_name="System Administrator", role="admin",
        )
        dev1 = User(
            username="dev1", email="dev1@enterprise.com",
            password_hash=hash_password("dev123"),
            full_name="Alice Developer", role="developer",
        )
        dev2 = User(
            username="dev2", email="dev2@enterprise.com",
            password_hash=hash_password("dev123"),
            full_name="Bob Developer", role="developer",
        )
        dev3 = User(
            username="dev3", email="dev3@enterprise.com",
            password_hash=hash_password("dev123"),
            full_name="Charlie Developer", role="developer",
        )
        db.add_all([admin, dev1, dev2, dev3])
        db.commit()

        project = Project(
            name="AI Friday Final",
            repo_path=r"C:\GitRemote",
            description="Simulated local git remote for hackathon demo",
            is_active=True,
        )
        db.add(project)
        db.commit()

        sonar_cfg = SonarConfig(
            project_id=project.id,
            sonar_host="http://localhost:9008",
            sonar_token="sqa_be206921f5c2dff1b55fcce78208f4c6d7ee7679",
            sonar_project_key="teamfriday7_aifriday",
            is_active=True,
        )
        db.add(sonar_cfg)
        db.commit()

        logger.info(
            "✅  Seeded: 4 users, 1 project, 1 SonarCloud config",
        )
    except Exception as exc:
        db.rollback()
        logger.error("Seeding error: %s", exc)
    finally:
        db.close()


# ─── Application lifecycle ──────────────────────────────────────────────────────


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── startup ─────────────────────────────────────────────────────────────
    logger.info("=" * 62)
    logger.info("🚀  ENTERPRISE CODE ANALYSIS SERVER — Starting (Phase 2)")
    logger.info("=" * 62)
    init_db()
    _seed_initial_data()

    # ── Analysis pipeline helpers ────────────────────────────────────────────

    async def _run_sonar(commit_info: dict, saved_commit) -> dict:
        """Run SonarCloud analysis; returns report or {}."""
        try:
            analyzer = await get_sonar_analyzer_for_project(
                commit_info.get("project_id")
            )
            if analyzer:
                report = await analyzer.analyze_commit(commit_info, saved_commit)
                await analyzer.close()
                return report or {}
        except Exception as exc:
            logger.error("Sonar pipeline error: %s", exc)
        return {}

    async def _run_kb(commit_info: dict) -> dict:
        """Run Knowledge Base Agent; returns kb_result or {}."""
        try:
            return await kb_agent.generate_for_commit(
                repo_path=commit_info.get("repo_path", r"C:\GitRemote"),
                commit_hash=commit_info["hash"],
                changed_files=commit_info.get("changed_files", []),
            )
        except Exception as exc:
            logger.error("KB Agent pipeline error: %s", exc)
            return {}

    async def _run_logic(commit_info: dict, kb_result: dict) -> list[dict]:
        """Run LLM Logic Analyzer; returns findings list."""
        logic_analyzer = CodeLogicAnalyzer()
        try:
            kb_md = kb_result.get("kb_markdown", "") or ""
            findings = await logic_analyzer.analyze(
                diff_content=commit_info.get("diff_content", ""),
                knowledge_base=kb_md if kb_md else None,
                changed_files=commit_info.get("changed_files", []),
                commit_message=commit_info.get("message", ""),
            )
            return findings
        except Exception as exc:
            logger.error("Logic Analyzer pipeline error: %s", exc)
            return []
        finally:
            await logic_analyzer.close()

    async def _on_commit(commit_info: dict, saved_commit) -> None:
        """Broadcast commit event and launch parallel analysis pipeline."""
        # Broadcast immediate commit_detected event
        await ws_manager.broadcast({
            "type": "commit_detected",
            "data": {
                "id": saved_commit.id if saved_commit else None,
                "hash": commit_info["hash"],
                "author": commit_info["author_name"],
                "email": commit_info["author_email"],
                "message": commit_info["message"],
                "timestamp": commit_info["timestamp"].isoformat(),
                "files_changed": commit_info.get("files_changed", 0),
                "insertions": commit_info.get("insertions", 0),
                "deletions": commit_info.get("deletions", 0),
                "changed_files": commit_info.get("changed_files", []),
                "project_id": commit_info.get("project_id"),
            },
        })

        if not saved_commit:
            return

        # ── Phase 2: run all three pipelines in parallel ─────────────────────
        async def _full_pipeline():
            logger.info("🔀  Starting parallel analysis for commit %s …", commit_info["hash"][:8])
            await ws_manager.broadcast({
                "type": "analysis_started",
                "commit_hash": commit_info["hash"],
                "short_hash": commit_info["hash"][:8],
                "pipelines": ["sonarcloud", "knowledge_base", "logic_analyzer"],
            })

            # Run KB, Sonar, and Logic Analyzer in true parallel with WS events
            async def _do_kb():
                await ws_manager.broadcast({"type": "agent_started", "agent": "kb_agent"})
                res = await _run_kb(commit_info)
                await ws_manager.broadcast({"type": "agent_finished", "agent": "kb_agent", "details": "KB extracted"})
                return res

            async def _do_sonar():
                await ws_manager.broadcast({"type": "agent_started", "agent": "sonarcloud"})
                res = await _run_sonar(commit_info, saved_commit)
                findings = len(res.get("issues", [])) if isinstance(res, dict) else 0
                await ws_manager.broadcast({"type": "agent_finished", "agent": "sonarcloud", "details": f"{findings} issues", "findings": findings})
                return res

            async def _do_logic(kb_task):
                await ws_manager.broadcast({"type": "agent_started", "agent": "logic_analyzer"})
                kb_res = await kb_task
                res = await _run_logic(commit_info, kb_res)
                findings = len(res) if isinstance(res, list) else 0
                await ws_manager.broadcast({"type": "agent_finished", "agent": "logic_analyzer", "details": f"{findings} findings", "findings": findings})
                return res

            kb_task = asyncio.create_task(_do_kb())
            sonar_task = asyncio.create_task(_do_sonar())
            logic_task = asyncio.create_task(_do_logic(kb_task))

            sonar_report, logic_findings = await asyncio.gather(sonar_task, logic_task, return_exceptions=False)
            kb_result = kb_task.result()

            await ws_manager.broadcast({"type": "agent_started", "agent": "meta_analyzer"})
            
            # Meta-analyze all results
            summary = await meta_analyzer.synthesize(
                commit_info=commit_info,
                saved_commit=saved_commit,
                sonar_report=sonar_report if isinstance(sonar_report, dict) else {},
                kb_result=kb_result,
                logic_findings=logic_findings if isinstance(logic_findings, list) else [],
            )

            score = summary.get("composite_score", 0)
            total_findings = summary.get("total_findings", 0)
            await ws_manager.broadcast({"type": "agent_finished", "agent": "meta_analyzer", "details": f"{total_findings} total findings", "score": score})

            await ws_manager.broadcast({"type": "agent_started", "agent": "review_engine"})
            await asyncio.sleep(0.5) # Simulating review engine final generation delay
            reviews_created = summary.get("reviews_created", 0)
            await ws_manager.broadcast({"type": "agent_finished", "agent": "review_engine", "details": f"{reviews_created} reviews created"})

            # Broadcast final analysis_complete event
            await ws_manager.broadcast(summary)
            
            # Send notifications (Slack & Email)
            try:
                # Async task in background - hardcoded email as requested
                asyncio.create_task(send_review_email(
                    to_email="jacob120802@gmail.com",
                    repository="Enterprise Code Repo",
                    risk_score=score
                ))
                
                # Slack notification
                severities = summary.get("by_severity", {})
                critical_count = severities.get("critical", 0) + severities.get("high", 0)
                asyncio.create_task(send_slack_notification(
                    repository="Enterprise Code Repo",
                    risk_score=score,
                    issues_count=total_findings,
                    critical_count=critical_count
                ))
            except Exception as e:
                logger.error(f"Failed to trigger notifications: {e}")

            logger.info(
                "✅  Full analysis done — commit %s, score=%s",
                commit_info["hash"][:8],
                summary.get("composite_score", "?"),
            )

        asyncio.create_task(_full_pipeline())

    watcher_manager.add_callback(_on_commit)
    await watcher_manager.start_all_active_projects()

    logger.info("✅  Server ready — listening for commits …")

    yield

    # ── shutdown ────────────────────────────────────────────────────────────
    logger.info("🛑  Shutting down …")
    await watcher_manager.stop_all()
    await meta_analyzer.close()


# ─── FastAPI app ────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Enterprise Code Analysis API",
    description=(
        "AI-powered multi-agent code review and developer intelligence "
        "platform.  Monitors git repositories, analyses commits via "
        "SonarCloud + Knowledge Base + LLM Logic Analyzer, and provides "
        "actionable review suggestions with accept/reject/commit workflow."
    ),
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:8001",
        "http://127.0.0.1:8001",
        # Local network IPs for demo/hackathon
        "http://10.167.80.174:3000",
        "http://10.167.80.174:8000",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)


# ─── Pydantic schemas ───────────────────────────────────────────────────────────


class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    full_name: str = ""
    role: str = "developer"


class ProjectCreate(BaseModel):
    name: str
    repo_path: str
    description: str = ""


class AcceptReviewRequest(BaseModel):
    accepted_by: str = "admin"
    working_copy: str = r"C:\aifridayfinal"


# ─── Health ─────────────────────────────────────────────────────────────────────


@app.get("/health", tags=["Service"], summary="Check service health")
def health():
    return {
        "status": "ok",
        "service": "Enterprise Code Analysis",
        "version": "2.0.0",
        "phase": "2 — Parallel Analysis Pipeline",
        "active_watchers": len(watcher_manager.watchers),
        "ws_connections": len(ws_manager.active_connections),
    }


@app.get("/", tags=["Service"], summary="API discovery")
def root():
    return {
        "name": "Enterprise Code Analysis API v2",
        "status": "ok",
        "docs": "/docs",
        "endpoints": {
            "health": "GET /health",
            "login": "POST /api/auth/login",
            "projects": "GET /api/projects",
            "commits": "GET /api/commits",
            "reviews": "GET /api/reviews",
            "analysis_summary": "GET /api/analysis/{commit_hash}/summary",
            "accept_review": "PUT /api/reviews/{id}/accept",
            "reject_review": "PUT /api/reviews/{id}/reject",
            "reanalyze": "POST /api/commits/{hash}/reanalyze",
            "websocket": "WS /ws/commits",
        },
    }


# ─── Auth endpoints ────────────────────────────────────────────────────────────


@app.post("/api/auth/login", tags=["Auth"], summary="Login and get JWT")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == request.username).first()
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": user.username, "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
        },
    }


@app.post("/api/auth/register", tags=["Auth"], summary="Register a new user")
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == request.username).first():
        raise HTTPException(status_code=400, detail="Username already exists")
    if db.query(User).filter(User.email == request.email).first():
        raise HTTPException(status_code=400, detail="Email already exists")
    user = User(
        username=request.username,
        email=request.email,
        password_hash=hash_password(request.password),
        full_name=request.full_name,
        role=request.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"message": "User created successfully", "user_id": user.id}


@app.get("/api/auth/me", tags=["Auth"], summary="Get current user profile")
def get_me(user: User = Depends(get_current_user)):
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
    }


# ─── Projects ──────────────────────────────────────────────────────────────────


@app.get("/api/projects", tags=["Projects"], summary="List all projects")
def list_projects(db: Session = Depends(get_db)):
    projects = db.query(Project).all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "repo_path": p.repo_path,
            "description": p.description,
            "is_active": p.is_active,
            "last_watched_commit": p.last_watched_commit,
            "is_watching": p.id in watcher_manager.watchers,
            "created_at": p.created_at.isoformat(),
        }
        for p in projects
    ]


@app.post("/api/projects", tags=["Projects"], status_code=201, summary="Register a project")
async def create_project(request: ProjectCreate, db: Session = Depends(get_db)):
    project = Project(
        name=request.name,
        repo_path=request.repo_path,
        description=request.description,
        is_active=True,
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    if Path(request.repo_path).exists():
        await watcher_manager.start_watching(project.id, project.repo_path)

    return {"message": "Project created and watching started", "project_id": project.id}


@app.put(
    "/api/projects/{project_id}/activate",
    tags=["Projects"], summary="Activate and start watching a project",
)
async def activate_project(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    project.is_active = True
    db.commit()
    if Path(project.repo_path).exists():
        await watcher_manager.start_watching(project.id, project.repo_path)
    return {"message": f"Project '{project.name}' activated"}


@app.put(
    "/api/projects/{project_id}/deactivate",
    tags=["Projects"], summary="Deactivate and stop watching a project",
)
async def deactivate_project(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    project.is_active = False
    db.commit()
    await watcher_manager.stop_watching(project_id)
    return {"message": f"Project '{project.name}' deactivated"}


# ─── Commits ───────────────────────────────────────────────────────────────────


@app.get("/api/commits", tags=["Commits"], summary="List commits")
def list_commits(
    project_id: Optional[int] = Query(None),
    author: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    db: Session = Depends(get_db),
):
    query = db.query(Commit).order_by(Commit.timestamp.desc())
    if project_id is not None:
        query = query.filter(Commit.project_id == project_id)
    if author:
        query = query.filter(Commit.author_name.ilike(f"%{author}%"))
    total = query.count()
    commits = query.offset(offset).limit(limit).all()
    return {
        "total": total,
        "commits": [
            {
                "id": c.id,
                "hash": c.hash,
                "author_name": c.author_name,
                "author_email": c.author_email,
                "message": c.message,
                "timestamp": c.timestamp.isoformat() if c.timestamp else None,
                "project_id": c.project_id,
                "files_changed": c.files_changed,
                "insertions": c.insertions,
                "deletions": c.deletions,
                "analysis_status": c.analysis_status,
                "created_at": c.created_at.isoformat(),
            }
            for c in commits
        ],
    }


@app.get("/api/commits/{commit_hash}", tags=["Commits"], summary="Get commit detail")
def get_commit_detail(commit_hash: str, db: Session = Depends(get_db)):
    commit = db.query(Commit).filter(Commit.hash.startswith(commit_hash)).first()
    if not commit:
        raise HTTPException(status_code=404, detail="Commit not found")
    reviews = db.query(CodeReview).filter(CodeReview.commit_id == commit.id).all()

    # Load analysis summary if available
    summary = None
    if hasattr(commit, "analysis_summary") and commit.analysis_summary:
        s = commit.analysis_summary
        summary = {
            "composite_score": s.composite_score,
            "maintainability_score": s.maintainability_score,
            "reliability_score": s.reliability_score,
            "security_score": s.security_score,
            "performance_score": s.performance_score,
            "guideline_score": s.guideline_score,
            "executive_summary": s.executive_summary,
            "key_issues": json.loads(s.key_issues or "[]"),
            "recommendations": json.loads(s.recommendations or "[]"),
            "total_findings": s.total_findings,
        }

    return {
        "id": commit.id,
        "hash": commit.hash,
        "author_name": commit.author_name,
        "author_email": commit.author_email,
        "message": commit.message,
        "timestamp": commit.timestamp.isoformat() if commit.timestamp else None,
        "project_id": commit.project_id,
        "files_changed": commit.files_changed,
        "insertions": commit.insertions,
        "deletions": commit.deletions,
        "analysis_status": commit.analysis_status,
        "diff_content": commit.diff_content,
        "analysis_summary": summary,
        "reviews": [
            {
                "id": r.id,
                "agent_type": r.agent_type,
                "severity": r.severity,
                "file_path": r.file_path,
                "line_start": r.line_start,
                "line_end": r.line_end,
                "category": r.category,
                "title": r.title,
                "message": r.message,
                "suggestion": r.suggestion,
                "original_code": r.original_code,
                "suggested_code": r.suggested_code,
                "status": r.status,
                "confidence": r.confidence,
            }
            for r in reviews
        ],
    }


@app.post(
    "/api/commits/{commit_hash}/reanalyze",
    tags=["Commits"], summary="Manually trigger re-analysis for a commit",
)
async def reanalyze_commit(commit_hash: str, db: Session = Depends(get_db)):
    """Re-trigger the full KB + Logic + Meta analysis pipeline for a commit."""
    commit = db.query(Commit).filter(Commit.hash.startswith(commit_hash)).first()
    if not commit:
        raise HTTPException(status_code=404, detail="Commit not found")

    project = db.query(Project).filter(Project.id == commit.project_id).first()
    repo_path = project.repo_path if project else r"C:\GitRemote"

    commit_info = {
        "hash": commit.hash,
        "author_name": commit.author_name,
        "author_email": commit.author_email,
        "message": commit.message,
        "timestamp": commit.timestamp,
        "diff_content": commit.diff_content or "",
        "changed_files": [],
        "files_changed": commit.files_changed,
        "insertions": commit.insertions,
        "deletions": commit.deletions,
        "project_id": commit.project_id,
        "repo_path": repo_path,
    }

    async def _bg_reanalyze():
        kb_result = await kb_agent.generate_for_commit(
            repo_path=repo_path,
            commit_hash=commit.hash,
            changed_files=[],
        )
        logic_analyzer = CodeLogicAnalyzer()
        try:
            logic_findings = await logic_analyzer.analyze(
                diff_content=commit.diff_content or "",
                knowledge_base=kb_result.get("kb_markdown"),
                changed_files=[],
                commit_message=commit.message,
            )
        finally:
            await logic_analyzer.close()

        summary = await meta_analyzer.synthesize(
            commit_info=commit_info,
            saved_commit=commit,
            sonar_report={},
            kb_result=kb_result,
            logic_findings=logic_findings,
        )
        await ws_manager.broadcast(summary)

    asyncio.create_task(_bg_reanalyze())
    return {"message": f"Re-analysis started for commit {commit_hash[:8]}"}


# ─── Analysis Summary ──────────────────────────────────────────────────────────


@app.get(
    "/api/analysis/{commit_hash}/summary",
    tags=["Analysis"], summary="Get composite analysis summary for a commit",
)
def get_analysis_summary(commit_hash: str, db: Session = Depends(get_db)):
    commit = db.query(Commit).filter(Commit.hash.startswith(commit_hash)).first()
    if not commit:
        raise HTTPException(status_code=404, detail="Commit not found")

    summary = (
        db.query(AnalysisSummary)
        .filter(AnalysisSummary.commit_id == commit.id)
        .first()
    )
    if not summary:
        raise HTTPException(status_code=404, detail="No analysis summary found for this commit. Analysis may still be running.")

    return {
        "commit_hash": commit.hash,
        "composite_score": summary.composite_score,
        "maintainability_score": summary.maintainability_score,
        "reliability_score": summary.reliability_score,
        "security_score": summary.security_score,
        "performance_score": summary.performance_score,
        "guideline_score": summary.guideline_score,
        "executive_summary": summary.executive_summary,
        "key_issues": json.loads(summary.key_issues or "[]"),
        "recommendations": json.loads(summary.recommendations or "[]"),
        "total_findings": summary.total_findings,
        "sonar_findings": summary.sonar_findings,
        "logic_findings": summary.logic_findings,
        "updated_at": summary.updated_at.isoformat() if summary.updated_at else None,
    }


# ─── Reviews ───────────────────────────────────────────────────────────────────


@app.get("/api/reviews", tags=["Reviews"], summary="List all code reviews")
def list_reviews(
    commit_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    agent_type: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
):
    query = db.query(CodeReview).order_by(CodeReview.created_at.desc())
    if commit_id is not None:
        query = query.filter(CodeReview.commit_id == commit_id)
    if status:
        query = query.filter(CodeReview.status == status)
    if severity:
        query = query.filter(CodeReview.severity == severity)
    if category:
        query = query.filter(CodeReview.category == category)
    if agent_type:
        query = query.filter(CodeReview.agent_type == agent_type)
    total = query.count()
    reviews = query.limit(limit).all()
    return {
        "total": total,
        "reviews": [
            {
                "id": r.id,
                "commit_id": r.commit_id,
                "agent_type": r.agent_type,
                "severity": r.severity,
                "file_path": r.file_path,
                "line_start": r.line_start,
                "line_end": r.line_end,
                "category": r.category,
                "title": r.title,
                "message": r.message,
                "original_code": r.original_code,
                "suggested_code": r.suggested_code,
                "status": r.status,
                "confidence": r.confidence,
                "created_at": r.created_at.isoformat(),
            }
            for r in reviews
        ],
    }


from .feedback_agent import FeedbackLearningEngine


class ReviewFeedbackRequest(BaseModel):
    reason: Optional[str] = Field("", description="Optional developer reason for feedback")
    rule_category: Optional[str] = Field("general", description="Rule category e.g. naming, bug, style, security")


@app.put(
    "/api/reviews/{review_id}/accept",
    tags=["Reviews"], summary="Accept a review suggestion and record feedback",
)
def accept_review(review_id: int, req: Optional[ReviewFeedbackRequest] = None, db: Session = Depends(get_db)):
    review = db.query(CodeReview).filter(CodeReview.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    return {
        "id": review.id,
        "commit_id": review.commit_id,
        "agent_type": review.agent_type,
        "severity": review.severity,
        "file_path": review.file_path,
        "line_start": review.line_start,
        "line_end": review.line_end,
        "category": review.category,
        "title": review.title,
        "message": review.message,
        "suggestion": review.suggestion,
        "original_code": review.original_code,
        "suggested_code": review.suggested_code,
        "status": review.status,
        "confidence": review.confidence,
        "created_at": review.created_at.isoformat(),
    }


@app.put(
    "/api/reviews/{review_id}/accept",
    tags=["Reviews"], summary="Accept a review suggestion and create AI commit",
)
def accept_review(
    review_id: int,
    request: Optional[AcceptReviewRequest] = None,
    db: Session = Depends(get_db),
):
    """Accept a suggestion: applies the fix to the working copy and creates an AI commit."""
    review = db.query(CodeReview).filter(CodeReview.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    accepted_by = (request.accepted_by if request else None) or "admin"
    working_copy = (request.working_copy if request else None) or r"C:\aifridayfinal"

    result = {"review_accepted": True, "commit_result": None}

    # Apply the fix if suggested_code is available
    if review.suggested_code and review.suggested_code.strip():
        applier = CommitApplier(working_copy=working_copy)
        commit_result = applier.apply_fix(
            review={
                "file_path": review.file_path,
                "line_start": review.line_start,
                "line_end": review.line_end,
                "original_code": review.original_code,
                "suggested_code": review.suggested_code,
                "category": review.category,
                "severity": review.severity,
                "title": review.title,
            },
            accepted_by=accepted_by,
        )
        result["commit_result"] = commit_result
    else:
        result["commit_result"] = {"success": False, "error": "No suggested_code available"}

    # Always mark as accepted in DB
    review.status = "accepted"
    db.commit()

    category = (req.rule_category if req else None) or review.category or "general"
    reason = (req.reason if req else "") or "Developer accepted suggestion"

    FeedbackLearningEngine.record_feedback(
        db=db,
        action="accepted",
        review_id=review_id,
        rule_category=category,
        reason=reason,
    )
    return {"message": "Review accepted and feedback recorded", "review_id": review_id}


@app.put(
    "/api/reviews/{review_id}/reject",
    tags=["Reviews"], summary="Reject a review suggestion and record feedback",
)
def reject_review(review_id: int, req: Optional[ReviewFeedbackRequest] = None, db: Session = Depends(get_db)):
    review = db.query(CodeReview).filter(CodeReview.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    review.status = "rejected"
    db.commit()

    category = (req.rule_category if req else None) or review.category or "general"
    reason = (req.reason if req else "") or "Developer rejected suggestion"

    FeedbackLearningEngine.record_feedback(
        db=db,
        action="rejected",
        review_id=review_id,
        rule_category=category,
        reason=reason,
    )
    return {"message": "Review rejected and feedback recorded", "review_id": review_id}


class DirectFeedbackRequest(BaseModel):
    action: str = Field(..., description="'accepted' or 'rejected'")
    rule_category: str = Field("general", description="Category e.g. naming, bare_except, self_assignment")
    reason: Optional[str] = Field("", description="Feedback reason")


@app.post(
    "/api/codebert/feedback",
    tags=["CodeBERT Agent"], summary="Submit direct accept/reject feedback for CodeBERT suggestions",
)
def record_codebert_feedback(req: DirectFeedbackRequest, db: Session = Depends(get_db)):
    fb = FeedbackLearningEngine.record_feedback(
        db=db,
        action=req.action,
        rule_category=req.rule_category,
        reason=req.reason or "",
    )
    return {"message": "Feedback recorded", "feedback_id": fb.id}


@app.get(
    "/api/feedback/analytics",
    tags=["Self-Learning Engine"], summary="Get feedback analytics & active self-learned rule adaptations",
)
def get_feedback_analytics(db: Session = Depends(get_db)):
    return FeedbackLearningEngine.get_learned_preferences(db)


@app.post("/api/codebert/analyze", tags=["CodeBERT Agent"], summary="Perform CodeBERT semantic analysis & LLM review comment generation")
def codebert_analyze(req: CodeAnalyzeRequest, db: Session = Depends(get_db)):
    learned_prefs = FeedbackLearningEngine.get_learned_preferences(db)
    semantics = codebert_analyzer.analyze_semantics(req.code)

    # Apply self-learned suppressions to findings
    filtered_semantics = FeedbackLearningEngine.filter_findings_with_learning(semantics, learned_prefs)
    review_comment = LLMReviewSynthesizer.generate_review_comment(filtered_semantics, None, learned_prefs)

    response = {
        "embedding": semantics["embedding"],
        "embedding_dim": semantics["embedding_dim"],
        "code_smells": filtered_semantics["code_smells"],
        "poor_naming": filtered_semantics["poor_naming"],
        "bug_prone_patterns": filtered_semantics["bug_prone_patterns"],
        "function_semantics": semantics["function_semantics"],
        "metrics": semantics["metrics"],
        "learned_preferences": learned_prefs,
        "review_comment": review_comment,
    }

    if req.compare_code:
        response["similarity_score"] = codebert_analyzer.estimate_similarity(req.code, req.compare_code)

    if req.snippets:
        response["duplicate_logic"] = codebert_analyzer.find_duplicate_logic(req.snippets)

    return response


@app.post("/api/codebert/diff", tags=["CodeBERT Agent"], summary="Perform CodeBERT diff comparison, risk analysis & LLM review comment generation")
def codebert_diff(req: CodeDiffRequest, db: Session = Depends(get_db)):
    learned_prefs = FeedbackLearningEngine.get_learned_preferences(db)
    diff_analysis = codebert_analyzer.compare_diff(req.old_code, req.new_code)
    semantics = codebert_analyzer.analyze_semantics(req.new_code)

    filtered_semantics = FeedbackLearningEngine.filter_findings_with_learning(semantics, learned_prefs)
    review_comment = LLMReviewSynthesizer.generate_review_comment(filtered_semantics, diff_analysis, learned_prefs)

    return {
        "diff_analysis": diff_analysis,
        "new_code_semantics": filtered_semantics,
        "learned_preferences": learned_prefs,
        "review_comment": review_comment,
    }


# ─── Dashboard ─────────────────────────────────────────────────────────────────


@app.get("/api/dashboard/stats", tags=["Dashboard"], summary="Dashboard statistics")
def dashboard_stats(db: Session = Depends(get_db)):
    # Compute average composite score from summaries if AnalysisSummary table exists
    try:
        from .models import AnalysisSummary
        summaries = db.query(AnalysisSummary).all()
        avg_score = (
            sum(s.composite_score for s in summaries) / len(summaries)
            if summaries else 0
        )
    except Exception:
        summaries = []
        avg_score = 0.0

    return {
        "total_commits": db.query(Commit).count(),
        "total_reviews": db.query(CodeReview).count(),
        "total_projects": db.query(Project).count(),
        "total_developers": db.query(User).filter(User.role == "developer").count(),
        "pending_reviews": db.query(CodeReview).filter(
            CodeReview.status == "pending",
        ).count(),
        "accepted_reviews": db.query(CodeReview).filter(
            CodeReview.status == "accepted",
        ).count(),
        "rejected_reviews": db.query(CodeReview).filter(
            CodeReview.status == "rejected",
        ).count(),
        "active_watchers": len(watcher_manager.watchers),
        "ws_connections": len(ws_manager.active_connections),
        "avg_composite_score": round(avg_score, 1),
        "analyses_completed": len(summaries),
    }


@app.get("/api/dashboard/leaderboard", tags=["Dashboard"], summary="Developer quality leaderboard")
def get_leaderboard(db: Session = Depends(get_db)):
    """Return developers ranked by their code quality (based on commit analysis scores)."""
    developers = db.query(User).filter(User.role == "developer").all()

    leaderboard = []
    for dev in developers:
        commits = db.query(Commit).filter(
            Commit.author_email == dev.email
        ).all()
        commit_ids = [c.id for c in commits]

        summaries = []
        for cid in commit_ids:
            c = db.query(Commit).filter(Commit.id == cid).first()
            if c and hasattr(c, "analysis_summary") and c.analysis_summary:
                summaries.append(c.analysis_summary)

        avg_score = (
            sum(s.composite_score for s in summaries) / len(summaries)
            if summaries else 75.0  # default for new devs
        )

        total_reviews = db.query(CodeReview).filter(
            CodeReview.commit_id.in_(commit_ids)
        ).count() if commit_ids else 0

        accepted = db.query(CodeReview).filter(
            CodeReview.commit_id.in_(commit_ids),
            CodeReview.status == "accepted",
        ).count() if commit_ids else 0

        leaderboard.append({
            "user_id": dev.id,
            "username": dev.username,
            "full_name": dev.full_name,
            "email": dev.email,
            "total_commits": len(commits),
            "avg_quality_score": round(avg_score, 1),
            "total_reviews": total_reviews,
            "accepted_suggestions": accepted,
            "acceptance_rate": round(accepted / total_reviews * 100, 1) if total_reviews > 0 else 0,
        })

    leaderboard.sort(key=lambda d: d["avg_quality_score"], reverse=True)
    for i, d in enumerate(leaderboard):
        d["rank"] = i + 1

    return leaderboard


# ─── Users ─────────────────────────────────────────────────────────────────────


@app.get("/api/users", tags=["Users"], summary="List all users")
def list_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return [
        {
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role,
            "is_active": u.is_active,
            "created_at": u.created_at.isoformat(),
        }
        for u in users
    ]


# ─── WebSocket ─────────────────────────────────────────────────────────────────


@app.websocket("/ws/commits")
async def websocket_commits(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)

