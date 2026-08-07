# Codebase Knowledge Base

## Scope and grounding

Source root: `C:\Users\GenAITVMSEZUSR\Documents\aifridayfinal`

Documented files: **33**

## Repository map

- `BE/README.md` (text)
- `BE/app/__init__.py` (text)
- `BE/app/agents.py` (python)
- `BE/app/auth.py` (python)
- `BE/app/database.py` (python)
- `BE/app/git_watcher.py` (python)
- `BE/app/main.py` (python)
- `BE/app/models.py` (python)
- `BE/app/rag.py` (python)
- `BE/certs/localized_tiktoken_setup.md` (text)
- `BE/config.py` (python)
- `BE/gateway/__init__.py` (text)
- `BE/gateway/auth.py` (python)
- `BE/gateway/guardrails.py` (python)
- `BE/gateway/rate_limiter.py` (python)
- `BE/sonarqube.py` (python)
- `README.md` (text)
- `chatbot/README.md` (text)
- `chatbot/config.py` (python)
- `chatbot/extractor_agent.py` (python)
- `chatbot/formatter_agent.py` (python)
- `chatbot/knowledge_types.py` (python)
- `chatbot/main.py` (python)
- `enterprise-app/AGENTS.md` (text)
- `enterprise-app/CLAUDE.md` (md)
- `enterprise-app/README.md` (text)
- `enterprise-app/app/globals.css` (css)
- `enterprise-app/app/layout.tsx` (typescript)
- `enterprise-app/app/page.tsx` (typescript)
- `enterprise-app/next.config.ts` (typescript)
- `enterprise-app/package.json` (json)
- `enterprise-app/tsconfig.json` (json)
- `implementation_plan.md` (markdown)

## Cross-reference index

