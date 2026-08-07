"""Self-Learning Feedback Mechanism for AI Code Reviews.

Analyzes developer accept/reject decisions to dynamically update rule weights,
suppress false positive patterns, and adapt LLM review comment generation.
"""
from __future__ import annotations

import logging
from collections import defaultdict
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from .models import ReviewFeedback

logger = logging.getLogger("feedback_agent")


class FeedbackLearningEngine:
    """Core analytics & self-learning engine for review feedback."""

    @staticmethod
    def record_feedback(
        db: Session,
        action: str,
        review_id: Optional[int] = None,
        user_id: Optional[int] = None,
        rule_category: str = "general",
        reason: str = "",
        pattern_signature: str = "",
    ) -> ReviewFeedback:
        """Persists developer accept/reject feedback into the database."""
        fb = ReviewFeedback(
            review_id=review_id,
            user_id=user_id,
            action=action.lower(),
            rule_category=rule_category.lower(),
            reason=reason,
            pattern_signature=pattern_signature,
        )
        db.add(fb)
        db.commit()
        db.refresh(fb)
        logger.info(
            "Recorded feedback ID %d: action=%s, category=%s",
            fb.id, fb.action, fb.rule_category,
        )
        return fb

    @staticmethod
    def get_learned_preferences(db: Session) -> Dict[str, Any]:
        """Analyzes historical feedback to derive acceptance rates & suppressed rules."""
        feedbacks = db.query(ReviewFeedback).all()
        if not feedbacks:
            return {
                "total_feedbacks": 0,
                "overall_acceptance_rate": 100.0,
                "category_stats": {},
                "suppressed_categories": [],
                "preferred_categories": [],
            }

        category_counts: Dict[str, Dict[str, int]] = defaultdict(lambda: {"accepted": 0, "rejected": 0})
        total_accepted = 0
        total_rejected = 0

        for fb in feedbacks:
            cat = fb.rule_category or "general"
            if fb.action == "accepted":
                category_counts[cat]["accepted"] += 1
                total_accepted += 1
            elif fb.action == "rejected":
                category_counts[cat]["rejected"] += 1
                total_rejected += 1

        total = total_accepted + total_rejected
        overall_acceptance_rate = (total_accepted / total * 100.0) if total > 0 else 100.0

        category_stats = {}
        suppressed_categories = []
        preferred_categories = []

        for cat, counts in category_counts.items():
            cat_total = counts["accepted"] + counts["rejected"]
            rate = (counts["accepted"] / cat_total * 100.0) if cat_total > 0 else 100.0
            category_stats[cat] = {
                "accepted": counts["accepted"],
                "rejected": counts["rejected"],
                "total": cat_total,
                "acceptance_rate": round(rate, 2),
            }

            # If category has been reviewed at least twice and acceptance rate is below 35%, suppress it as false-positive
            if cat_total >= 2 and rate < 35.0:
                suppressed_categories.append(cat)
            elif cat_total >= 2 and rate >= 75.0:
                preferred_categories.append(cat)

        return {
            "total_feedbacks": total,
            "overall_acceptance_rate": round(overall_acceptance_rate, 2),
            "category_stats": category_stats,
            "suppressed_categories": suppressed_categories,
            "preferred_categories": preferred_categories,
        }

    @staticmethod
    def filter_findings_with_learning(
        findings: Dict[str, Any], preferences: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Applies self-learned preferences to filter out frequently rejected rule categories."""
        suppressed = preferences.get("suppressed_categories", [])
        if not suppressed:
            return findings

        filtered_smells = [
            s for s in findings.get("code_smells", [])
            if s.get("rule", "").lower() not in suppressed
        ]

        filtered_bugs = [
            b for b in findings.get("bug_prone_patterns", [])
            if b.get("pattern", "").lower() not in suppressed
        ]

        filtered_naming = [
            n for n in findings.get("poor_naming", [])
            if "naming" not in suppressed
        ]

        result = dict(findings)
        result["code_smells"] = filtered_smells
        result["bug_prone_patterns"] = filtered_bugs
        result["poor_naming"] = filtered_naming
        result["learned_suppressions_applied"] = [
            cat for cat in suppressed if cat in ("naming", "code_smells", "bug_prone_patterns") or any(
                cat in s.get("rule", "").lower() for s in findings.get("code_smells", [])
            )
        ]
        return result
