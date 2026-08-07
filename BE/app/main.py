"""Enterprise Code Analysis — FastAPI application server.

Provides REST endpoints for project management, commit browsing, code reviews,
authentication, and a WebSocket feed for real-time commit notifications.
"""
from __future__ import annotations

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
from .git_watcher import GitWatcherManager
from .models import CodeReview, Commit, DeveloperScore, Project, User

# ─── Logging ────────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(name)-14s │ %(levelname)-5s │ %(message)s",
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

        logger.info(
            "✅  Seeded: 4 users (admin, dev1, dev2, dev3) + 1 project (C:\\GitRemote)",
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
    logger.info("🚀  ENTERPRISE CODE ANALYSIS SERVER — Starting")
    logger.info("=" * 62)
    init_db()
    _seed_initial_data()

    async def _on_commit(commit_info: dict, saved_commit) -> None:
        """Broadcast every detected commit to WebSocket clients."""
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

    watcher_manager.add_callback(_on_commit)
    await watcher_manager.start_all_active_projects()

    logger.info("✅  Server ready — listening for commits …")

    yield

    # ── shutdown ────────────────────────────────────────────────────────────
    logger.info("🛑  Shutting down …")
    await watcher_manager.stop_all()


# ─── FastAPI app ────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Enterprise Code Analysis API",
    description=(
        "AI-powered multi-agent code review and developer intelligence "
        "platform.  Monitors git repositories, analyses commits, and "
        "provides actionable review suggestions."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Pydantic request / response schemas ───────────────────────────────────────


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


# ─── Health ─────────────────────────────────────────────────────────────────────


@app.get("/health", tags=["Service"], summary="Check service health")
def health():
    return {
        "status": "ok",
        "service": "Enterprise Code Analysis",
        "version": "1.0.0",
        "active_watchers": len(watcher_manager.watchers),
        "ws_connections": len(ws_manager.active_connections),
    }


@app.get("/", tags=["Service"], summary="API discovery")
def root():
    return {
        "name": "Enterprise Code Analysis API",
        "status": "ok",
        "docs": "/docs",
        "endpoints": {
            "health": "GET /health",
            "login": "POST /api/auth/login",
            "projects": "GET /api/projects",
            "commits": "GET /api/commits",
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


# ─── Reviews ───────────────────────────────────────────────────────────────────


@app.get("/api/reviews", tags=["Reviews"], summary="List all code reviews")
def list_reviews(
    commit_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
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
                "category": r.category,
                "title": r.title,
                "message": r.message,
                "status": r.status,
                "confidence": r.confidence,
                "created_at": r.created_at.isoformat(),
            }
            for r in reviews
        ],
    }


@app.put(
    "/api/reviews/{review_id}/accept",
    tags=["Reviews"], summary="Accept a review suggestion",
)
def accept_review(review_id: int, db: Session = Depends(get_db)):
    review = db.query(CodeReview).filter(CodeReview.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    review.status = "accepted"
    db.commit()
    return {"message": "Review accepted", "review_id": review_id}


@app.put(
    "/api/reviews/{review_id}/reject",
    tags=["Reviews"], summary="Reject a review suggestion",
)
def reject_review(review_id: int, db: Session = Depends(get_db)):
    review = db.query(CodeReview).filter(CodeReview.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    review.status = "rejected"
    db.commit()
    return {"message": "Review rejected", "review_id": review_id}


# ─── Dashboard ─────────────────────────────────────────────────────────────────


@app.get("/api/dashboard/stats", tags=["Dashboard"], summary="Dashboard statistics")
def dashboard_stats(db: Session = Depends(get_db)):
    return {
        "total_commits": db.query(Commit).count(),
        "total_reviews": db.query(CodeReview).count(),
        "total_projects": db.query(Project).count(),
        "total_developers": db.query(User).filter(User.role == "developer").count(),
        "pending_reviews": db.query(CodeReview).filter(
            CodeReview.status == "pending",
        ).count(),
        "active_watchers": len(watcher_manager.watchers),
        "ws_connections": len(ws_manager.active_connections),
    }


# ─── Users (admin) ─────────────────────────────────────────────────────────────


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


# ─── WebSocket — real-time commit feed ─────────────────────────────────────────


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