- `CoordinatorAgent` → `BE/README.md` [BE/README.md:L47-L53]
- `MLAgent` → `BE/README.md` [BE/README.md:L54-L57]
- `AgentState` → `BE/app/agents.py` [BE/app/agents.py:L16]
- `Agent` → `BE/app/agents.py` [BE/app/agents.py:L29]
- `IntentAgent` → `BE/app/agents.py` [BE/app/agents.py:L32]
- `PlanningAgent` → `BE/app/agents.py` [BE/app/agents.py:L49]
- `KnowledgeAgent` → `BE/app/agents.py` [BE/app/agents.py:L60]
- `MLModel` → `BE/app/agents.py` [BE/app/agents.py:L72]
- `MLAgent` → `BE/app/agents.py` [BE/app/agents.py:L75]
- `ReasoningAgent` → `BE/app/agents.py` [BE/app/agents.py:L88]
- `ValidatorAgent` → `BE/app/agents.py` [BE/app/agents.py:L105]
- `ReportAgent` → `BE/app/agents.py` [BE/app/agents.py:L122]
- `CoordinatorAgent` → `BE/app/agents.py` [BE/app/agents.py:L137]
- `hash_password` → `BE/app/auth.py` [BE/app/auth.py:L12-L14]
- `verify_password` → `BE/app/auth.py` [BE/app/auth.py:L17-L19]
- `create_access_token` → `BE/app/auth.py` [BE/app/auth.py:L22-L29]
- `decode_access_token` → `BE/app/auth.py` [BE/app/auth.py:L32-L40]
- `get_current_user` → `BE/app/auth.py` [BE/app/auth.py:L43-L60]
- `require_role` → `BE/app/auth.py` [BE/app/auth.py:L63-L74]
- `DATA_DIR` → `BE/app/database.py` [BE/app/database.py:L7-L11]
- `DATABASE_URL` → `BE/app/database.py` [BE/app/database.py:L13]
- `engine` → `BE/app/database.py` [BE/app/database.py:L15-L21]
- `SessionLocal` → `BE/app/database.py` [BE/app/database.py:L22]
- `Base` → `BE/app/database.py` [BE/app/database.py:L25-L27]
- `get_db` → `BE/app/database.py` [BE/app/database.py:L30-L37]
- `init_db` → `BE/app/database.py` [BE/app/database.py:L40-L45]
- `GitWatcher` → `BE/app/git_watcher.py` [BE/app/git_watcher.py:L12-L241]
- `GitWatcher.__init__` → `BE/app/git_watcher.py` [BE/app/git_watcher.py:L16-L27]
- `GitWatcher._git` → `BE/app/git_watcher.py` [BE/app/git_watcher.py:L30-L39]
- `GitWatcher._is_bare` → `BE/app/git_watcher.py` [BE/app/git_watcher.py:L41-L45]
- `GitWatcher.get_latest_commit_hash` → `BE/app/git_watcher.py` [BE/app/git_watcher.py:L47-L57]
- `GitWatcher.get_commit_info` → `BE/app/git_watcher.py` [BE/app/git_watcher.py:L59-L71]
- `GitWatcher.get_commit_diff` → `BE/app/git_watcher.py` [BE/app/git_watcher.py:L73-L82]
- `GitWatcher.get_commit_stats` → `BE/app/git_watcher.py` [BE/app/git_watcher.py:L84-L100]
- `GitWatcher.get_changed_files` → `BE/app/git_watcher.py` [BE/app/git_watcher.py:L102-L113]
- `GitWatcher.get_new_commits` → `BE/app/git_watcher.py` [BE/app/git_watcher.py:L115-L155]
- `GitWatcher.save_commit` → `BE/app/git_watcher.py` [BE/app/git_watcher.py:L157-L195]
- `GitWatcher._poll_loop` → `BE/app/git_watcher.py` [BE/app/git_watcher.py:L197-L237]
- `GitWatcher.start` → `BE/app/git_watcher.py` [BE/app/git_watcher.py:L239-L243]
- `GitWatcher.stop` → `BE/app/git_watcher.py` [BE/app/git_watcher.py:L245-L252]
- `GitWatcherManager` → `BE/app/git_watcher.py` [BE/app/git_watcher.py:L256-L317]
- `GitWatcherManager.__init__` → `BE/app/git_watcher.py` [BE/app/git_watcher.py:L258-L263]
- `GitWatcherManager.add_callback` → `BE/app/git_watcher.py` [BE/app/git_watcher.py:L265-L268]
- `GitWatcherManager._relay_commit` → `BE/app/git_watcher.py` [BE/app/git_watcher.py:L270-L277]
- `GitWatcherManager.start_watching` → `BE/app/git_watcher.py` [BE/app/git_watcher.py:L279-L292]
- `GitWatcherManager.stop_watching` → `BE/app/git_watcher.py` [BE/app/git_watcher.py:L294-L300]
- `GitWatcherManager.stop_all` → `BE/app/git_watcher.py` [BE/app/git_watcher.py:L302-L307]
- `GitWatcherManager.start_all_active_projects` → `BE/app/git_watcher.py` [BE/app/git_watcher.py:L309-L316]
- `ConnectionManager` → `BE/app/main.py` [BE/app/main.py:L22]
- `__init__` → `BE/app/main.py` [BE/app/main.py:L25]
- `connect` → `BE/app/main.py` [BE/app/main.py:L28]
- `disconnect` → `BE/app/main.py` [BE/app/main.py:L34]
- `broadcast` → `BE/app/main.py` [BE/app/main.py:L40]
- `_seed_initial_data` → `BE/app/main.py` [BE/app/main.py:L50]
- `lifespan` → `BE/app/main.py` [BE/app/main.py:L92]
- `health` → `BE/app/main.py` [BE/app/main.py:L129]
- `root` → `BE/app/main.py` [BE/app/main.py:L137]
- `login` → `BE/app/main.py` [BE/app/main.py:L147]
- `register` → `BE/app/main.py` [BE/app/main.py:L167]
- `get_me` → `BE/app/main.py` [BE/app/main.py:L185]
- `list_projects` → `BE/app/main.py` [BE/app/main.py:L191]
- `create_project` → `BE/app/main.py` [BE/app/main.py:L210]
- `activate_project` → `BE/app/main.py` [BE/app/main.py:L227]
- `deactivate_project` → `BE/app/main.py` [BE/app/main.py:L243]
- `list_commits` → `BE/app/main.py` [BE/app/main.py:L260]
- `get_commit_detail` → `BE/app/main.py` [BE/app/main.py:L286]
- `list_reviews` → `BE/app/main.py` [BE/app/main.py:L327]
- `accept_review` → `BE/app/main.py` [BE/app/main.py:L351]
- `reject_review` → `BE/app/main.py` [BE/app/main.py:L363]
- `dashboard_stats` → `BE/app/main.py` [BE/app/main.py:L375]
- `list_users` → `BE/app/main.py` [BE/app/main.py:L391]
- `websocket_commits` → `BE/app/main.py` [BE/app/main.py:L403]
- `LoginRequest` → `BE/app/main.py` [BE/app/main.py:L120]
- `RegisterRequest` → `BE/app/main.py` [BE/app/main.py:L126]
- `ProjectCreate` → `BE/app/main.py` [BE/app/main.py:L133]
- `UserRole` → `BE/app/models.py` [BE/app/models.py:L8-L12]
- `AnalysisStatus` → `BE/app/models.py` [BE/app/models.py:L15-L22]
- `ReviewStatus` → `BE/app/models.py` [BE/app/models.py:L25-L30]
- `Severity` → `BE/app/models.py` [BE/app/models.py:L33-L41]
- `User` → `BE/app/models.py` [BE/app/models.py:L46-L60]
- `Project` → `BE/app/models.py` [BE/app/models.py:L63-L76]
- `Commit` → `BE/app/models.py` [BE/app/models.py:L79-L98]
- `CodeReview` → `BE/app/models.py` [BE/app/models.py:L101-L124]
- `DeveloperScore` → `BE/app/models.py` [BE/app/models.py:L127-L146]
- `configure_ca_bundle` → `BE/app/rag.py` [BE/app/rag.py:L22-L38]
- `RAGPipeline` → `BE/app/rag.py` [BE/app/rag.py:L41-L168]
- `RAGPipeline.__init__` → `BE/app/rag.py` [BE/app/rag.py:L43-L78]
- `RAGPipeline.embed` → `BE/app/rag.py` [BE/app/rag.py:L80-L92]
- `RAGPipeline._clean` → `BE/app/rag.py` [BE/app/rag.py:L94-L95]
- `RAGPipeline.load` → `BE/app/rag.py` [BE/app/rag.py:L97-L132]
- `RAGPipeline.chunk` → `BE/app/rag.py` [BE/app/rag.py:L134-L146]
- `RAGPipeline.ingest` → `BE/app/rag.py` [BE/app/rag.py:L148-L178]
- `RAGPipeline.retrieve` → `BE/app/rag.py` [BE/app/rag.py:L180-L191]
- `RAGPipeline.limit_context` → `BE/app/rag.py` [BE/app/rag.py:L193-L203]
- `RAGPipeline.ask` → `BE/app/rag.py` [BE/app/rag.py:L205-L229]
- `get_http_client` → `BE/config.py` [BE/config.py:L29-L34]
- `get_llm` → `BE/config.py` [BE/config.py:L36-L45]
- `get_embeddings` → `BE/config.py` [BE/config.py:L47-L56]
- `get_vectordb` → `BE/config.py` [BE/config.py:L58-L65]
- `get_vision_llm_response` → `BE/config.py` [BE/config.py:L74-L82]
- `generate_token` → `BE/gateway/auth.py` [BE/gateway/auth.py:L5-L15]
- `decode_token` → `BE/gateway/auth.py` [BE/gateway/auth.py:L17-L24]
- `require_auth` → `BE/gateway/auth.py` [BE/gateway/auth.py:L26-L63]
- `HEALTHCARE_KEYWORDS` → `BE/gateway/guardrails.py` [BE/gateway/guardrails.py:L4-L32]
- `COMPILED_HEALTHCARE_REGEX` → `BE/gateway/guardrails.py` [BE/gateway/guardrails.py:L34]
- `detect_healthcare_intent` → `BE/gateway/guardrails.py` [BE/gateway/guardrails.py:L36-L46]
- `enforce_healthcare_guardrail` → `BE/gateway/guardrails.py` [BE/gateway/guardrails.py:L48-L79]
- `init_rate_limiter` → `BE/gateway/rate_limiter.py` [BE/gateway/rate_limiter.py:L4-L23]
- `ratelimit_handler` → `BE/gateway/rate_limiter.py` [BE/gateway/rate_limiter.py:L14-L22]
- `fetch_all_issues` → `BE/sonarqube.py` [BE/sonarqube.py:L18-L43]
- `fetch_rule` → `BE/sonarqube.py` [BE/sonarqube.py:L46-L56]
- `read_source` → `BE/sonarqube.py` [BE/sonarqube.py:L59-L84]
- `main` → `BE/sonarqube.py` [BE/sonarqube.py:L87-L120]
- `get_http_client` → `chatbot/config.py` [chatbot/config.py:L26-L37]
- `_require_model_settings` → `chatbot/config.py` [chatbot/config.py:L39-L47]
- `get_llm` → `chatbot/config.py` [chatbot/config.py:L50-L73]
- `get_embeddings` → `chatbot/config.py` [chatbot/config.py:L75-L85]
- `get_vectordb` → `chatbot/config.py` [chatbot/config.py:L87-L94]
- `_json_object` → `chatbot/extractor_agent.py` [chatbot/extractor_agent.py:L11-L23]
- `_normalise_items` → `chatbot/extractor_agent.py` [chatbot/extractor_agent.py:L26-L27]
- `_invoke_with_retry` → `chatbot/extractor_agent.py` [chatbot/extractor_agent.py:L30-L46]
- `extract_file` → `chatbot/extractor_agent.py` [chatbot/extractor_agent.py:L49-L92]
- `_clean_markdown` → `chatbot/formatter_agent.py` [chatbot/formatter_agent.py:L43]
- `_estimate_size` → `chatbot/formatter_agent.py` [chatbot/formatter_agent.py:L56]
- `_batch_records` → `chatbot/formatter_agent.py` [chatbot/formatter_agent.py:L66]
- `_invoke_stream` → `chatbot/formatter_agent.py` [chatbot/formatter_agent.py:L91]
- `_format_batch` → `chatbot/formatter_agent.py` [chatbot/formatter_agent.py:L109]
- `_recursive_format` → `chatbot/formatter_agent.py` [chatbot/formatter_agent.py:L143]
- `_fallback_batch` → `chatbot/formatter_agent.py` [chatbot/formatter_agent.py:L163]
- `_repository_map` → `chatbot/formatter_agent.py` [chatbot/formatter_agent.py:L214]
- `_cross_reference` → `chatbot/formatter_agent.py` [chatbot/formatter_agent.py:L223]
- `_format_batches` → `chatbot/formatter_agent.py` [chatbot/formatter_agent.py:L241]
- `format_knowledge_base` → `chatbot/formatter_agent.py` [chatbot/formatter_agent.py:L280]
- `FileKnowledge` → `chatbot/knowledge_types.py` [chatbot/knowledge_types.py:L7-L26]
- `SOURCE_SUFFIXES` → `chatbot/main.py` [chatbot/main.py:L10-L12]
- `SKIPPED_DIRECTORIES` → `chatbot/main.py` [chatbot/main.py:L13-L14]
- `SKIPPED_FILES` → `chatbot/main.py` [chatbot/main.py:L15-L19]
- `discover_source_files` → `chatbot/main.py` [chatbot/main.py:L22-L39]
- `run_pipeline` → `chatbot/main.py` [chatbot/main.py:L42-L83]
- `install_post_commit_hook` → `chatbot/main.py` [chatbot/main.py:L86-L101]
- `main` → `chatbot/main.py` [chatbot/main.py:L104-L137]
- `:root` → `enterprise-app/app/globals.css` [enterprise-app/app/globals.css:L3-L6]
- `@theme inline` → `enterprise-app/app/globals.css` [enterprise-app/app/globals.css:L8-L13]
- `@media (prefers-color-scheme: dark)` → `enterprise-app/app/globals.css` [enterprise-app/app/globals.css:L15-L20]
- `body` → `enterprise-app/app/globals.css` [enterprise-app/app/globals.css:L22-L27]
- `geistSans` → `enterprise-app/app/layout.tsx` [enterprise-app/app/layout.tsx:L5-L9]
- `geistMono` → `enterprise-app/app/layout.tsx` [enterprise-app/app/layout.tsx:L11-L15]
- `metadata` → `enterprise-app/app/layout.tsx` [enterprise-app/app/layout.tsx:L17-L21]
- `RootLayout` → `enterprise-app/app/layout.tsx` [enterprise-app/app/layout.tsx:L23-L34]
- `Home` → `enterprise-app/app/page.tsx` [enterprise-app/app/page.tsx:L3-L59]
- `nextConfig` → `enterprise-app/next.config.ts` [enterprise-app/next.config.ts:L3-L8]
- `compilerOptions` → `enterprise-app/tsconfig.json` [enterprise-app/tsconfig.json:L2-L29]
- `target` → `enterprise-app/tsconfig.json` [enterprise-app/tsconfig.json:L3]
- `lib` → `enterprise-app/tsconfig.json` [enterprise-app/tsconfig.json:L4]
- `allowJs` → `enterprise-app/tsconfig.json` [enterprise-app/tsconfig.json:L5]
- `skipLibCheck` → `enterprise-app/tsconfig.json` [enterprise-app/tsconfig.json:L6]
- `strict` → `enterprise-app/tsconfig.json` [enterprise-app/tsconfig.json:L7]
- `noEmit` → `enterprise-app/tsconfig.json` [enterprise-app/tsconfig.json:L8]
- `esModuleInterop` → `enterprise-app/tsconfig.json` [enterprise-app/tsconfig.json:L9]
- `module` → `enterprise-app/tsconfig.json` [enterprise-app/tsconfig.json:L10]
- `moduleResolution` → `enterprise-app/tsconfig.json` [enterprise-app/tsconfig.json:L11]
- `resolveJsonModule` → `enterprise-app/tsconfig.json` [enterprise-app/tsconfig.json:L12]
- `isolatedModules` → `enterprise-app/tsconfig.json` [enterprise-app/tsconfig.json:L13]
- `jsx` → `enterprise-app/tsconfig.json` [enterprise-app/tsconfig.json:L14]
- `incremental` → `enterprise-app/tsconfig.json` [enterprise-app/tsconfig.json:L15]
- `plugins` → `enterprise-app/tsconfig.json` [enterprise-app/tsconfig.json:L16-L19]
- `paths` → `enterprise-app/tsconfig.json` [enterprise-app/tsconfig.json:L20-L23]
- `include` → `enterprise-app/tsconfig.json` [enterprise-app/tsconfig.json:L24-L30]
- `exclude` → `enterprise-app/tsconfig.json` [enterprise-app/tsconfig.json:L31]
- `GitWatcher` → `implementation_plan.md` [implementation_plan.md:L104-L117]
- `User` → `implementation_plan.md` [implementation_plan.md:L120-L129]
- `Project` → `implementation_plan.md` [implementation_plan.md:L120-L129]
- `Commit` → `implementation_plan.md` [implementation_plan.md:L120-L129]
- `CodeReview` → `implementation_plan.md` [implementation_plan.md:L120-L129]
- `DeveloperScore` → `implementation_plan.md` [implementation_plan.md:L120-L129]
- `ReviewAction` → `implementation_plan.md` [implementation_plan.md:L120-L129]
- `Auth API Endpoints` → `implementation_plan.md` [implementation_plan.md:L142-L153]
- `Code Analysis Agents` → `implementation_plan.md` [implementation_plan.md:L166-L212]
- `DeveloperProfilerAgent` → `implementation_plan.md` [implementation_plan.md:L221-L230]
- `QualityScorerAgent` → `implementation_plan.md` [implementation_plan.md:L231-L243]
- `TaskRecommenderAgent` → `implementation_plan.md` [implementation_plan.md:L244-L252]
- `LearningAdvisorAgent` → `implementation_plan.md` [implementation_plan.md:L253-L261]
- `AI Gateway Code Guardrails` → `implementation_plan.md` [implementation_plan.md:L304-L311]
- `Database Setup` → `implementation_plan.md` [implementation_plan.md:L316-L321]
- `Seed Data Script` → `implementation_plan.md` [implementation_plan.md:L322-L328]
- `Backend Dependencies` → `implementation_plan.md` [implementation_plan.md:L338-L360]
- `Frontend Dependencies` → `implementation_plan.md` [implementation_plan.md:L361-L370]
- `API Endpoints (main.py)` → `implementation_plan.md` [implementation_plan.md:L133-L141]
- `Frontend Pages and Components` → `implementation_plan.md` [implementation_plan.md:L283-L320]
- `Git Watcher Polling Design` → `implementation_plan.md` [implementation_plan.md:L104-L117]
- `Code Analysis Agent Orchestration Flow` → `implementation_plan.md` [implementation_plan.md:L184-L204]
- `Role-Based Access Control` → `implementation_plan.md` [implementation_plan.md:L142-L153]
- `Multi-Phase Implementation Plan` → `implementation_plan.md` [implementation_plan.md:L375-L399]

