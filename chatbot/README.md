# OKF Codebase Knowledge Agent

This is a file-path-based, source-grounded multi-agent documentation pipeline.
It uses the single chat model and embedding model configured in `.env`; no model name or API key is hard-coded.

## Agent flow

```text
Codebase path
  -> Orchestrator (main.py)
  -> Knowledge Extractor subagent (extractor_agent.py, one task per file)
  -> FileKnowledge JSON records
  -> Formatter subagent (formatter_agent.py)
  -> knowledge_base.md
```

The extractor is instructed to return only code-evidenced records with `path:L<number>` citations. The formatter is instructed to retain those citations and produce independently understandable retrieval chunks, semantic headers, Q&A anchors, and a cross-reference index.

## Generate once

From this directory, run:

```powershell

```

The output is `<repository>\knowledge_base.md`. To choose a different location:

```powershell
python main.py --path "Y:\path\to\your\repository" --output "Y:\path\to\your\repository\docs\knowledge_base.md"
```

## Run on every Git commit

Install the repository-local post-commit hook once:

```powershell
python main.py --path "Y:\path\to\your\repository" --install-hook
```

After every successful commit, Git starts python main.py --path "Y:\path\to\your\repository"a detached OKF run. It writes or refreshes `knowledge_base.md` at the repository root without delaying the commit. The hook is local to that clone; it is not version-controlled by Git.

## Configuration

Required `.env` settings:

```dotenv
OPENAI_API_KEY=...
OPENAI_BASE_URL=...
OPENAI_MODEL=...
EMBEDDING_MODEL=...
```

`OPENAI_TIMEOUT_SECONDS` is optional and defaults to `45`. `OKF_EXTRACTOR_WORKERS` controls concurrent extractor tasks and defaults to `2`.

The embedding setting is retained for the later retrieval/indexing stage. This pipeline produces the source-grounded Markdown artifact; it does not yet embed or publish it to a vector database.
