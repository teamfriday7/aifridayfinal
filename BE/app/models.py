"""Enterprise Code Analysis — SQLAlchemy ORM models."""
from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text,
)
from sqlalchemy.orm import backref, relationship

from .database import Base


# ─── Enums ──────────────────────────────────────────────────────────────────────


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    DEVELOPER = "developer"


class AnalysisStatus(str, enum.Enum):
    PENDING = "pending"
    ANALYZING = "analyzing"
    COMPLETED = "completed"
    FAILED = "failed"


class ReviewStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"


class Severity(str, enum.Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


# ─── Models ─────────────────────────────────────────────────────────────────────


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100), default="")
    role = Column(String(20), default=UserRole.DEVELOPER.value)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    scores = relationship("DeveloperScore", back_populates="user")


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    repo_path = Column(String(500), nullable=False)
    description = Column(Text, default="")
    is_active = Column(Boolean, default=True)
    last_watched_commit = Column(String(40), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    commits = relationship("Commit", back_populates="project")


class Commit(Base):
    __tablename__ = "commits"

    id = Column(Integer, primary_key=True, index=True)
    hash = Column(String(40), unique=True, nullable=False, index=True)
    author_name = Column(String(100), default="")
    author_email = Column(String(100), default="")
    message = Column(Text, default="")
    timestamp = Column(DateTime, nullable=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    files_changed = Column(Integer, default=0)
    insertions = Column(Integer, default=0)
    deletions = Column(Integer, default=0)
    analysis_status = Column(String(20), default=AnalysisStatus.PENDING.value)
    diff_content = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="commits")
    reviews = relationship("CodeReview", back_populates="commit")


class CodeReview(Base):
    __tablename__ = "code_reviews"

    id = Column(Integer, primary_key=True, index=True)
    commit_id = Column(Integer, ForeignKey("commits.id"), nullable=False)
    agent_type = Column(String(50), default="")
    severity = Column(String(20), default=Severity.INFO.value)
    file_path = Column(String(500), default="")
    line_start = Column(Integer, nullable=True)
    line_end = Column(Integer, nullable=True)
    category = Column(String(50), default="")          # bug, security, style, performance
    title = Column(String(200), default="")
    message = Column(Text, default="")
    suggestion = Column(Text, nullable=True)
    original_code = Column(Text, nullable=True)
    suggested_code = Column(Text, nullable=True)
    status = Column(String(20), default=ReviewStatus.PENDING.value)
    confidence = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    commit = relationship("Commit", back_populates="reviews")
    feedbacks = relationship("ReviewFeedback", back_populates="review", cascade="all, delete-orphan")


class ReviewFeedback(Base):
    __tablename__ = "review_feedbacks"

    id = Column(Integer, primary_key=True, index=True)
    review_id = Column(Integer, ForeignKey("code_reviews.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(20), nullable=False)  # "accepted" or "rejected"
    rule_category = Column(String(100), default="general")
    reason = Column(Text, default="")
    pattern_signature = Column(String(255), default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    review = relationship("CodeReview", back_populates="feedbacks")


class DeveloperScore(Base):
    __tablename__ = "developer_scores"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    code_quality_score = Column(Float, default=0.0)
    consistency_score = Column(Float, default=0.0)
    security_score = Column(Float, default=0.0)
    learning_velocity = Column(Float, default=0.0)
    overall_rating = Column(Float, default=0.0)
    total_commits = Column(Integer, default=0)
    total_issues = Column(Integer, default=0)
    updated_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="scores")


class SonarConfig(Base):
    """SonarCloud / SonarQube connection settings, stored per-project."""
    __tablename__ = "sonar_configs"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    sonar_host = Column(String(500), nullable=False)
    sonar_token = Column(String(500), nullable=False)
    sonar_project_key = Column(String(200), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class AnalysisSummary(Base):
    """Composite quality summary produced by MetaAnalyzer for each commit.

    Stores the merged score across SonarCloud + LLM Logic Analyzer findings,
    plus the LLM-generated executive summary and recommendations.
    """
    __tablename__ = "analysis_summaries"

    id = Column(Integer, primary_key=True, index=True)
    commit_id = Column(Integer, ForeignKey("commits.id"), nullable=False, unique=True)

    # ── composite scores (0-100, higher=better) ────────────────────────────────
    composite_score = Column(Float, default=0.0)
    maintainability_score = Column(Float, default=0.0)
    reliability_score = Column(Float, default=0.0)
    security_score = Column(Float, default=0.0)
    performance_score = Column(Float, default=0.0)
    guideline_score = Column(Float, default=0.0)

    # ── LLM-generated narrative ────────────────────────────────────────────────
    executive_summary = Column(Text, default="")
    key_issues = Column(Text, default="[]")        # JSON list of strings
    recommendations = Column(Text, default="[]")   # JSON list of strings

    # ── finding counts by source ───────────────────────────────────────────────
    total_findings = Column(Integer, default=0)
    sonar_findings = Column(Integer, default=0)
    logic_findings = Column(Integer, default=0)
    kb_insights = Column(Integer, default=0)

    updated_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    commit = relationship("Commit", backref=backref("analysis_summary", uselist=False))


class PullRequest(Base):
    """Pull Request record created by developer, reviewed by admin."""
    __tablename__ = "pull_requests"

    id = Column(Integer, primary_key=True, index=True)
    source_branch = Column(String(200), nullable=False)
    destination_branch = Column(String(200), nullable=False)
    status = Column(String(20), default="pending")  # pending / approved / rejected
    created_by = Column(String(100), default="developer")

    # AI analysis results (stored as JSON strings)
    ai_summary = Column(Text, default="")
    ai_conflicts = Column(Text, default="[]")         # JSON list of conflict objects
    ai_recommendations = Column(Text, default="[]")   # JSON list of strings
    changed_files = Column(Text, default="[]")        # JSON list of file paths
    files_changed = Column(Integer, default=0)
    insertions = Column(Integer, default=0)
    deletions = Column(Integer, default=0)
    has_conflicts = Column(Boolean, default=False)

    # Admin review
    admin_comment = Column(Text, default="")
    reviewed_by = Column(String(100), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