## Retrieval chunks

### File: BE/README.md

Language: **text**

#### Symbols
- **CoordinatorAgent** (class)
- **MLAgent** (class)

#### Dependencies
- **FastAPI** : Backend framework used for implementing the service
- **LibreOffice (soffice)** : Used for converting legacy DOC files on the server
- **ChromaDB** : Persisting chunks and embeddings
- **OpenAI API** : Used as an embedding provider if OPENAI_API_KEY is set and EMBEDDING_PROVIDER=openai

#### Data and control flow
- The backend implements a pipeline: Document loader -> Chunking -> Embeddings -> Vector DB -> Retriever -> Context limiter -> LLM -> Memory
- Uploading document via POST /documents, then querying with POST /chat specifying document_ids and session_id
- POST /agents/run runs the workflow managed by CoordinatorAgent with steps: Intent, Planning, Knowledge, ML, Reasoning, Validator, Report

#### Configuration
- **.env environment variables** : Settings such as OPENAI_API_KEY, OPENAI_MODEL, EMBEDDING_MODEL, EMBEDDING_PROVIDER, and SSL_CERT_FILE are configured in BE/.env or BE/.env.example

#### Patterns
- Conversation memory is maintained per session_id for the running backend process
- Set EMBEDDING_PROVIDER=openai to use OpenAI-compatible deployment, which bypasses model download and calls API directly

#### Evidence
- `BE/README.md:L1-L4`
- `BE/README.md:L5-L7`
- `BE/README.md:L12-L24`
- `BE/README.md:L27-L37`
- `BE/README.md:L45-L54`

#### Notes
- No explicit description of API routes beyond basic examples.
- No details on internal implementation of CoordinatorAgent or MLAgent provided.
- No indication of all packages in requirements.txt or full dependency tree.
- Token cache 'BE/tiktoken_cache' is noted not to be embedding or SSL cert.

### File: BE/app/__init__.py

Language: **text**

#### Evidence
- `BE/app/__init__.py:L1`

#### Notes
- The file contains only a module-level docstring and no code elements to extract.

### File: BE/app/agents.py

Language: **python**

#### Symbols
- **AgentState** (class)
- **Agent** (protocol)
- **IntentAgent** (class)
- **PlanningAgent** (class)
- **KnowledgeAgent** (class)
- **MLModel** (protocol)
- **MLAgent** (class)
- **ReasoningAgent** (class)
- **ValidatorAgent** (class)
- **ReportAgent** (class)
- **CoordinatorAgent** (class)

#### Dependencies
- **dataclasses** : Provides the @dataclass decorator and field function for AgentState.
- **typing** : Provides Any, Protocol, and type hints used throughout the file.
- **RAGPipeline** : Used by KnowledgeAgent and ReasoningAgent to retrieve and ask for knowledge/evidence.

#### Data and control flow
- Runs intent and planning agents first to establish plan, then executes remaining agents in plan order, returning formatted report.

#### Configuration
- **CoordinatorAgent Initialization** : CoordinatorAgent is initialized with a RAGPipeline and optional MLModel; it sets up a dictionary of named agents accordingly.

#### Patterns
- Agents run sequentially, each accepting and returning the mutable AgentState object to update workflow state.
- MLAgent adapts a user supplied ML model, and KnowledgeAgent and ReasoningAgent use injected RAGPipeline instance for retrieval and generation.

#### Evidence
- `BE/app/agents.py:L12-L19`
- `BE/app/agents.py:L32-L46`
- `BE/app/agents.py:L49-L58`
- `BE/app/agents.py:L60-L69`
- `BE/app/agents.py:L72-L74`
- `BE/app/agents.py:L75-L86`
- `BE/app/agents.py:L88-L103`
- `BE/app/agents.py:L105-L120`
- `BE/app/agents.py:L122-L134`
- `BE/app/agents.py:L137-L155`

#### Notes
- The intent detection in IntentAgent is based on simple keyword lookups and capitalization for entities and does not use true NLP or ML methods.
- AgentState is mutable and passed through each agent's run method to accumulate and update the state.
- The CoordinatorAgent centrally handles errors from each agent and appends failure info into the AgentState.failures list, allowing the pipeline to continue despite agent errors.
- The MLAgent can run without a configured ML model resulting in a specific 'not_configured' status in ml_result.
- The RAGPipeline abstraction provides retrieval and ask methods used by KnowledgeAgent and ReasoningAgent respectively, but its implementation is external and not described here.

### File: BE/app/auth.py

Language: **python**

#### Symbols
- **hash_password** (function)
- **verify_password** (function)
- **create_access_token** (function)
- **decode_access_token** (function)
- **get_current_user** (async function)
- **require_role** (function)

#### Dependencies
- **jwt** : Used to encode and decode JWT tokens
- **fastapi** : Depends and HTTPException used to implement request dependencies and error handling
- **fastapi.security.HTTPBearer** : Used to parse and provide HTTP Bearer authentication credentials
- **passlib.context.CryptContext** : Used to hash and verify passwords
- **sqlalchemy.orm.Session** : Used to interact with the database session to fetch user information
- **get_db** : Dependency providing a database session
- **User** : Database model representing users

#### Data and control flow
- User provides a Bearer token which is decoded to retrieve the username, then the database is queried to return the active user.
- Checks if the authenticated user's role matches any required roles and denies access if not.

#### Configuration
- **SECRET_KEY** : Secret key used to sign JWT tokens, supplied via environment variable with a default fallback.
- **ALGORITHM** : JWT signing algorithm set to HS256.
- **ACCESS_TOKEN_EXPIRE_MINUTES** : Expiration time for access tokens in minutes (default 480 minutes = 8 hours).

#### Patterns
- Uses FastAPI's Depends to inject dependencies such as database session and authenticated user into endpoint handlers.
- JWT tokens are created and validated to authenticate API requests.

#### Evidence
- `BE/app/auth.py:L1-L74`

#### Notes
- The role checking dependency returns the user if authorized, but does not perform further downstream actions by itself.
- The get_current_user function raises HTTPException for various failure modes related to authentication.

### File: BE/app/database.py

Language: **python**

#### Symbols
- **DATA_DIR** (variable)
- **DATABASE_URL** (variable)
- **engine** (variable)
- **SessionLocal** (variable)
- **Base** (class)
- **get_db** (function)
- **init_db** (function)

#### Dependencies
- **os** : Used to access environment variables.
- **pathlib.Path** : Used to construct and create the data directory path.
- **sqlalchemy.create_engine** : Used to create the database engine.
- **sqlalchemy.orm.DeclarativeBase** : Base class for declaring ORM models.
- **sqlalchemy.orm.sessionmaker** : Used to create SQLAlchemy session factory bound to the engine.

#### Data and control flow
- The get_db function creates a new SessionLocal instance, yields it for use, and ensures the session is closed after use, suitable as a FastAPI dependency.
- The init_db function imports the models to register them with Base and creates all tables in the database bound to the engine.

#### Configuration
- **DATABASE_URL environment variable** : Configuration of the database connection URL that defaults to a SQLite database file inside the 'data' folder if not set.

#### Patterns
- Create a singleton engine and a session factory (SessionLocal) for use throughout the application.
- The get_db function uses a generator to provide and clean up the database session automatically at the end of a request.

#### Evidence
- `BE/app/database.py:L7-L11`
- `BE/app/database.py:L13`
- `BE/app/database.py:L15-L21`
- `BE/app/database.py:L22`
- `BE/app/database.py:L25-L27`
- `BE/app/database.py:L30-L37`
- `BE/app/database.py:L40-L45`

