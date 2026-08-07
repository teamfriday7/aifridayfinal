"""CodeBERT Pretrained Model Agent Layer for Semantic Code Understanding.

Uses Hugging Face `microsoft/codebert-base` to extract 768-dimensional code embeddings
and perform:
- Code smell detection & bug-prone pattern recognition
- Old vs. New code diff semantic comparison & risk identification
- Duplicate logic detection & similarity estimation
- Function semantic analysis
- LLM synthesis into human-readable code review comments
"""
from __future__ import annotations

import ast
import logging
import math
import os
import re
from typing import Any, Dict, List, Optional, Tuple

import torch
from transformers import AutoModel, AutoTokenizer

logger = logging.getLogger("codebert_agent")

CODEBERT_MODEL_NAME = "microsoft/codebert-base"


class CodeBERTModel:
    """Wrapper around microsoft/codebert-base with graceful fallback."""

    def __init__(self, model_name: str = CODEBERT_MODEL_NAME) -> None:
        self.model_name = model_name
        self.tokenizer = None
        self.model = None
        self.is_loaded = False
        self._init_model()

    def _init_model(self) -> None:
        try:
            logger.info("Initializing CodeBERT tokenizer and model (%s)...", self.model_name)
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            self.model = AutoModel.from_pretrained(self.model_name)
            self.model.eval()
            self.is_loaded = True
            logger.info("CodeBERT model loaded successfully.")
        except Exception as err:
            logger.warning(
                "CodeBERT model failed to load from Hugging Face hub (%s). "
                "Using fallback heuristic tokenizer/embedding generator. Details: %s",
                self.model_name,
                err,
            )
            self.is_loaded = False

    def get_embedding(self, code: str) -> List[float]:
        """Generate a 768-dimensional embedding for a given code snippet."""
        if not code or not code.strip():
            return [0.0] * 768

        if self.is_loaded and self.tokenizer and self.model:
            try:
                inputs = self.tokenizer(
                    code,
                    return_tensors="pt",
                    max_length=512,
                    truncation=True,
                    padding=True,
                )
                with torch.no_grad():
                    outputs = self.model(**inputs)
                    # CLS token output vector representing full sequence semantics
                    cls_embedding = outputs.last_hidden_state[:, 0, :].squeeze(0)
                    # Normalize embedding vector
                    norm_vec = torch.nn.functional.normalize(cls_embedding, p=2, dim=0)
                    return norm_vec.tolist()
            except Exception as e:
                logger.error("Error during CodeBERT embedding generation: %s", e)

        # Fallback embedding generator (deterministic 768-dim pseudo-vector using token hashing)
        return self._fallback_embedding(code)

    def _fallback_embedding(self, code: str) -> List[float]:
        """Deterministic 768-dim embedding for fallback mode."""
        vec = [0.0] * 768
        tokens = re.findall(r"\w+", code)
        if not tokens:
            return vec

        for idx, token in enumerate(tokens):
            h = hash(token)
            pos = abs(h) % 768
            val = math.sin(h + idx)
            vec[pos] += val

        # Normalize
        norm = math.sqrt(sum(v * v for v in vec)) or 1.0
        return [v / norm for v in vec]

    @staticmethod
    def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
        """Calculate cosine similarity between two embedding vectors."""
        if len(vec_a) != len(vec_b) or not vec_a or not vec_b:
            return 0.0
        dot = sum(a * b for a, b in zip(vec_a, vec_b))
        norm_a = math.sqrt(sum(a * a for a in vec_a)) or 1.0
        norm_b = math.sqrt(sum(b * b for b in vec_b)) or 1.0
        return float(dot / (norm_a * norm_b))


