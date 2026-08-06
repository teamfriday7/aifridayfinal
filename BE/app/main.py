from __future__ import annotations

import os

from fastapi import FastAPI, File, HTTPException, Response, UploadFile
from pydantic import BaseModel, Field

from .agents import CoordinatorAgent
from .rag import RAGPipeline

app = FastAPI(
    title="Multi-Agent RAG API",
    description=(
        "Upload enterprise documents, ask grounded questions, and run the "
        "multi-agent workflow. Use **/documents** to index a PDF before "
        "asking questions about it."
    ),
    version="1.1.0",
    openapi_tags=[
        {"name": "Service", "description": "Service discovery and health checks."},
        {"name": "Documents", "description": "Index PDF, DOC, DOCX, and TXT files for RAG."},
        {"name": "RAG", "description": "Ask grounded questions over indexed documents."},
        {"name": "Agents", "description": "Run the Coordinator-led multi-agent workflow."},
    ],
)
pipeline: RAGPipeline | None = None


def get_pipeline() -> RAGPipeline:
    global pipeline
    if pipeline is None:
        pipeline = RAGPipeline()
    return pipeline


class AskRequest(BaseModel):
    question: str = Field(min_length=1, description="Question to answer from indexed evidence.", examples=["What are the main findings?"])
    session_id: str = Field(default="default", description="Conversation-memory identifier.")
    document_ids: list[str] | None = Field(default=None, description="Optional document IDs to search. Omit to search all indexed documents.")


class AgentRequest(AskRequest):
    """Request envelope for the multi-agent orchestration endpoint."""


@app.get("/health", tags=["Service"], summary="Check service health")
def health() -> dict[str, str]:
    return {"status": "ok", "embedding_provider": os.getenv("EMBEDDING_PROVIDER", "sentence_transformers")}


@app.get("/", tags=["Service"], summary="Discover API endpoints")
def root() -> dict[str, object]:
    """Small browser-friendly entry point for the API service."""
    return {
        "name": "Multi-Agent RAG Service",
        "status": "ok",
        "docs": "/docs",
        "endpoints": {
            "health": "GET /health",
            "upload_document": "POST /documents",
            "chat": "POST /chat",
            "run_agents": "POST /agents/run",
        },
    }


@app.get("/favicon.ico", include_in_schema=False)
def favicon() -> Response:
    return Response(status_code=204)


@app.get("/documents", tags=["Documents"], summary="Get document upload instructions")
def documents_help() -> dict[str, str]:
    """Explain the upload endpoint when it is opened directly in a browser."""
    return {
        "message": "Upload documents with POST /documents using multipart form field 'file'.",
        "supported_types": "PDF, DOC, DOCX, TXT",
        "docs": "/docs",
    }


@app.post(
    "/documents",
    status_code=201,
    tags=["Documents"],
    summary="Upload and index a document",
    responses={201: {"description": "Document was chunked and indexed."}, 415: {"description": "Unsupported file type."}, 422: {"description": "Unreadable document."}},
)
async def upload_document(file: UploadFile = File(..., description="PDF, DOC, DOCX, or TXT document to index.")) -> dict[str, object]:
    if not file.filename or file.filename.rsplit(".", 1)[-1].lower() not in {"pdf", "doc", "docx", "txt"}:
        raise HTTPException(415, "Upload a PDF, DOC, DOCX, or TXT file.")
    content = await file.read()
    if not content:
        raise HTTPException(400, "The uploaded file is empty.")
    try:
        return get_pipeline().ingest(file.filename, content)
    except ValueError as error:
        raise HTTPException(422, str(error)) from error
    except Exception as error:
        raise HTTPException(500, f"Could not index document: {error}") from error


@app.post("/chat", tags=["RAG"], summary="Ask a grounded RAG question")
def chat(request: AskRequest) -> dict[str, object]:
    try:
        return get_pipeline().ask(request.question, request.session_id, request.document_ids)
    except Exception as error:
        raise HTTPException(500, f"Could not answer question: {error}") from error


@app.post("/agents/run", tags=["Agents"], summary="Run the multi-agent workflow")
def run_agents(request: AgentRequest) -> dict[str, object]:
    """Run intent → plan → knowledge/ML → reasoning → validation → report."""
    try:
        coordinator = CoordinatorAgent(get_pipeline())
        return coordinator.execute(request.question, request.session_id, request.document_ids)
    except Exception as error:
        raise HTTPException(500, f"Could not execute agent workflow: {error}") from error