#### Notes
- The models module is imported inside init_db but is not visible or detailed here, so details about the model definitions are not extracted.
- The SQLite-specific connect_args disables same thread checks targeting the default behavior of SQLite connections.

### File: BE/app/git_watcher.py

Language: **python**

#### Symbols
- **GitWatcher** (class)
- **GitWatcher.__init__** (method)
- **GitWatcher._git** (method)
- **GitWatcher._is_bare** (method)
- **GitWatcher.get_latest_commit_hash** (method)
- **GitWatcher.get_commit_info** (method)
- **GitWatcher.get_commit_diff** (method)
- **GitWatcher.get_commit_stats** (method)
- **GitWatcher.get_changed_files** (method)
- **GitWatcher.get_new_commits** (method)
- **GitWatcher.save_commit** (method)
- **GitWatcher._poll_loop** (method)
- **GitWatcher.start** (method)
- **GitWatcher.stop** (method)
- **GitWatcherManager** (class)
- **GitWatcherManager.__init__** (method)
- **GitWatcherManager.add_callback** (method)
- **GitWatcherManager._relay_commit** (method)
- **GitWatcherManager.start_watching** (method)
- **GitWatcherManager.stop_watching** (method)
- **GitWatcherManager.stop_all** (method)
- **GitWatcherManager.start_all_active_projects** (method)

#### Dependencies
- **asyncio** : Used to run asynchronous polling loops and tasks in GitWatcher and GitWatcherManager.
- **logging** : Used for logging informational, warning, and error messages throughout the watcher classes.
- **subprocess** : Used to run git commands in subprocesses to query git repository state.
- **datetime** : Used to convert timestamps returned by git into datetime objects.
- **pathlib.Path** : Used to represent and check paths of git repositories.
- **sqlalchemy.orm.Session** : Used to manage database sessions for saving commits and querying projects.
- **SessionLocal (local import)** : Provides database sessions for commit persistence and project queries.
- **Commit (model)** : ORM model representing a git commit, used to save commit records to DB.
- **Project (model)** : ORM model representing a project; used to update last watched commit and to list active projects.

#### Data and control flow
- Periodically polls the git repository for new commits on the default branch, fetches detailed metadata, diffs, stats, and changed files, logs commit info, persists commit to DB, and invokes optional commit callbacks.
- Manages multiple GitWatcher instances keyed by project ID, starting/stopping watchers, registering commit callbacks, and relaying commits to callbacks across all projects.

#### Configuration
- **GIT_BINARY** : Path to the git executable, currently hardcoded to a Windows installation path.
- **polling_interval** : Polling interval in seconds for how often the git watcher checks for new commits (default 3.0s).

#### Patterns
- GitWatcher runs an async polling loop in a background asyncio task that can be started and stopped, gracefully handling cancellation and exceptions.
- GitWatcherManager allows multiple async callbacks to be registered and asynchronously invoked on each detected commit across all watchers.
- save_commit uses a DB session with commit/rollback/finally close pattern to persist commit info and update project bookmarks safely.

#### Evidence
- `BE/app/git_watcher.py:L12-L241`
- `BE/app/git_watcher.py:L256-L317`
- `BE/app/git_watcher.py:L30-L39`

#### Notes
- The GIT_BINARY is hardcoded to a specific Windows user path; cross-platform or configurable support is not implemented.
- The code uses a default branch heuristic by checking refs main, master, then HEAD in that order, which may not cover all branch naming conventions.
- Commit callbacks must be asynchronous functions.
- The polling mechanism does not handle git repository state changes like branch renames or deletions beyond simple fallback to current HEAD.

### File: BE/app/main.py

Language: **python**

#### Symbols
- **ConnectionManager** (class)
- **__init__** (method)
- **connect** (method)
- **disconnect** (method)
- **broadcast** (method)
- **_seed_initial_data** (function)
- **lifespan** (function)
- **health** (function)
- **root** (function)
- **login** (function)
- **register** (function)
- **get_me** (function)
- **list_projects** (function)
- **create_project** (function)
- **activate_project** (function)
- **deactivate_project** (function)
- **list_commits** (function)
- **get_commit_detail** (function)
- **list_reviews** (function)
- **accept_review** (function)
- **reject_review** (function)
- **dashboard_stats** (function)
- **list_users** (function)
- **websocket_commits** (function)
- **LoginRequest** (class)
- **RegisterRequest** (class)
- **ProjectCreate** (class)

#### Dependencies
- **fastapi** : Used for creating the application, route decorators, dependency injection, WebSocket support, and middleware.
- **pydantic** : Used for defining request and response data validation schemas via BaseModel classes.
- **sqlalchemy.orm.Session** : Used for database session injection and ORM queries.
- **.auth** : Provides authentication helpers including token creation, password hashing and verification, and role requirements.
- **.database** : Database session creation, database initialization, and dependency injection.
- **.git_watcher** : Manages git repository watchers and commit event callbacks.
- **.models** : ORM models for CodeReview, Commit, DeveloperScore, Project, and User used in database queries and API responses.

#### Data and control flow
- Defines a lifespan async context manager for FastAPI: on startup initializes DB, seeds initial data, sets watcher callbacks, and starts watchers; on shutdown stops all watchers.
- Manages WebSocket connections via ConnectionManager, broadcasts new commit info to all connected clients, and handles client ping/pong.
- Provides endpoints to list, create, activate, and deactivate projects, managing watcher state accordingly.
- Allows users to login (issuing JWT tokens), register new accounts, and retrieve current user info by token authentication.
- Supports paginated retrieval and filtering of commits and individual commit detail with associated code reviews.
- Endpoints for listing code reviews with filters and updating review status to accepted or rejected.
- Provides aggregate counts for commits, reviews, projects, developers, and watcher/connection stats.
- Admin endpoint to list all users with details.

#### Configuration
- **FastAPI app configuration** : Defines FastAPI application with title, description, version, lifespan context manager, and CORS middleware allowing all origins and headers.
- **Logging configuration** : Basic logging setup with INFO level, timestamp, logger name, log level, and message formatting.

#### Patterns
- FastAPI dependency injection pattern via Depends used extensively for Database sessions and user authentication.
- Use of Pydantic BaseModel classes LoginRequest, RegisterRequest, and ProjectCreate to validate incoming JSON payloads.
- Central connection manager class tracks active WebSocket connections and handles message broadcasting with error cleanup.
- REST endpoints follow conventional CRUD patterns with clear URI and HTTP methods (GET for reads, POST for creation, PUT for updates).

#### Evidence
- `BE/app/main.py:L22`
- `BE/app/main.py:L92`
- `BE/app/main.py:L129`
- `BE/app/main.py:L147`
- `BE/app/main.py:L260`
- `BE/app/main.py:L403`

#### Notes
- The actual behavior of authentication, database models, and git watcher is not defined here but imported.
- Database session management relies on imported SessionLocal and get_db; exact connection details are outside this file.
- GitWatcherManager's implementation is external; only its usage and callback registration are visible.
- No explicit error schema for API responses is defined; only HTTPException raises standard HTTP error responses.
- WebSocket broadcasts send commit detected events but do not receive or process commit changes, except ping messages.

### File: BE/app/models.py

Language: **python**

#### Symbols
- **UserRole** (enum)
- **AnalysisStatus** (enum)
- **ReviewStatus** (enum)
- **Severity** (enum)
- **User** (class)
- **Project** (class)
- **Commit** (class)
- **CodeReview** (class)
- **DeveloperScore** (class)

#### Dependencies
- **sqlalchemy** : Used for ORM functionality including Column definitions and relationship mapping.
- **enum** : Used to define enumeration types for roles, statuses, and severity levels.
- **datetime** : Used to set default timestamps for creation and update fields.
- **Base** : Base class for all ORM models, imported from local '.database' module.

#### Evidence
- `BE/app/models.py:L1-L2`
- `BE/app/models.py:L46-L60`
- `BE/app/models.py:L79-L98`

#### Notes
- No function or method behaviors beyond data structure definitions are present.
- Relationships indicate bidirectional ORM relations but no methods define cascade rules or constraints beyond nullable and defaults.

### File: BE/app/rag.py

Language: **python**

#### Symbols
- **configure_ca_bundle** (function)
- **RAGPipeline** (class)
- **RAGPipeline.__init__** (method)
- **RAGPipeline.embed** (method)
- **RAGPipeline._clean** (method)
- **RAGPipeline.load** (method)
- **RAGPipeline.chunk** (method)
- **RAGPipeline.ingest** (method)
- **RAGPipeline.retrieve** (method)
- **RAGPipeline.limit_context** (method)
- **RAGPipeline.ask** (method)

#### Dependencies
- **__future__.annotations** : Enables postponed evaluation of annotations for forward references and type hints.
- **os** : Used for environment variable access, file path operations, and directory existence checks.
- **re** : Used for regex-based cleaning of text whitespace.
- **subprocess** : Used to invoke LibreOffice for converting legacy DOC files to DOCX format.
- **uuid** : Generates unique document IDs for uploaded files and chunk identifiers.
- **collections.defaultdict** : Provides a dictionary with default deque for session memory of question/answer history.
- **collections.deque** : Implements a fixed-length queue to store recent conversation memory per session.
- **pathlib.Path** : Provides object-oriented filesystem path manipulation used extensively for file and directory operations.
- **typing.Iterable** : Used for typing hinting of iterable return type in chunk method.
- **docx.Document** : Used to read DOCX file contents.
- **dotenv.load_dotenv** : Loads environment variables from .env files for configuration.
- **httpx** : HTTP client optionally used in OpenAI client initialization for SSL verification control.
- **openai.OpenAI** : Client for interaction with OpenAI API for embeddings and chat completions.
- **pypdf.PdfReader** : Used to read text from PDF files.
- **sentence_transformers.SentenceTransformer** : Used to load a local Hugging Face sentence transformer model for embeddings if EMBEDDING_PROVIDER=sentence_transformers.
- **chromadb** : Used for persistent vector database to store and query document embeddings.