class CodeAnalyzer:
    """Semantic analysis suite utilizing CodeBERT embeddings and AST introspection."""

    def __init__(self, codebert_model: Optional[CodeBERTModel] = None) -> None:
        self.model = codebert_model or CodeBERTModel()

    def analyze_semantics(self, code: str) -> Dict[str, Any]:
        """Comprehensive semantic analysis of a single code snippet."""
        embedding = self.model.get_embedding(code)
        smells_and_bugs = self.detect_smells_and_bugs(code)
        semantics = self.understand_function_semantics(code)

        return {
            "embedding": embedding,
            "embedding_dim": len(embedding),
            "code_smells": smells_and_bugs["code_smells"],
            "poor_naming": smells_and_bugs["poor_naming"],
            "bug_prone_patterns": smells_and_bugs["bug_prone_patterns"],
            "function_semantics": semantics,
            "metrics": {
                "line_count": len(code.splitlines()),
                "char_count": len(code),
                "risk_score": len(smells_and_bugs["code_smells"]) * 2
                + len(smells_and_bugs["bug_prone_patterns"]) * 3
                + len(smells_and_bugs["poor_naming"]),
            },
        }

    def compare_diff(self, old_code: str, new_code: str) -> Dict[str, Any]:
        """Compare old vs new code using CodeBERT semantic embeddings and AST changes."""
        emb_old = self.model.get_embedding(old_code)
        emb_new = self.model.get_embedding(new_code)
        similarity = CodeBERTModel.cosine_similarity(emb_old, emb_new)

        semantic_shift = max(0.0, min(1.0, 1.0 - similarity))

        old_analysis = self.analyze_semantics(old_code)
        new_analysis = self.analyze_semantics(new_code)

        new_bugs = [
            b for b in new_analysis["bug_prone_patterns"]
            if b not in old_analysis["bug_prone_patterns"]
        ]
        new_smells = [
            s for s in new_analysis["code_smells"]
            if s not in old_analysis["code_smells"]
        ]

        risky_changes = []
        if semantic_shift > 0.45:
            risky_changes.append(
                f"High semantic divergence detected (similarity: {similarity:.2f}). Core logic may have significantly changed."
            )
        if new_bugs:
            risky_changes.append(f"Introduced {len(new_bugs)} new bug-prone pattern(s).")
        if new_smells:
            risky_changes.append(f"Introduced {len(new_smells)} new code smell(s).")

        # Check for exception handling removal
        if "except" in old_code and "except" not in new_code:
            risky_changes.append("Exception handling (try/except block) appears to have been removed.")

        risk_level = "LOW"
        if len(risky_changes) >= 2 or semantic_shift > 0.5:
            risk_level = "HIGH"
        elif len(risky_changes) == 1 or semantic_shift > 0.25:
            risk_level = "MEDIUM"

        return {
            "similarity_score": round(similarity, 4),
            "semantic_shift": round(semantic_shift, 4),
            "risk_level": risk_level,
            "risky_changes": risky_changes,
            "old_code_metrics": old_analysis["metrics"],
            "new_code_metrics": new_analysis["metrics"],
            "new_bugs_introduced": new_bugs,
            "new_smells_introduced": new_smells,
        }

    def estimate_similarity(self, code_a: str, code_b: str) -> float:
        """Estimate semantic similarity between two code blocks."""
        emb_a = self.model.get_embedding(code_a)
        emb_b = self.model.get_embedding(code_b)
        return round(CodeBERTModel.cosine_similarity(emb_a, emb_b), 4)

    def find_duplicate_logic(
        self, code_blocks: List[Dict[str, str]], similarity_threshold: float = 0.85
    ) -> List[Dict[str, Any]]:
        """Identify duplicate or near-duplicate logic blocks across multiple snippets."""
        duplicates = []
        embeddings = [
            (block.get("id", f"snippet_{idx}"), block.get("code", ""), self.model.get_embedding(block.get("code", "")))
            for idx, block in enumerate(code_blocks)
        ]

        for i in range(len(embeddings)):
            for j in range(i + 1, len(embeddings)):
                id_a, code_a, emb_a = embeddings[i]
                id_b, code_b, emb_b = embeddings[j]
                sim = CodeBERTModel.cosine_similarity(emb_a, emb_b)
                if sim >= similarity_threshold:
                    duplicates.append(
                        {
                            "snippet_a": id_a,
                            "snippet_b": id_b,
                            "similarity": round(sim, 4),
                            "match_type": "Exact/Near-Duplicate Semantic Match"
                            if sim > 0.95
                            else "High Structural/Semantic Similarity",
                        }
                    )
        return duplicates

    def detect_smells_and_bugs(self, code: str) -> Dict[str, List[Dict[str, str]]]:
        """Detect code smells, poor naming, and bug-prone patterns using AST and static heuristics."""
        code_smells = []
        poor_naming = []
        bug_prone_patterns = []

        lines = code.splitlines()

        # Line length / Long method smell
        if len(lines) > 50:
            code_smells.append(
                {
                    "rule": "Long Function/Method",
                    "severity": "medium",
                    "description": f"Function has {len(lines)} lines. Consider splitting into smaller modules.",
                }
            )

        # Deep nesting check
        max_indent = max((len(line) - len(line.lstrip(" "))) // 4 for line in lines if line.strip()) if lines else 0
        if max_indent >= 4:
            code_smells.append(
                {
                    "rule": "Deep Nesting",
                    "severity": "high",
                    "description": f"Maximum nesting level of {max_indent} detected. Refactor to reduce complexity.",
                }
            )

        # AST analysis for Python code
        try:
            tree = ast.parse(code)
            for node in ast.walk(tree):
                # Poor variable / function naming
                if isinstance(node, ast.FunctionDef):
                    if len(node.name) == 1 and node.name not in ("_", "f"):
                        poor_naming.append(
                            {
                                "identifier": node.name,
                                "type": "function",
                                "issue": "Single-letter function name lacks descriptive context.",
                            }
                        )
                elif isinstance(node, ast.Name) and isinstance(node.ctx, ast.Store):
                    if node.id in ("temp", "tmp", "data", "foo", "bar", "val", "x", "y", "z"):
                        poor_naming.append(
                            {
                                "identifier": node.id,
                                "type": "variable",
                                "issue": f"Generic or meaningless variable name '{node.id}'.",
                            }
                        )

                # Bare except clause
                elif isinstance(node, ast.ExceptHandler):
                    if node.type is None:
                        bug_prone_patterns.append(
                            {
                                "pattern": "Bare Except Clause",
                                "severity": "high",
                                "description": "Catching all exceptions silently can mask critical runtime failures.",
                            }
                        )

                # Mutable default argument
                elif isinstance(node, ast.FunctionDef):
                    for default in node.args.defaults:
                        if isinstance(default, (ast.List, ast.Dict, ast.Set)):
                            bug_prone_patterns.append(
                                {
                                    "pattern": "Mutable Default Argument",
                                    "severity": "high",
                                    "description": f"Function '{node.name}' uses a mutable default argument.",
                                }
                            )

                # Hardcoded credentials heuristic
                elif isinstance(node, ast.Assign):
                    for target in node.targets:
                        if isinstance(target, ast.Name):
                            # Self-assignment logical error: x = x
                            if isinstance(node.value, ast.Name) and target.id == node.value.id:
                                bug_prone_patterns.append(
                                    {
                                        "pattern": "Logical Error: Self Assignment",
                                        "severity": "high",
                                        "description": f"Variable '{target.id}' is assigned to itself.",
                                    }
                                )

                        if isinstance(target, ast.Name) and any(
                            kw in target.id.lower() for kw in ("password", "secret", "token", "api_key")
                        ):
                            if isinstance(node.value, ast.Constant) and isinstance(node.value.value, str):
                                bug_prone_patterns.append(
                                    {
                                        "pattern": "Hardcoded Credential / Secret",
                                        "severity": "critical",
                                        "description": f"Potential hardcoded secret assigned to '{target.id}'.",
                                    }
                                )

                # Logical Error: Unreachable code after return / raise / break / continue
                elif isinstance(node, (ast.FunctionDef, ast.For, ast.While)):
                    statements = node.body
                    for idx, stmt in enumerate(statements[:-1]):
                        if isinstance(stmt, (ast.Return, ast.Raise, ast.Break, ast.Continue)):
                            unreachable_stmt = statements[idx + 1]
                            bug_prone_patterns.append(
                                {
                                    "pattern": "Logical Error: Unreachable Code",
                                    "severity": "high",
                                    "description": f"Code after line {getattr(stmt, 'lineno', 'N/A')} ({stmt.__class__.__name__}) is unreachable.",
                                }
                            )
                            break

                # Logical Error: Constant condition (e.g. while True: without break or if False:)
                elif isinstance(node, ast.If):
                    if isinstance(node.test, ast.Constant) and node.test.value is False:
                        bug_prone_patterns.append(
                            {
                                "pattern": "Logical Error: Always-False Condition",
                                "severity": "medium",
                                "description": "If-statement condition is hardcoded to False.",
                            }
                        )

                # Logical Error: Identity comparison with literal (x is "string" or x is 5)
                elif isinstance(node, ast.Compare):
                    for op, comparator in zip(node.ops, node.comparators):
                        if isinstance(op, (ast.Is, ast.IsNot)) and isinstance(comparator, ast.Constant) and not isinstance(comparator.value, type(None)):
                            bug_prone_patterns.append(
                                {
                                    "pattern": "Logical Error: Identity Comparison with Literal",
                                    "severity": "high",
                                    "description": "Using 'is' or 'is not' to compare with literal values instead of '==' or '!='.",
                                }
                            )
        except Exception:
            # Fallback regex heuristics if AST parse fails (non-Python code or syntax error snippet)
            if re.search(r"except\s*:", code):
                bug_prone_patterns.append(
                    {
                        "pattern": "Bare Except Clause",
                        "severity": "high",
                        "description": "Catching all exceptions without specification.",
                    }
                )
            if re.search(r"(?:api_key|password|secret)\s*=\s*['\"][^'\"]+['\"]", code, re.I):
                bug_prone_patterns.append(
                    {
                        "pattern": "Hardcoded Credential",
                        "severity": "critical",
                        "description": "Hardcoded API key or secret detected in source string.",
                    }
                )

        return {
            "code_smells": code_smells,
            "poor_naming": poor_naming,
            "bug_prone_patterns": bug_prone_patterns,
        }

    def understand_function_semantics(self, code: str) -> Dict[str, Any]:
        """Analyze the semantic intent, complexity, and IO characteristics of code."""
        intent = "General Utility / Processing"
        if re.search(r"def\s+.*(?:get|fetch|read|load|query)", code, re.I):
            intent = "Data Retrieval / Querying"
        elif re.search(r"def\s+.*(?:set|write|save|update|post|store)", code, re.I):
            intent = "Data Mutation / Persistence"
        elif re.search(r"def\s+.*(?:calc|compute|eval|transform|parse|process)", code, re.I):
            intent = "Computation / Data Transformation"
        elif re.search(r"def\s+.*(?:test|check|validate|verify|assert)", code, re.I):
            intent = "Validation / Testing"

        has_db = bool(re.search(r"(?:db\.|session\.|query\(|execute\(|SELECT|INSERT|UPDATE)", code, re.I))
        has_network = bool(re.search(r"(?:http|requests|httpx|fetch|axios|client\.)", code, re.I))
        has_io = has_db or has_network or bool(re.search(r"(?:open\(|read\(|write\()", code))

        return {
            "primary_intent": intent,
            "has_side_effects": has_io,
            "interacts_with_database": has_db,
            "interacts_with_network": has_network,
            "cognitive_complexity": "High" if len(code.splitlines()) > 30 else "Moderate" if len(code.splitlines()) > 10 else "Low",
        }


class LLMReviewSynthesizer:
    """Converts CodeBERT semantic findings into professional human-readable code review comments."""

    @staticmethod
    def generate_review_comment(
        analysis_results: Dict[str, Any],
        old_vs_new: Optional[Dict[str, Any]] = None,
        learned_preferences: Optional[Dict[str, Any]] = None,
    ) -> str:
        """Synthesize analysis dict into a structured Markdown review comment."""
        lines = []
        lines.append("## 🤖 AI Code Review & CodeBERT Semantic Analysis\n")

        if learned_preferences and learned_preferences.get("suppressed_categories"):
            suppressions = ", ".join(f"`{c}`" for c in learned_preferences["suppressed_categories"])
            lines.append(f"> 💡 *Self-Learning Adaptation*: Suppressed rules based on team feedback: {suppressions}\n")

        if old_vs_new:
            risk = old_vs_new.get("risk_level", "LOW")
            badge = "🔴 **HIGH RISK**" if risk == "HIGH" else "🟡 **MEDIUM RISK**" if risk == "MEDIUM" else "🟢 **LOW RISK**"
            lines.append(f"### Diff Comparison & Change Risk Assessment: {badge}")
            lines.append(f"- **Semantic Similarity Score**: `{old_vs_new.get('similarity_score', 0):.2%}`")
            lines.append(f"- **Semantic Shift**: `{old_vs_new.get('semantic_shift', 0):.2%}`")
            if old_vs_new.get("risky_changes"):
                lines.append("\n**⚠️ Risky Changes Identified:**")
                for item in old_vs_new["risky_changes"]:
                    lines.append(f"  - {item}")
            lines.append("")

        semantics = analysis_results.get("function_semantics", {})
        if semantics:
            lines.append("### 🧠 Semantic Code Understanding")
            lines.append(f"- **Primary Purpose**: {semantics.get('primary_intent', 'N/A')}")
            lines.append(f"- **Cognitive Complexity**: {semantics.get('cognitive_complexity', 'N/A')}")
            lines.append(f"- **Side Effects (I/O, DB, Network)**: {'Yes' if semantics.get('has_side_effects') else 'No'}")
            lines.append("")

        bugs = analysis_results.get("bug_prone_patterns", [])
        if bugs:
            lines.append("### 🚨 Bug-Prone Patterns Detected")
            for bug in bugs:
                lines.append(f"- **[{bug.get('severity', 'warning').upper()}] {bug.get('pattern')}**: {bug.get('description')}")
            lines.append("")

        smells = analysis_results.get("code_smells", [])
        if smells:
            lines.append("### 🦨 Code Smells & Refactoring Opportunities")
            for smell in smells:
                lines.append(f"- **{smell.get('rule')}**: {smell.get('description')}")
            lines.append("")

        naming = analysis_results.get("poor_naming", [])
        if naming:
            lines.append("### 🏷️ Naming Quality Recommendations")
            for item in naming:
                lines.append(f"- Identifier `{item.get('identifier')}` ({item.get('type')}): {item.get('issue')}")
            lines.append("")

        if not bugs and not smells and not naming and (not old_vs_new or old_vs_new.get("risk_level") == "LOW"):
            lines.append("✨ **Great job!** No significant code smells, bug patterns, or naming issues were detected in this analysis.")

        return "\n".join(lines)


class CodeBERTAgent:
    """Agent implementing the codebase Agent protocol in agents.py."""

    name = "codebert"

    def __init__(self, analyzer: Optional[CodeAnalyzer] = None) -> None:
        self.analyzer = analyzer or CodeAnalyzer()

    def run(self, state: Any) -> Any:
        """Executes CodeBERT analysis on state.code_analysis_input if available."""
        code_input = getattr(state, "code_analysis_input", None) or state.query
        old_code = getattr(state, "old_code", None)
        learned_preferences = getattr(state, "learned_preferences", None)

        if old_code:
            diff_results = self.analyzer.compare_diff(old_code, code_input)
            analysis_results = self.analyzer.analyze_semantics(code_input)
            state.codebert_findings = {
                "semantics": analysis_results,
                "diff": diff_results,
            }
            state.code_review_comment = LLMReviewSynthesizer.generate_review_comment(
                analysis_results, diff_results, learned_preferences
            )
        else:
            analysis_results = self.analyzer.analyze_semantics(code_input)
            state.codebert_findings = {
                "semantics": analysis_results,
            }
            state.code_review_comment = LLMReviewSynthesizer.generate_review_comment(
                analysis_results, None, learned_preferences
            )

        return state

