"""Extensible multi-agent workflow built around the existing RAG pipeline.

Each agent has one focused responsibility and exchanges typed, inspectable state.
Concrete enterprise connectors and ML models can be attached without changing the
coordinator's workflow.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Protocol

from .rag import RAGPipeline


@dataclass
class AgentState:
    query: str
    session_id: str
    document_ids: list[str] | None = None
    intent: str = "general_question"
    entities: list[str] = field(default_factory=list)
    business_action: str = "answer_question"
    plan: list[str] = field(default_factory=list)
    knowledge: list[dict[str, Any]] = field(default_factory=list)
    ml_result: dict[str, Any] | None = None
    reasoning: str = ""
    validation: dict[str, Any] = field(default_factory=dict)
    failures: list[str] = field(default_factory=list)
    # CodeBERT Semantic Agent Layer fields
    code_analysis_input: str | None = None
    old_code: str | None = None
    codebert_findings: dict[str, Any] | None = None
    code_review_comment: str | None = None


class Agent(Protocol):
    name: str

    def run(self, state: AgentState) -> AgentState: ...


class IntentAgent:
    """Extracts lightweight intent/entities; replace with an LLM/NLU model as needed."""

    name = "intent"

    def run(self, state: AgentState) -> AgentState:
        query = state.query.lower()
        if any(word in query for word in ("forecast", "predict", "projection")):
            state.intent, state.business_action = "forecast", "run_prediction"
        elif any(word in query for word in ("anomaly", "fraud", "unusual", "outlier")):
            state.intent, state.business_action = "anomaly_detection", "detect_anomalies"
        elif any(word in query for word in ("recommend", "suggest", "best option")):
            state.intent, state.business_action = "recommendation", "generate_recommendation"
        elif any(word in query for word in ("classify", "category", "sentiment")):
            state.intent, state.business_action = "classification", "run_classification"
        # A deliberately simple, dependency-free entity placeholder for the skeleton.
        state.entities = list(dict.fromkeys(token.strip(".,?!:;()[]") for token in state.query.split() if token[:1].isupper()))
        return state


class PlanningAgent:
    """Selects the ordered workflow. Future tool routing belongs here."""

    name = "planning"

    def run(self, state: AgentState) -> AgentState:
        state.plan = ["intent", "planning", "knowledge"]
        if state.intent in {"forecast", "anomaly_detection", "recommendation", "classification"}:
            state.plan.append("ml")
        state.plan.extend(["reasoning", "validator", "report"])
        return state


class KnowledgeAgent:
    """Retrieves RAG evidence; add database/API connectors in this agent."""

    name = "knowledge"

    def __init__(self, rag: RAGPipeline) -> None:
        self.rag = rag

    def run(self, state: AgentState) -> AgentState:
        state.knowledge = self.rag.retrieve(state.query, state.document_ids)
        return state


class MLModel(Protocol):
    def predict(self, query: str, entities: list[str]) -> dict[str, Any]: ...


class MLAgent:
    """Adapter for traditional ML. Inject an sklearn/custom model implementing MLModel."""

    name = "ml"

    def __init__(self, model: MLModel | None = None) -> None:
        self.model = model

    def run(self, state: AgentState) -> AgentState:
        if self.model:
            state.ml_result = self.model.predict(state.query, state.entities)
        else:
            state.ml_result = {"status": "not_configured", "message": "No ML model is attached to this workflow."}
        return state


class ReasoningAgent:
    """Synthesizes grounded evidence, ML output, and session memory through RAG."""

    name = "reasoning"

    def __init__(self, rag: RAGPipeline) -> None:
        self.rag = rag

    def run(self, state: AgentState) -> AgentState:
        # Reuse the established grounded answer/memory behavior, while providing
        # any real ML result as structured context for the LLM synthesis step.
        reasoning_query = state.query
        if state.ml_result and state.ml_result.get("status") != "not_configured":
            reasoning_query = (
                f"{state.query}\n\nStructured ML result (use only when relevant): "
                f"{state.ml_result}"
            )
        result = self.rag.ask(reasoning_query, state.session_id, state.document_ids)
        state.reasoning = str(result["answer"])
        if not state.knowledge:
            state.knowledge = list(result["sources"])
        return state


class ValidatorAgent:
    """Checks grounding and safety signals before publication; policies are pluggable."""

    name = "validator"

    def run(self, state: AgentState) -> AgentState:
        has_sources = bool(state.knowledge)
        blocked_terms = ("ignore previous instructions", "system prompt", "api key")
        security_flag = any(term in state.query.lower() for term in blocked_terms)
        state.validation = {
            "grounded": has_sources,
            "confidence": "high" if has_sources else "low",
            "security_passed": not security_flag,
            "policy_passed": not security_flag,
            "quality_passed": bool(state.reasoning),
        }
        if security_flag:
            state.reasoning = "I cannot help with requests to expose protected instructions or credentials."
        elif not has_sources:
            state.reasoning = "I could not find enough indexed evidence to provide a grounded answer."
        return state


from .codebert_agent import CodeBERTAgent


class ReportAgent:
    """Produces a UI/API-ready response. Add PDF/chart/export renderers here."""

    name = "report"

    def run(self, state: AgentState) -> AgentState:
        return state

    @staticmethod
    def format(state: AgentState) -> dict[str, Any]:
        return {
            "answer": state.reasoning,
            "intent": {"name": state.intent, "entities": state.entities, "business_action": state.business_action},
            "workflow": state.plan,
            "ml_result": state.ml_result,
            "codebert_findings": state.codebert_findings,
            "code_review_comment": state.code_review_comment,
            "validation": state.validation,
            "sources": state.knowledge,
            "failures": state.failures,
        }


class CoordinatorAgent:
    """Owns execution, isolates agent failures, and returns one combined response."""

    def __init__(self, rag: RAGPipeline, ml_model: MLModel | None = None) -> None:
        self.agents: dict[str, Agent] = {
            "intent": IntentAgent(), "planning": PlanningAgent(), "knowledge": KnowledgeAgent(rag),
            "ml": MLAgent(ml_model), "codebert": CodeBERTAgent(), "reasoning": ReasoningAgent(rag),
            "validator": ValidatorAgent(), "report": ReportAgent(),
        }

    def execute(self, query: str, session_id: str, document_ids: list[str] | None = None, code_analysis_input: str | None = None, old_code: str | None = None) -> dict[str, Any]:
        state = AgentState(query=query, session_id=session_id, document_ids=document_ids, code_analysis_input=code_analysis_input, old_code=old_code)
        # Planning must run immediately after intent to determine the remaining route.
        for name in ("intent", "planning"):
            state = self._run(name, state)
        for name in state.plan[2:]:
            state = self._run(name, state)
        # Execute CodeBERT agent step
        state = self._run("codebert", state)
        return ReportAgent.format(state)

    def _run(self, name: str, state: AgentState) -> AgentState:
        try:
            return self.agents[name].run(state)
        except Exception as error:  # coordinator continues with degraded output
            state.failures.append(f"{name}: {type(error).__name__}: {error}")
            return state