#### Data and control flow
- Uploads a document, saves it, loads and extracts text per page, chunks text into overlapping pieces, embeds these chunks, and inserts them into a persistent vector database.
- Accepts a question and optional document filter; retrieves relevant document chunks by embedding similarity; limits the context to a character threshold; constructs a prompt including conversation history; queries the LLM for an answer or returns best passages if LLM is not configured; appends conversation history.

#### Configuration
- **Environment variable-based configuration** : Configuration for API keys, base URLs, embeddings provider/model, SSL certificates, upload path, Chroma persistent path, and OpenAI model are loaded from environment variables or .env file. Fallbacks and defaults are provided where appropriate.

#### Patterns
- Delays import of heavy dependencies (sentence_transformers, chromadb) until runtime in __init__ to optimize startup time for API health and docs endpoints.
- Uses a defaultdict of deque objects with maxlen=8 to store recent question/answer history per session id, enabling limited conversation context retention.
- Supports multiple document formats: PDF and DOCX loaded directly, legacy DOC files converted via LibreOffice, plain text files read as UTF-8 with ignoring decode errors.

#### Evidence
- `BE/app/rag.py:L1-L20`
- `BE/app/rag.py:L22-L38`
- `BE/app/rag.py:L41-L168`
- `BE/app/rag.py:L80-L92`
- `BE/app/rag.py:L94-L95`
- `BE/app/rag.py:L97-L132`
- `BE/app/rag.py:L134-L146`
- `BE/app/rag.py:L148-L178`
- `BE/app/rag.py:L180-L191`
- `BE/app/rag.py:L193-L203`
- `BE/app/rag.py:L205-L229`

#### Notes
- The file loads environment variables to configure operation but fallback defaults may cause partial operation (e.g., no OPENAI_API_KEY disables LLM usage).
- Legacy .doc files require LibreOffice for conversion, which may be a runtime dependency requirement not automatically handled by this code.
- The memory property stores limited recent session context per session ID, implicitly limiting conversation history size.
- Embedding provider is either OpenAI's API or local SentenceTransformer; no other providers are supported and cause an error.
- The code lazily imports heavy dependencies like 'chromadb' and 'sentence_transformers' to optimize startup latency.

### File: BE/certs/localized_tiktoken_setup.md

Language: **text**

#### Data and control flow
- Configures the project to use a locally cached tiktoken tokenizer to avoid SSL/certificate issues and enable offline or proxy-friendly operation.
- Download tiktoken files on an internet-enabled machine and copy cache files into the project tiktoken_cache directory.
- Set an environment variable TIKTOKEN_CACHE_DIR pointing to the local cache folder and assert presence of cache file to ensure local caching.
- Run the app using the local tiktoken cache to avoid SSL/certificate errors in offline or restricted environments.

#### Configuration
- **TIKTOKEN_CACHE_DIR environment variable** : Sets the directory path for tiktoken cache files to enable offline loading of tokenizer files.

#### Patterns
- Use an environment variable to override tiktoken cache directory allowing offline use and asserting cache file presence to catch errors early.

#### Evidence
- `BE/certs/localized_tiktoken_setup.md:L1-L37`

#### Notes
- The document only provides instructions and example code snippets in text form rather than a complete script.
- The cache filename shown as an example (9b5ad71b2ce5302211f9c61530b329a4922fc6a4) must match the actual cache files.
- The environment variable name and usage must be exact for tiktoken to locate the cache correctly.

### File: BE/config.py

Language: **python**

#### Symbols
- **get_http_client** (function)
- **get_llm** (function)
- **get_embeddings** (function)
- **get_vectordb** (function)
- **get_vision_llm_response** (function)

#### Dependencies
- **os** : Used for environment variable configuration, path manipulations, and directory creation.
- **ssl** : Overrides default SSL context to disable SSL verification globally.
- **httpx** : Used to create an HTTP client instance with disabled SSL verification for API calls.
- **langchain_openai.ChatOpenAI** : Used to create a chat LLM instance configured with model and API key.
- **langchain_openai.OpenAIEmbeddings** : Used to create an embeddings instance configured with an embedding model and API key.
- **langchain_community.vectorstores.Chroma** : Used to create a persistent vector store backed by Chroma with embeddings.
- **litellm.completion** : Used to perform completion requests to a vision LLM with disable SSL verification setting.
- **dotenv.load_dotenv** : Loads environment variables from a .env file.

#### Data and control flow
- Each of the getter functions (_http_client, _llm, _embeddings, _vectordb) lazily initializes and caches a singleton instance upon first call, reusing it on subsequent calls.
- The function get_vision_llm_response sends messages to a vision LLM model by calling litellm.completion with specific model, messages, base URL, and API key, returning the response.

#### Configuration
- **BASE_URL** : Base URL for API requests.
- **LLM_MODEL** : Specifies the large language model identifier used for chat.
- **VISION_MODEL** : Specifies the vision model identifier used for vision-augmented LLM completions.
- **EMBEDDING_MODEL** : Specifies the embedding model identifier.
- **API_KEY** : API key for authentication, read from environment or default fallback.
- **FLASK_PORT** : Port number for Flask HTTP server.
- **SECRET_KEY** : Secret key used for Flask sessions or other cryptographic purposes.
- **JWT_ALGORITHM** : Algorithm used for JWT token encoding/decoding.
- **UPLOAD_FOLDER** : Path to the directory where uploads are saved, created if missing.
- **ML_MODEL_PATH** : Path to the machine learning best model file.
- **CHROMA_DIR** : Path to the directory where Chroma vector store persists data.
- **TIKTOKEN_CACHE_DIR** : Directory path for caching Tiktoken data, environment variable set accordingly.

#### Patterns
- For API_KEY and SECRET_KEY, the code attempts to read environment variables, falling back to hardcoded default strings if not set.
- Disables SSL certificate verification globally by setting SSL context unverified and configuring HTTP client and some environment variables accordingly.
- Uses global variables initialized as None and initialized only once in getter functions to ensure singleton access.

#### Evidence
- `BE/config.py:L1-L82`

#### Notes
- API keys and secret keys have hardcoded fallbacks which may not be secure in production.
- SSL verification is disabled globally which may expose the system to MITM attacks.
- Global mutable state is used for caching singleton client instances.

### File: BE/gateway/__init__.py

Language: **text**

#### Evidence
- `BE/gateway/__init__.py:L1-5`

#### Notes
- The file contains only a module-level docstring describing the gateway layer and its features; no code symbols, dependencies, flows, or configuration are present.

### File: BE/gateway/auth.py

Language: **python**

#### Symbols
- **generate_token** (function)
- **decode_token** (function)
- **require_auth** (function)

#### Dependencies
- **jwt** : Used for encoding and decoding JWT tokens in generate_token and decode_token functions.
- **datetime** : Used to generate and validate token issuance and expiration times.
- **functools.wraps** : Used to preserve metadata of wrapped functions in the require_auth decorator.
- **flask** : Used for accessing request headers and returning JSON responses within the require_auth decorator.
- **config.SECRET_KEY** : Secret key used to encode and decode JWT tokens.
- **config.JWT_ALGORITHM** : Algorithm used for encoding and decoding JWT tokens.

#### Data and control flow
- Decorator that first checks for successful mTLS client certificate headers; if absent, checks for Bearer JWT token in Authorization header; if validation fails returns 401 Unauthorized response; else attaches user_context to request and calls the wrapped function.

#### Patterns
- Generating a JWT token with subject, roles, issued at and expiry; decoding and validating a JWT with secret and algorithm; handling expired or invalid tokens by returning None.
- A decorator wrapper that uses request headers to enforce either mTLS verification or JWT bearer token authentication with detailed 401 Unauthorized JSON responses on failure.

#### Evidence
- `BE/gateway/auth.py:L1-L63`

#### Notes
- No explicit configuration sections or files are present in this code.
- User context is attached to the Flask request object dynamically within the decorator.
- The decorator treats two types of authentication as valid: mTLS headers and JWT bearer tokens.

### File: BE/gateway/guardrails.py

Language: **python**

#### Symbols
- **HEALTHCARE_KEYWORDS** (variable)
- **COMPILED_HEALTHCARE_REGEX** (variable)
- **detect_healthcare_intent** (function)
- **enforce_healthcare_guardrail** (function)

#### Dependencies
- **re** : Used for regex operations to identify healthcare keywords in input text.
- **functools.wraps** : Used to create a decorator that preserves the metadata of the wrapped function.
- **flask.request** : Used to access HTTP request data inside the decorator.
- **flask.jsonify** : Used to generate JSON HTTP responses, particularly for the 403 policy violation response.

#### Data and control flow
- Input text is extracted from JSON payload or query parameters. It is passed to detect_healthcare_intent. If the text contains healthcare-related terms, the decorator immediately returns a HTTP 403 JSON error response indicating policy violation, preventing further processing. Otherwise, the wrapped endpoint is called.

#### Patterns
- Use a compiled regex matching any of a set of healthcare related keywords to detect intent in input text. This pattern allows fast scanning and early blocking based on domain policy.
- Wraps Flask endpoint functions with a decorator that enforces business logic constraints (blocking medical intent) before invoking the handler.

