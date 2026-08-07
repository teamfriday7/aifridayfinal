# CodeGuardian VS Code analysis sidecar

This is an additive service for `vscode-extension`; it does not modify or import the existing `BE/app` FastAPI application.

```powershell
cd BE/extensionService
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8010
```

The extension calls `POST /api/extension/analyze`. The sidecar supplies server-side deterministic findings. To enable AI enrichment, set `CODEGUARDIAN_ENABLE_AI=true`, `OPENAI_API_KEY`, and optionally `OPENAI_BASE_URL`/`OPENAI_MODEL`. Set `ANALYSIS_SHARED_TOKEN` to require an `X-CodeGuardian-Token` header.

Keep the sidecar bound to `127.0.0.1` unless it is placed behind authenticated TLS infrastructure.
