# Generic RAG Pipeline

FastAPI backend implementing:

`Document loader -> Chunking -> Embeddings -> Vector DB -> Retriever -> Context limiter -> LLM -> Memory`

It accepts PDF, DOCX, TXT, and legacy DOC files. Legacy DOC ingestion uses LibreOffice (`soffice`) to convert the file on the server; DOCX needs no external converter. Chunks and embeddings are persisted in ChromaDB; conversation memory is maintained per `session_id` for the running process.

## Run

```powershell
cd BE
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload
```

The backend loads settings from `BE/.env` (falling back to `BE/.env.example` when `.env` is absent). Set `OPENAI_API_KEY`, `OPENAI_MODEL`, and `EMBEDDING_MODEL` there. The first upload downloads the configured embedding model. Without an API key, `/chat` still retrieves and returns the best grounded source passages.

Set `EMBEDDING_PROVIDER=openai` for the GenAI Lab OpenAI-compatible embedding deployment configured in `config.py`. The service then calls the provider's embeddings API directly and will not download from Hugging Face. The existing `BE/tiktoken_cache` is registered for tokenizer use; it is not an embedding model or an SSL certificate.

If Hugging Face downloads fail with `CERTIFICATE_VERIFY_FAILED`, place the required CA certificate bundle (a PEM file beginning with `-----BEGIN CERTIFICATE-----`) under `BE`, for example `BE/certs/company-ca.pem`, and set `SSL_CERT_FILE=certs/company-ca.pem` in `BE/.env`. The backend forwards that bundle to the HTTPS clients used by the embedding-model download.

## API

Upload a document:

```powershell
curl.exe -F "file=@C:\path\to\document.pdf" http://127.0.0.1:8000/documents
```

Ask using one or more uploaded `document_id` values (omit `document_ids` to search all):

```powershell
curl.exe -X POST http://127.0.0.1:8000/chat -H "Content-Type: application/json" -d '{"question":"What are the main findings?","session_id":"demo","document_ids":["DOCUMENT_ID"]}'
```

Swagger UI is available at `http://127.0.0.1:8000/docs`.

Swagger lists every API endpoint in four groups: **Service**, **Documents**, **RAG**, and **Agents**. To index a local PDF, open `POST /documents`, click **Try it out**, select the PDF under `file`, and click **Execute**. Copy the returned `document_id` into `/chat` or `/agents/run` to limit a question to that document.

## Multi-agent skeleton

`POST /agents/run` runs an inspectable workflow managed by `CoordinatorAgent`:

`Intent → Planning → Knowledge → (ML when applicable) → Reasoning → Validator → Report`

The agents live in `app/agents.py`. The knowledge and reasoning agents reuse the RAG pipeline; `MLAgent` accepts an injectable model implementing `predict(query, entities)`. The response includes intent, workflow, ML result, validation signals, sources, and handled agent failures.

```powershell
curl.exe -X POST http://127.0.0.1:8000/agents/run -H "Content-Type: application/json" -d '{"question":"Summarize the findings","session_id":"demo"}'
```