#### Evidence
- `BE/gateway/guardrails.py:L4-L32`
- `BE/gateway/guardrails.py:L34`
- `BE/gateway/guardrails.py:L36-L46`
- `BE/gateway/guardrails.py:L48-L79`
- `BE/gateway/guardrails.py:L1-L3`

#### Notes
- No configuration options or parameters are exposed for the healthcare keywords or regex pattern.
- The decorator extracts text from multiple possible fields in JSON payload or query parameters without explicit prioritization details beyond sequential or fallbacks.
- The return value from detect_healthcare_intent is tuple (bool, str), but the code only acts on boolean detection, embedding the matched term in the response.

### File: BE/gateway/rate_limiter.py

Language: **python**

#### Symbols
- **init_rate_limiter** (function)
- **ratelimit_handler** (function)

#### Dependencies
- **flask** : Imports jsonify for JSON response formatting and app error handling.
- **flask_limiter** : Imports Limiter for rate limiting and utility function get_remote_address to determine rate limiting key.

#### Data and control flow
- The function init_rate_limiter(app) sets up Flask-Limiter with specified rate limits, assigns it to the app, and defines a custom error handler for HTTP 429 errors that returns a JSON eject response.

#### Configuration
- **Rate Limit Settings** : Default rate limits are set to '100 per minute' and '20 per second', and the storage medium for rate limiter is 'memory://'.

#### Evidence
- `BE/gateway/rate_limiter.py:L1-L23`

#### Notes
- The code initializes rate limiting at Layer 2 but the error response references Layer 1: Local Secure Gateway, which could indicate layering naming ambiguity.
- Rate limits and storage are hardcoded with no external configuration options.

### File: BE/sonarqube.py

Language: **python**

#### Symbols
- **fetch_all_issues** (function)
- **fetch_rule** (function)
- **read_source** (function)
- **main** (function)

#### Dependencies
- **os** : Used for file path manipulation and existence checks.
- **json** : Used for parsing JSON responses and dumping final report to a JSON file.
- **requests** : Used for making HTTP GET requests to SonarQube API endpoints.
- **urllib3** : Used to disable SSL verification warnings.
- **requests.auth.HTTPBasicAuth** : Used for HTTP Basic Authentication to SonarQube API with a token.

#### Data and control flow
- The script fetches all issues from SonarQube, retrieves rule details for unique rules, reads related source code snippets from a local repo, and compiles a comprehensive report saved in JSON format.

#### Configuration
- **SONAR_HOST** : Base URL for the SonarQube server API requests.
- **SONAR_TOKEN** : Authentication token used for HTTP Basic Auth with SonarQube API.
- **PROJECT_KEY** : SonarQube project identifier key to filter issues.
- **REPO_PATH** : Local path to the Git repository where source files are located for reading code snippets.

#### Patterns
- The fetch_all_issues function uses pagination by incrementing a page counter and accumulating results until all issues are retrieved based on total count.
- Uses HTTPBasicAuth with a token for authentication on each API request.
- Reads a range of lines (line_number -10 to line_number +10) around a reported issue line from local repository to provide context.

#### Evidence
- `BE/sonarqube.py:L1-L7`
- `BE/sonarqube.py:L11-L15`
- `BE/sonarqube.py:L18-L43`
- `BE/sonarqube.py:L46-L56`
- `BE/sonarqube.py:L59-L84`
- `BE/sonarqube.py:L87-L120`

#### Notes
- The script disables SSL verification warnings but does not enforce SSL certificate verification (verify=False in API calls).
- The authentication uses a shared token with an empty password passed via HTTPBasicAuth.
- The source snippet reads 20 lines around the issue line with bounds checking but may return None if file is missing or an error occurs.
- The script assumes the local repo path matches component file paths extracted from issue components.

### File: README.md

Language: **text**

#### Evidence
- `README.md:L1-3`

### File: chatbot/README.md

Language: **text**

#### Data and control flow
- The flow of components in the knowledge agent pipeline starts from a codebase path, then passes through the Orchestrator (main.py), then the Knowledge Extractor subagent (extractor_agent.py) which handles one task per file, then to FileKnowledge JSON records, then Formatter subagent (formatter_agent.py), and finally produces knowledge_base.md.

#### Configuration
- **Required .env settings** : The required environment variables include OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL, and EMBEDDING_MODEL. Optional settings include OPENAI_TIMEOUT_SECONDS which defaults to 45, and OKF_EXTRACTOR_WORKERS which controls concurrent extractor tasks and defaults to 2.

#### Evidence
- `chatbot/README.md:L1-L44`

#### Notes
- No executable code or symbols defined in this readme file.
- No patterns beyond the described agent flow and configuration were documented.
- No dependencies explicitly named beyond environment variables.

### File: chatbot/config.py

Language: **python**

#### Symbols
- **get_http_client** (function)
- **_require_model_settings** (function)
- **get_llm** (function)
- **get_embeddings** (function)
- **get_vectordb** (function)

#### Dependencies
- **os** : Used to get environment variables, set environment variables, and handle file system paths and directory creation.
- **ssl** : Overrides default HTTPS context to disable SSL certificate verification by assigning _create_unverified_context.
- **httpx** : Used to create HTTP clients with specified timeouts, SSL verification, and connection limits.
- **dotenv.load_dotenv** : Loads environment variables from a .env file into the process environment.
- **threading** : Used to create a thread lock to synchronize creation of the singleton http client.
- **langchain_openai.ChatOpenAI** : Provides the LLM interface instance used in get_llm, imported lazily.
- **langchain_openai.OpenAIEmbeddings** : Provides the embeddings instance used in get_embeddings, imported lazily.
- **langchain_community.vectorstores.Chroma** : Provides a vector database for persistent embeddings, imported lazily in get_vectordb.

#### Data and control flow
- get_http_client uses double-checked locking to lazily initialize a single httpx.Client instance shared globally.
- get_llm lazily imports ChatOpenAI, validates environment settings, creates a new httpx.Client, then instantiates and caches a ChatOpenAI instance.
- get_embeddings lazily imports OpenAIEmbeddings, checks environment settings, and creates a singleton embeddings instance using the shared http client.
- get_vectordb lazily imports Chroma vectorstore, using get_embeddings for the embedding function, creating a singleton persistent vector store instance.

#### Configuration
- **UPLOAD_FOLDER** : Directory path for uploads, from UPLOAD_PATH env or defaults to 'uploads' under BASE_DIR. Created if missing.
- **ML_MODEL_PATH** : Path to machine learning model file 'best_model.pt' inside the textile-defect-detection-master/models directory in BASE_DIR.
- **CHROMA_DIR** : Directory for Chroma vector store persistence from CHROMA_PATH env or defaults to 'chroma_defects' under BASE_DIR.
- **BASE_URL** : OpenAI API base URL, normalized to end with '/v1' if provided in OPENAI_BASE_URL env variable.
- **LLM_MODEL** : Language model name for OpenAI from OPENAI_MODEL environment variable.
- **EMBEDDING_MODEL** : Embedding model name for OpenAI from EMBEDDING_MODEL environment variable.
- **API_KEY** : OpenAI API key from environment variable OPENAI_API_KEY.
- **OPENAI_TIMEOUT_SECONDS** : Timeout for OpenAI HTTP requests, defaulting to 45 seconds if env var not set.
- **OPENAI_MAX_RETRIES** : Maximum number of retries for OpenAI requests, default 3.
- **OPENAI_RETRY_DELAY_SECONDS** : Delay between retry attempts for OpenAI requests, default 5 seconds.
- **VERIFY_SSL** : Boolean flag derived from OPENAI_VERIFY_SSL environment variable to enable or disable SSL verification.
- **FLASK_PORT** : Fixed port 8000 used for Flask web server.
- **SECRET_KEY** : Secret key for Flask app from SECRET_KEY env or default string 'friday-hackathon-secret-key-2024'.
- **JWT_ALGORITHM** : JWT signing algorithm HS256.
- **TIKTOKEN_CACHE_DIR** : Directory path for tiktoken cache under BASE_DIR, created if missing and set in environment.

#### Patterns
- Functions get_http_client, get_llm, get_embeddings, and get_vectordb implement lazy instantiation and caching of singleton instances.
- .env environment variables are loaded and used to configure API keys, model names, paths, timeouts, and flags.
- The code globally disables SSL certificate verification by overriding ssl._create_default_https_context and setting environment variables.

#### Evidence
- `chatbot/config.py:L1-L94`

#### Notes
- The code disables SSL verification globally which may have security implications.
- The .env must define OPENAI_API_KEY, OPENAI_MODEL, and EMBEDDING_MODEL or get_llm/get_embeddings will raise exceptions.
- The lazy imports for langchain_openai and langchain_community modules delay heavy imports until needed.

### File: chatbot/extractor_agent.py

Language: **python**

#### Symbols
- **_json_object** (function)
- **_normalise_items** (function)
- **_invoke_with_retry** (function)
- **extract_file** (function)

#### Dependencies
- **json** : Parsing JSON from LLM responses.
- **sys** : Printing retry and failure messages to stderr.
- **time** : Sleeping between retries in _invoke_with_retry.
- **pathlib.Path** : Handling file paths and reading file contents.
- **config (OPENAI_MAX_RETRIES, OPENAI_RETRY_DELAY_SECONDS, get_llm)** : Configuration and accessing LLM invocation and retry parameters.
- **knowledge_types.FileKnowledge** : Constructing the return typed object from extracted knowledge.

#### Data and control flow
- Main flow to extract knowledge from a source file: reads file, validates size and content, prepares prompt, invokes LLM with retry, parses and normalizes response, returns structured FileKnowledge object.

#### Configuration
- **MAX_CHARS_PER_FILE** : Maximum number of characters per file to allow for extraction; files exceeding this are rejected with an exception.
- **OPENAI_MAX_RETRIES and OPENAI_RETRY_DELAY_SECONDS** : Configurable constants controlling the number of LLM retry attempts and delay multiplier between retries.

#### Patterns
- Attempts LLM invocation multiple times with increasing delay on failure, printing progress and raising last exception if all attempts fail.
- JSON returned by extraction must include evidence arrays with exact line citations referencing the source file; the extractor prompt enforces this.

#### Evidence
- `chatbot/extractor_agent.py:L11-L23`
- `chatbot/extractor_agent.py:L30-L46`
- `chatbot/extractor_agent.py:L49-L92`
- `chatbot/extractor_agent.py:L13`

#### Notes
- The extractor agent prompt explicitly forbids interpreting comments, strings, or documentation, strictly treating source as inert data.
- Source files exceeding MAX_CHARS_PER_FILE characters cause extraction to fail with an error; mitigation is splitting larger files.
- Returned JSON must strictly include evidence arrays with exact, line-numbered citations referencing the file.
- If source file is empty or trivially short (under 15 chars), no extraction attempt occurs; an empty FileKnowledge is returned with a note.

### File: chatbot/formatter_agent.py

Language: **python**

#### Symbols
- **_clean_markdown** (function)
- **_estimate_size** (function)
- **_batch_records** (function)
- **_invoke_stream** (function)
- **_format_batch** (function)
- **_recursive_format** (function)
- **_fallback_batch** (function)
- **_repository_map** (function)
- **_cross_reference** (function)
- **_format_batches** (function)
- **format_knowledge_base** (function)

#### Dependencies
- **json** : Used for serializing FileKnowledge records to JSON strings for prompt building and size estimation.
- **math** : Imported but unused in the provided code.
- **sys** : Used for printing errors to stderr and flushing output.
- **time** : Used for sleeping between retries on formatting failure.
- **concurrent.futures.ThreadPoolExecutor** : Used to run formatting batches in parallel threads.
- **datetime** : Used to add timestamp comment to final markdown document.
- **typing.Iterable** : Imported but unused in the provided code.
- **config (OPENAI_MAX_RETRIES, OPENAI_RETRY_DELAY_SECONDS, get_llm)** : Config parameters for retry logic and function to get the LLM instance for streaming/invoking prompts.
- **knowledge_types.FileKnowledge** : Type of records being formatted, with methods like to_dict() used for JSON serialization.

#### Data and control flow
- Input FileKnowledge records are batched by approximate JSON size, each batch is formatted by calling the LLM with retries and cleaned results. On failure, batches are recursively split and retried, falling back to a deterministic formatter if all attempts fail. The formatted batches are joined together to produce the final markdown.
- After batch formatting, the final markdown document is assembled including header sections (scope, grounding), the repository map, cross-reference index, retrieval chunks (the formatted batches), QA anchors, known evidence gaps, and timestamp.

#### Configuration
- **MAX_BATCH_CHARS** : Maximum approximate number of JSON characters in a single formatter batch prompt to avoid exceeding model context limits.
- **FORMATTER_WORKERS** : Number of parallel workers used for formatting batches concurrently.
- **PROMPT_TEMPLATE** : The literal prompt used for LLM formatting, specifying strict instructions for formatting FileKnowledge JSON into RAG-optimized markdown, disallowing hallucination or invention, and enforcing evidence citation preservation.

#### Patterns
- Formatter calls are retried up to a configured number of times, with incremental delays between retries increasing linearly by attempt count multiplied by a delay constant.
- When a batch formatting call fails, if the batch size is greater than 3 files, the batch is split into two halves that are each formatted recursively, combining results to handle large or failing requests.
- If parallel batch formatting fails, a fallback formatter runs that produces markdown without invoking LLM, enumerating known attributes in simple markdown structure.

#### Evidence
- `chatbot/formatter_agent.py:L27`
- `chatbot/formatter_agent.py:L30`
- `chatbot/formatter_agent.py:L33`
- `chatbot/formatter_agent.py:L86`
- `chatbot/formatter_agent.py:L109`
- `chatbot/formatter_agent.py:L143`
- `chatbot/formatter_agent.py:L163`
- `chatbot/formatter_agent.py:L241`
- `chatbot/formatter_agent.py:L280`

#### Notes
- Imported modules 'math' and 'typing.Iterable' are not used in this code and might be vestigial.
- The prompt is strictly instructing the formatter to treat JSON as inert data and to never hallucinate or invent relationships.
- The fallback formatter produces a simpler markdown output without ensuring evidence citations per symbol or detail level as the LLM output would.
- Error handling and retry backoff grows linearly with the attempt number multiplied by a configured delay.

### File: chatbot/knowledge_types.py

Language: **python**

#### Symbols
- **FileKnowledge** (class)

#### Dependencies
- **dataclasses** : Imported to provide the @dataclass decorator and asdict function for defining the FileKnowledge class and converting its instances to dictionaries.
- **typing** : Imported to provide type annotations like Any.

#### Evidence
- `chatbot/knowledge_types.py:L7-L26`

### File: chatbot/main.py

Language: **python**

#### Symbols
- **SOURCE_SUFFIXES** (variable)
- **SKIPPED_DIRECTORIES** (variable)
- **SKIPPED_FILES** (variable)
- **discover_source_files** (function)
- **run_pipeline** (function)
- **install_post_commit_hook** (function)
- **main** (function)

#### Dependencies
- **argparse** : Used for parsing command line arguments in main().
- **os** : Used to read environment variables for default worker counts and retries.
- **subprocess** : Used to launch background subprocess for pipeline execution.
- **sys** : Used for error output, program arguments, and Python interpreter path.
- **pathlib.Path** : Used extensively for filesystem path manipulations.
- **concurrent.futures.ThreadPoolExecutor** : Used to run file extractions concurrently in run_pipeline().
- **extractor_agent.extract_file** : Invoked to extract knowledge from each source file.
- **formatter_agent.format_knowledge_base** : Formats extracted file knowledge records into Markdown.
- **knowledge_types.FileKnowledge** : Type used for storing extraction results per file.

#### Data and control flow
- Main flow to discover source files, run parallel knowledge extraction with retries, format the results into Markdown, write output file, and report skipped files.
- Flow for installing a Git post-commit hook that triggers documentation generation on commit.
- Parsing CLI arguments, conditionally installing hooks or starting extraction pipeline (foreground or background).

#### Configuration
- **SOURCE_SUFFIXES** : Set of file extensions considered as source code for extraction.
- **SKIPPED_DIRECTORIES** : Set of directory names to ignore during source discovery.
- **SKIPPED_FILES** : Set of specific filenames to skip during source discovery.
- **Default worker and retry counts** : Defaults for number of threads and retry attempts configurable via environment variables OKF_EXTRACTOR_WORKERS, OPENAI_MAX_RETRIES.

#### Patterns
- Uses ThreadPoolExecutor with futures and as_completed to dispatch and collect parallel extraction tasks with retry logic.
- Recursive glob walk filtering out skipped directories, skipped files, and supported suffixes to identify source files.
- Launches a detached subprocess of the same script with specific flags to run the pipeline in background.

#### Evidence
- `chatbot/main.py:L10-L19`
- `chatbot/main.py:L22-L39`
- `chatbot/main.py:L42-L83`
- `chatbot/main.py:L86-L101`
- `chatbot/main.py:L104-L137`

#### Notes
- The 'extract_file' function is invoked but its behavior is not shown in this file, so details about extraction itself are out of scope.
- Environment variables provide defaults for workers and retries but are not validated beyond int cast.
- Background execution does not redirect output and error streams to logs but to DEVNULL.
- The Git hook post-commit script is created assuming a POSIX environment; Windows fallback disables executable bits without error.

### File: enterprise-app/AGENTS.md

Language: **text**

#### Evidence
- `enterprise-app/AGENTS.md:L1-L12`
- `enterprise-app/AGENTS.md:L8-L10`

#### Notes
- The file only contains a warning about major breaking changes in the version of Next.js used and instructions for verifying changes with 'next dev'.
- No explicit code symbols, dependencies, flows, patterns, or configuration are defined or described in the provided content.

### File: enterprise-app/CLAUDE.md

Language: **md**

#### Evidence
- `enterprise-app/CLAUDE.md:L1`

### File: enterprise-app/README.md

Language: **text**

#### Dependencies
- **Next.js** : A React framework used to build the application
- **next/font** : Used to automatically optimize and load the Geist font family

#### Data and control flow
- Start the development server using npm, yarn, pnpm, or bun to run the app locally for development

#### Configuration
- **Editing app/page.tsx** : The main entry page file that you can edit to see live updates in the browser

#### Evidence
- `enterprise-app/README.md:L1-L2`
- `enterprise-app/README.md:L6-L12`
- `enterprise-app/README.md:L13-L15`
- `enterprise-app/README.md:L16-L18`

### File: enterprise-app/app/globals.css

Language: **css**

#### Symbols
- **:root** (css selector)
- **@theme inline** (at-rule)
- **@media (prefers-color-scheme: dark)** (at-rule)
- **body** (css selector)

#### Dependencies
- **tailwindcss** : Imported at the start of the stylesheet to apply Tailwind CSS's base styles and utilities.

#### Configuration
- **Dark mode color scheme** : Configures CSS variables to adapt colors under the prefers-color-scheme: dark media query.

#### Patterns
- Defines and utilizes CSS variables to support light and dark themes with fallback values and inheritance.

#### Evidence
- `enterprise-app/app/globals.css:L1`
- `enterprise-app/app/globals.css:L3-L6`
- `enterprise-app/app/globals.css:L8-L13`
- `enterprise-app/app/globals.css:L15-L20`
- `enterprise-app/app/globals.css:L22-L27`

#### Notes
- The @theme inline at-rule is not a standard CSS feature; its exact effect depends on the CSS processor or framework used.
- Font variables --font-geist-sans and --font-geist-mono used in @theme inline are not defined within this file.
- No JavaScript or other files referenced; this is purely a CSS stylesheet.

### File: enterprise-app/app/layout.tsx

Language: **typescript**

#### Symbols
- **geistSans** (variable)
- **geistMono** (variable)
- **metadata** (constant)
- **RootLayout** (function)

#### Dependencies
- **next** : Imports Metadata type for typing the metadata export
- **next/font/google** : Imports Geist and Geist_Mono font utilities to load Google fonts
- **./globals.css** : Imports global CSS styles for the application

#### Configuration
- **metadata** : Defines the page/app-wide metadata such as title and description used by Next.js

#### Patterns
- Uses the font objects' CSS variable properties to inject font CSS variables into the html element's className for styling
- Defines a React root layout component that wraps content within html and body elements, enabling global styles and fonts

#### Evidence
- `enterprise-app/app/layout.tsx:L1-L3`
- `enterprise-app/app/layout.tsx:L5-L15`
- `enterprise-app/app/layout.tsx:L17-L21`
- `enterprise-app/app/layout.tsx:L23-L34`

#### Notes
- The RootLayout function uses a type LayoutProps</"> which is not defined or imported in this file.
- No runtime behavior or side-effect beyond JSX layout rendering and css import is evident.

### File: enterprise-app/app/page.tsx

Language: **typescript**

#### Symbols
- **Home** (function)

#### Dependencies
- **next/image** : Imported as Image and used for rendering optimized images within the component.

#### Evidence
- `enterprise-app/app/page.tsx:L1`
- `enterprise-app/app/page.tsx:L3-L59`

#### Notes
- The file defines a single default-exported React functional component named Home.
- Images are rendered using the Next.js Image component.
- No explicit flows, patterns, or configuration objects are present in the file.

### File: enterprise-app/next.config.ts

Language: **typescript**

#### Symbols
- **nextConfig** (constant)

#### Dependencies
- **NextConfig** : Imported type from 'next' to type the nextConfig constant.

#### Configuration
- **nextConfig** : Next.js configuration object, currently empty with a placeholder comment for config options.

#### Evidence
- `enterprise-app/next.config.ts:L1`
- `enterprise-app/next.config.ts:L3-L8`

#### Notes
- The config object is empty and contains only a placeholder comment.
- No explicit behavior or options are defined within the configuration.

### File: enterprise-app/package.json

Language: **json**

#### Dependencies
- **next** : framework for React app building and running
- **react** : library for building user interfaces
- **react-dom** : react package for DOM rendering

#### Data and control flow
- running the app in development mode
- building the production app
- starting the production app
- running eslint for linting the code

#### Configuration
- **version** : version of the enterprise-app package
- **private** : disables publishing to public npm registry

#### Evidence
- `enterprise-app/package.json:L1-L15`

#### Notes
- Dev dependencies usage is not explicitly documented in scripts or configuration.

### File: enterprise-app/tsconfig.json

Language: **json**

#### Symbols
- **compilerOptions** (object)
- **target** (string)
- **lib** (array)
- **allowJs** (boolean)
- **skipLibCheck** (boolean)
- **strict** (boolean)
- **noEmit** (boolean)
- **esModuleInterop** (boolean)
- **module** (string)
- **moduleResolution** (string)
- **resolveJsonModule** (boolean)
- **isolatedModules** (boolean)
- **jsx** (string)
- **incremental** (boolean)
- **plugins** (array)
- **paths** (object)
- **include** (array)
- **exclude** (array)

#### Dependencies
- **next** : Compiler plugin to enhance integration with Next.js framework.

#### Configuration
- **paths alias '@/*'** : Maps imports starting with '@/' to the project root './' directory, simplifying imports.
- **Compiler strict mode** : Enables strict type-checking options for higher code safety and correctness.
- **No emit on compile** : Does not emit output files; TypeScript is used for type checking only.
- **Module resolution set to bundler** : Resolves modules in a way compatible with bundlers rather than Node or classic resolution.
- **JSX runtime set to react-jsx** : Uses the new JSX transform provided by React 17 and later.

#### Evidence
- `enterprise-app/tsconfig.json:L1-L32`

#### Notes
- The tsconfig.json configures TypeScript compilation without emitting output files, indicating usage primarily for type-checking.
- The module resolution strategy 'bundler' may affect how modules are located differently from classic or node strategies.
- The presence of 'plugins' with 'next' implies integration with Next.js tooling but details of plugin behavior are external to this file.
- No explicit sourceMap or declaration options are set, so defaults apply.
- Paths alias '@/*' simplifies import paths but it is not detailed whether this matches any runtime resolution configuration.

### File: implementation_plan.md

Language: **markdown**

#### Symbols
- **GitWatcher** (class)
- **User** (class (DB Model))
- **Project** (class (DB Model))
- **Commit** (class (DB Model))
- **CodeReview** (class (DB Model))
- **DeveloperScore** (class (DB Model))
- **ReviewAction** (class (DB Model))
- **Auth API Endpoints** (API)
- **Code Analysis Agents** (component)
- **DeveloperProfilerAgent** (component)
- **QualityScorerAgent** (component)
- **TaskRecommenderAgent** (component)
- **LearningAdvisorAgent** (component)
- **AI Gateway Code Guardrails** (component)
- **Database Setup** (component)
- **Seed Data Script** (component)
- **Backend Dependencies** (dependencies)
- **Frontend Dependencies** (dependencies)
- **API Endpoints (main.py)** (API)
- **Frontend Pages and Components** (component)
- **Git Watcher Polling Design** (flow)
- **Code Analysis Agent Orchestration Flow** (flow)
- **Role-Based Access Control** (pattern)
- **Multi-Phase Implementation Plan** (pattern)

#### Dependencies
- **Git binary** : Used by GitWatcher to run git commands (git log, git diff) for monitoring commits.
- **SQLite** : Used as the database for commits, users, code reviews, and developer scores.
- **FastAPI** : Backend server framework exposing REST API, WebSocket endpoints, and mounting middleware.
- **WebSocket** : Real-time commit and analysis progress feeds to frontend.
- **AI Gateway** : Proxy and guardrail layer routing LLM requests for code analysis with security and cost controls.
- **Static Analysis Tools** : Python tools (pylint, flake8, bandit, radon) and JS/TS eslint used by StaticAnalysisAgent.
- **ChromaDB** : Vector store for code embeddings managed by the backend data layer.
- **JWT, bcrypt** : Authentication tokens and password hashing in auth.py.

#### Data and control flow
- Polling the local git remote every few seconds to detect new commits, extracting commit diffs, emitting WebSocket events, updating last_seen_commit in DB.
- New commit triggers DiffParserAgent, then CodeAnalysisAgent and StaticAnalysisAgent run in parallel to produce findings, merged by MetaAnalysisAgent, producing prioritized issues for SuggestionGeneratorAgent and notifying frontend via WebSocket.

#### Configuration
- **AI Gateway API Key and Endpoint** : Current config uses 'genailab-maas-gpt-4o' API key at 'https://genailab.tcs.in', pending confirmation for hackathon validity and model usage.
- **SonarQube Analysis Option** : Decision to either install local SonarQube server (Java 17+ required) or simulate with Python/JS static analysis tools for faster demo.
- **SQLite Database** : Use SQLite as database backend for simplicity during hackathon, stored at './data/code_analysis.db'.
- **Git Repositories to Watch** : Initial watched repo path is 'C:\GitRemote', made dynamically configurable via API endpoints.

#### Patterns
- Using JWT tokens and role-specific decorators to restrict endpoint access by user roles (admin/developer).
- Build system in phases prioritizing core backend with Git watcher and DB, then analysis agents, then frontend dashboards, followed by AI gateway enhancements.

#### Evidence
- `implementation_plan.md:L104-L117`
- `implementation_plan.md:L120-L129`
- `implementation_plan.md:L133-L141`
- `implementation_plan.md:L142-L153`
- `implementation_plan.md:L166-L212`
- `implementation_plan.md:L184-L204`
- `implementation_plan.md:L221-L261`
- `implementation_plan.md:L294-L311`
- `implementation_plan.md:L316-L328`
- `implementation_plan.md:L338-L370`
- `implementation_plan.md:L375-L399`
- `implementation_plan.md:L33-L50`
- `implementation_plan.md:L283-L320`

#### Notes
- No actual code implementation present, only design and plan in markdown form.
- Exact details of agent implementations (e.g., methods) and API request/response formats are not specified.
- Confirmation needed on AI Gateway API key usage and SonarQube deployment approach.
- Authentication provider and database migration decisions are open questions.
- Frontend UI described in general terms without detailed component props or state management design.
- Some legacy Flask gateway parts mentioned to be kept; integration details not fully described.


## Assistant Q&A anchors

### How is the repository structured?

The repository contains **33** documented source files.

## Known evidence gaps

Only gaps explicitly reported by extractor agents are included.

<!-- Generated by OKF at 2026-08-07T12:03:48.130351+00:00 -->