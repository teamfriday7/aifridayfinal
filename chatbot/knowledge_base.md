# Codebase Knowledge Base

## Scope and grounding

Source root: `C:\Users\GenAITVMSEZUSR\Documents\aifridayfinal\chatbot`

Documented files: **5**

## Repository map

- `README.md` (text)
- `config.py` (python)
- `formatter_agent.py` (python)
- `knowledge_types.py` (python)
- `main.py` (python)

## Cross-reference index

- `get_http_client` → `config.py` [config.py:L30-L42]
- `_require_model_settings` → `config.py` [config.py:L44-L51]
- `get_llm` → `config.py` [config.py:L53-L80]
- `get_embeddings` → `config.py` [config.py:L82-L92]
- `get_vectordb` → `config.py` [config.py:L94-L101]
- `_clean_markdown` → `formatter_agent.py` [formatter_agent.py:L52-L74]
- `_estimate_size` → `formatter_agent.py` [formatter_agent.py:L77-L92]
- `_batch_records` → `formatter_agent.py` [formatter_agent.py:L95-L118]
- `_invoke_stream` → `formatter_agent.py` [formatter_agent.py:L121-L138]
- `_format_batch` → `formatter_agent.py` [formatter_agent.py:L141-L179]
- `_recursive_format` → `formatter_agent.py` [formatter_agent.py:L182-L202]
- `_fallback_batch` → `formatter_agent.py` [formatter_agent.py:L205-L256]
- `_repository_map` → `formatter_agent.py` [formatter_agent.py:L259-L269]
- `_cross_reference` → `formatter_agent.py` [formatter_agent.py:L272-L288]
- `_format_batches` → `formatter_agent.py` [formatter_agent.py:L291-L330]
- `format_knowledge_base` → `formatter_agent.py` [formatter_agent.py:L333-L380]
- `FileKnowledge` → `knowledge_types.py` [knowledge_types.py:L5-L31]
- `SOURCE_SUFFIXES` → `main.py` [main.py:L8-L11]
- `SKIPPED_DIRECTORIES` → `main.py` [main.py:L12-L13]
- `SKIPPED_FILES` → `main.py` [main.py:L14-L18]
- `discover_source_files` → `main.py` [main.py:L21-L38]
- `run_pipeline` → `main.py` [main.py:L41-L84]
- `install_post_commit_hook` → `main.py` [main.py:L87-L101]
- `main` → `main.py` [main.py:L104-L134]

## Retrieval chunks

# Codebase Knowledge Base

## Scope and grounding

This codebase implements a file-path-based, source-grounded multi-agent documentation pipeline that processes a codebase directory to produce a consolidated knowledge base in Markdown format. The pipeline flow starts from scanning the codebase files, passes through a series of agents including an orchestrator (`main.py`), a Knowledge Extractor subagent (`extractor_agent.py` not detailed here), formats the extracted knowledge (`formatter_agent.py`), and outputs the final `knowledge_base.md` document. Configuration relies heavily on environment variables for API keys, models, and operational parameters, ensuring flexible environment-driven setup. The pipeline supports concurrency, error handling with retries, caching, and fallback mechanisms to achieve robustness and completeness in documentation assembly.  
All factual descriptions are grounded in the source files `README.md`, `config.py`, `formatter_agent.py`, `knowledge_types.py`, and `main.py`, with exact evidence citations from their source line ranges.  
 
## Repository map

The repository includes the following key files:

- `README.md`  
- `config.py`  
- `formatter_agent.py`  
- `knowledge_types.py`  
- `main.py`  

## Cross-reference index

| Symbol                  | File           | Evidence                       |
|-------------------------|----------------|-------------------------------|
| `FileKnowledge` (class) | knowledge_types.py | knowledge_types.py:L5-L31      |
| `get_http_client`        | config.py      | config.py:L30-L42              |
| `_require_model_settings`| config.py      | config.py:L44-L51              |
| `get_llm`                | config.py      | config.py:L53-L80              |
| `get_embeddings`         | config.py      | config.py:L82-L92              |
| `get_vectordb`           | config.py      | config.py:L94-L101             |
| `SOURCE_SUFFIXES`        | main.py        | main.py:L8-L11                 |
| `SKIPPED_DIRECTORIES`    | main.py        | main.py:L12-L13                |
| `SKIPPED_FILES`          | main.py        | main.py:L14-L18                |
| `discover_source_files`  | main.py        | main.py:L21-L38                |
| `run_pipeline`           | main.py        | main.py:L41-L84                |
| `install_post_commit_hook`| main.py       | main.py:L87-L101               |
| `main`                   | main.py        | main.py:L104-L134              |
| `_clean_markdown`         | formatter_agent.py | formatter_agent.py:L52-L74    |
| `_estimate_size`          | formatter_agent.py | formatter_agent.py:L77-L92    |
| `_batch_records`          | formatter_agent.py | formatter_agent.py:L95-L118   |
| `_invoke_stream`          | formatter_agent.py | formatter_agent.py:L121-L138  |
| `_format_batch`           | formatter_agent.py | formatter_agent.py:L141-L179  |
| `_recursive_format`       | formatter_agent.py | formatter_agent.py:L182-L202  |
| `_fallback_batch`         | formatter_agent.py | formatter_agent.py:L205-L256  |
| `_repository_map`         | formatter_agent.py | formatter_agent.py:L259-L269  |
| `_cross_reference`        | formatter_agent.py | formatter_agent.py:L272-L288  |
| `_format_batches`         | formatter_agent.py | formatter_agent.py:L291-L330  |
| `format_knowledge_base`   | formatter_agent.py | formatter_agent.py:L333-L380  |

## Retrieval chunks

### File: README.md

#### Flows

- **Agent flow**: The pipeline processes files starting from codebase path, then passes through Orchestrator (`main.py`), Knowledge Extractor subagent (`extractor_agent.py`), generates FileKnowledge JSON records, runs Formatter subagent (`formatter_agent.py`), and finally produces `knowledge_base.md` as output.  
  _Evidence: README.md:L5-L14_

#### Configuration

- **.env required settings**: Required environment variables include `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL`, and `EMBEDDING_MODEL`. Optional variables include `OPENAI_TIMEOUT_SECONDS` (default 45 seconds) and `OKF_EXTRACTOR_WORKERS` (default 2).  
  _Evidence: README.md:L28-L41_

#### Evidence

- The pipeline is described as a file-path-based, source-grounded multi-agent documentation pipeline.  
  _Evidence: README.md:L1-L2_

#### Notes

- No explicit code symbols, dependencies, or design patterns are described beyond usage instructions.  
- Flows and configuration focus on pipeline structure and environment setup.  
- No scripts or command examples are provided.  

---

### File: config.py

#### Symbols

- `get_http_client()`: Returns a singleton `httpx.Client` configured with SSL verification, timeout, and connection limits, initialized with thread safety.  
  _Evidence: config.py:L30-L42_

- `_require_model_settings()`: Checks for required environment variables: `OPENAI_API_KEY`, `OPENAI_MODEL`, and `EMBEDDING_MODEL`. Raises `RuntimeError` if any are missing.  
  _Evidence: config.py:L44-L51_

- `get_llm()`: Lazily returns a singleton `ChatOpenAI` instance initialized with environment configs and a dedicated `httpx.Client`. Requires model settings.  
  _Evidence: config.py:L53-L80_

- `get_embeddings()`: Lazily returns a singleton `OpenAIEmbeddings` instance configured with environment settings and shared HTTP client.  
  _Evidence: config.py:L82-L92_

- `get_vectordb()`: Lazily returns a singleton `Chroma` vectorstore instance that uses persistent directory and the embedding function obtained from `get_embeddings()`.  
  _Evidence: config.py:L94-L101_

#### Dependencies

- `os`: Environment variables setup, path handling, directory creation.  
  _Evidence: config.py:L1-L26_

- `ssl`: Overrides HTTPS context creation to disable certificate verification.  
  _Evidence: config.py:L2-L7_

- `httpx`: For HTTP client creation and configuration.  
  _Evidence: config.py:L28-L42, L60-L75_

- `dotenv.load_dotenv`: Loads environment variables from `.env`.  
  _Evidence: config.py:L10-L12_

- `threading`: Provides `Lock` for singleton HTTP client thread safety.  
  _Evidence: config.py:L27, L29-L42_

- Dynamic imports of `ChatOpenAI`, `OpenAIEmbeddings`, and `Chroma` inside factory functions.  
  _Evidence: config.py:L64-L77, L85-L91, L97-L100_

#### Flows

- **HTTP Client Singleton Creation**: Lazily creates thread-safe, single `httpx.Client` with specified SSL verification and timeout.  
  _Evidence: config.py:L28-L42_

- **LLM Initialization**: Lazily creates a single ChatOpenAI client with HTTP client and environment settings.  
  _Evidence: config.py:L53-L80_

- **Embeddings Client Initialization**: Lazily creates OpenAIEmbeddings client with shared HTTP client.  
  _Evidence: config.py:L82-L92_

- **Vector Store Initialization**: Lazily creates Chroma vectorstore with persistence directory and embedding function.  
  _Evidence: config.py:L94-L101_

#### Patterns

- **Singleton Pattern**: HTTP client, LLM, embeddings client, and vectorstore are all instantiated once and cached globally.  
  _Evidence: config.py:L28-L42, L53-L80, L82-L92, L94-L101_

- **Lazy Initialization**: Dependent resources are imported and instantiated on-demand upon first use.  
  _Evidence: config.py:L53-L80, L82-L92, L94-L101_

- **Environment-driven Configuration**: Settings, secrets, and paths loaded from environment variables or `.env` file.  
  _Evidence: config.py:L10-L26, L53-L80_

#### Configuration

- Sets environment variables at module load for SSL/TLS behavior and telemetry disabling.  
  _Evidence: config.py:L2-L9_

- Defines and creates directories: upload folder, Tiktoken cache, model path, Chroma persistence directory.  
  _Evidence: config.py:L13-L26_

- Configures OpenAI client settings: API key, base URL adjustments, model names, timeout, retries, verification.  
  _Evidence: config.py:L19-L26, L53-L80_

- Defines Flask and JWT parameters including port, secret key, algorithm.  
  _Evidence: config.py:L24-L26_

#### Evidence

- Full environment variable and SSL setup snippet shown.  
  _Evidence: config.py:L1-L9_

- Load and prepare paths; create missing directories.  
  _Evidence: config.py:L10-L26_

- Adjusts base URL ending with `/v1`, obtains API keys and models from environment.  
  _Evidence: config.py:L19-L26_

- Defines singleton HTTP client with timeout, SSL checks, connection limits, thread-safe.  
  _Evidence: config.py:L28-L42_

- Runtime check for required model settings.  
  _Evidence: config.py:L44-L51_

- ChatOpenAI instantiation logic within a thread-safe lazily loaded getter.  
  _Evidence: config.py:L53-L80_

- OpenAIEmbeddings lazy getter, shared HTTP client.  
  _Evidence: config.py:L82-L92_

- Chroma vectorstore lazy getter using embeddings.  
  _Evidence: config.py:L94-L101_

#### Notes

- Dynamic imports inside functions only accessible after calls.  
- Absence of environment variables raises runtime errors during client creation.  
- Locking only around HTTP client creation; others use simple idempotent guards.

---

### File: formatter_agent.py

#### Symbols

- `_clean_markdown(text: str) -> str`: Cleans input Markdown by stripping whitespace, removing triple backticks, and trimming text before the first level-1 heading `# `.  
  _Evidence: formatter_agent.py:L52-L74_

- `_estimate_size(record: FileKnowledge) -> int`: Returns approximate size of a FileKnowledge record based on JSON string length for batching purposes.  
  _Evidence: formatter_agent.py:L77-L92_

- `_batch_records(records: list[FileKnowledge]) -> list[list[FileKnowledge]]`: Splits FileKnowledge records into batches each under `MAX_BATCH_CHARS` limit.  
  _Evidence: formatter_agent.py:L95-L118_

- `_invoke_stream(prompt: str) -> str`: Calls LLM to stream formatted output, fallback on synchronous invoke if streaming fails.  
  _Evidence: formatter_agent.py:L121-L138_

- `_format_batch(records: list[FileKnowledge], source_root: str, retries: int) -> str`: Formats a batch by calling LLM with retry logic; returns cleaned markdown or raises on invalid output.  
  _Evidence: formatter_agent.py:L141-L179_

- `_recursive_format(records: list[FileKnowledge], source_root: str, retries: int) -> str`: Recursively splits batch on failure and retries; raises exception on too small batch failure.  
  _Evidence: formatter_agent.py:L182-L202_

- `_fallback_batch(records: list[FileKnowledge]) -> str`: Deterministic fallback formatting which outputs simple markdown summary of each file’s attributes without LLM.  
  _Evidence: formatter_agent.py:L205-L256_

- `_repository_map(records: list[FileKnowledge]) -> str`: Generates markdown list of files and their languages.  
  _Evidence: formatter_agent.py:L259-L269_

- `_cross_reference(records: list[FileKnowledge]) -> str`: Creates a cross-reference index mapping symbols to their files with evidence citations.  
  _Evidence: formatter_agent.py:L272-L288_

- `_format_batches(batches: list[list[FileKnowledge]], source_root: str, retries: int) -> list[str]`: Formats batches in parallel threads, falls back on deterministic formatting for failures.  
  _Evidence: formatter_agent.py:L291-L330_

- `format_knowledge_base(records: list[FileKnowledge], source_root: str, retries: int|None = None) -> str`: Public API that formats all records into markdown knowledge base including repository map, cross-reference, chunks, retries, and timestamp.  
  _Evidence: formatter_agent.py:L333-L380_

#### Dependencies

- `json`: For serialization in size estimation and prompt generation.  
  _Evidence: formatter_agent.py:L9-L10, L77-L92, L141-L179_

- `sys`: For stderr printing on errors and flushing stdout.  
  _Evidence: formatter_agent.py:L12-L13, L158-L169, L315-L324_

- `time`: Used to sleep between retry attempts on failure.  
  _Evidence: formatter_agent.py:L14-L15, L165-L168_

- `concurrent.futures.ThreadPoolExecutor`: Runs batch formatting calls in multiple threads.  
  _Evidence: formatter_agent.py:L16-L18, L291-L330_

- `datetime`: Appends generation timestamp to final markdown output.  
  _Evidence: formatter_agent.py:L19-L20, L375-L379_

- `config` (access to `OPENAI_MAX_RETRIES`, `OPENAI_RETRY_DELAY_SECONDS`, `get_llm`): Controls retry count, retry delay, and obtains LLM client.  
  _Evidence: formatter_agent.py:L22-L29, L121-L138, L141-L179, L333-L380_

- `knowledge_types.FileKnowledge`: Data type representing knowledge records.  
  _Evidence: formatter_agent.py:L31-L32, L77-L92, L95-L118, L141-L179_

#### Flows

- **Batch Formatting and Retry**: Input FileKnowledge records are batched by approximate JSON size, formatted via LLM with retries, recursively split on failure, and fall back to deterministic formatting if needed.  
  _Evidence: formatter_agent.py:L77-L118, L141-L179, L182-L202, L291-L330_

- **Parallel Batch Formatting**: Batches are formatted concurrently with threads; on batch failure fallback formatting ensures output completeness.  
  _Evidence: formatter_agent.py:L291-L330_

- **Knowledge Base Markdown Generation**: After formatting batches, repository map, cross-reference, assistant Q&A anchors, and timestamps are appended to produce the final document.  
  _Evidence: formatter_agent.py:L333-L380_

#### Patterns

- **Batching by Approximate JSON Size**: Groups files by combined JSON-serialized size within a character limit to control LLM input prompt size.  
  _Evidence: formatter_agent.py:L77-L118_

- **Retry with Exponential Backoff**: Retry logic uses increasing sleep intervals between attempts before raising exceptions.  
  _Evidence: formatter_agent.py:L141-L179_

- **Recursive Divide and Conquer on Failure**: On failure, splits batches recursively into halves trying to isolate errors.  
  _Evidence: formatter_agent.py:L182-L202_

- **Fallback Deterministic Formatting**: When LLM-based formatting fails irrecoverably, a deterministic plain markdown formatter enumerates file details.  
  _Evidence: formatter_agent.py:L205-L256, L315-L324_

#### Configuration

- `MAX_BATCH_CHARS` (default 50,000): Controls max prompt size per formatter batch.  
  _Evidence: formatter_agent.py:L37-L40_

- `FORMATTER_WORKERS` (default 3): Number of parallel threads for formatting.  
  _Evidence: formatter_agent.py:L42-L45_

- `OPENAI_MAX_RETRIES`: Number of retries allowed for LLM formatting calls.  
  _Evidence: formatter_agent.py:L27, L333-L342_

- `OPENAI_RETRY_DELAY_SECONDS`: Delay between retry attempts in seconds multiplied by attempt count.  
  _Evidence: formatter_agent.py:L28, L165-L168_

#### Evidence

- Setup includes constants, imports, `_clean_markdown` cleaning function.  
  _Evidence: formatter_agent.py:L10-L55_

- Size estimation and batching by prompt size thresholds.  
  _Evidence: formatter_agent.py:L77-L118_

- LLM streaming invocation with fallback to invocation without streaming.  
  _Evidence: formatter_agent.py:L121-L138_

- Batch formatting with retry logic, raising exceptions on invalid output.  
  _Evidence: formatter_agent.py:L141-L179_

- Recursive formatting to isolate batch formatting errors.  
  _Evidence: formatter_agent.py:L182-L202_

- Plain markdown fallback produces file details summary deterministically.  
  _Evidence: formatter_agent.py:L205-L256_

- Repository map (file list) and cross-reference (symbols indexed to files) markdown generation.  
  _Evidence: formatter_agent.py:L259-L288_

- Parallel batch formatting and fallback handling.  
  _Evidence: formatter_agent.py:L291-L330_

- Final knowledge base assembly with timestamp and metadata.  
  _Evidence: formatter_agent.py:L333-L380_

#### Notes

- The formatter treats FileKnowledge strictly as data and does not interpret code or doc comments.  
- Batch formatting includes retry with backoff and recursive splits, but small batch failures raise exceptions.  
- Fallback formatting uses simpler markdown without evidence citations.  
- Parallel formatting uses thread pool sized by configuration variable.

---

### File: knowledge_types.py

#### Symbols

- `FileKnowledge` (class): Represents source-grounded knowledge for exactly one file. Contains fields:
  - `path`: file path string  
  - `language`: programming language string  
  - `symbols`, `dependencies`, `flows`, `patterns`, `configuration`, `evidence`: lists of dict objects (default empty lists)  
  - `notes`: list of strings (default empty list)  
  The class provides a `to_dict()` method returning a dictionary representation.  
  _Evidence: knowledge_types.py:L5-L31_

#### Dependencies

- `dataclasses`: For `dataclass`, `asdict`, and `field` to define and manage data class fields.  
  _Evidence: knowledge_types.py:L3-L4_

- `typing`: Uses `Any` type hinting for list elements.  
  _Evidence: knowledge_types.py:L5_

- `__future__.annotations`: Enables postponed evaluation of annotations.  
  _Evidence: knowledge_types.py:L2_

#### Evidence

- File header and full class definition for `FileKnowledge`.  
  _Evidence: knowledge_types.py:L1-L31_

#### Notes

- `FileKnowledge` focuses on data storage and conversion without behavioral methods.  
- All list fields default to empty lists except path and language, which are required.

---

### File: main.py

#### Symbols

- `SOURCE_SUFFIXES` (set): Supported source file suffixes for discovery includes `.py`, `.md`, `.json`, `.csv`, `.cpp`, `.hpp`, `.c`, `.h`, and `.txt`.  
  _Evidence: main.py:L8-L11_

- `SKIPPED_DIRECTORIES` (set): Directory names to skip during discovery include `.git` and `__pycache__`.  
  _Evidence: main.py:L12-L13_

- `SKIPPED_FILES` (set): File names to skip include `.gitignore`, `.gitattributes`, `.editorconfig`, `LICENSE`, `README.md`, `Makefile`.  
  _Evidence: main.py:L14-L18_

- `discover_source_files(root: Path) -> list[Path]`: Traverses the root directory, recursively finds files excluding skipped directories and files and filters by `SOURCE_SUFFIXES`.  
  _Evidence: main.py:L21-L38_

- `run_pipeline(root: Path, output: Path, workers: int = 3, retries: int = 3) -> Path`: Runs the entire pipeline — discovers source files, runs extraction on each in parallel with retries, formats knowledge base markdown, writes output, and returns output path.  
  _Evidence: main.py:L41-L84_

- `install_post_commit_hook(repository: Path, script: Path) -> Path`: Installs a Git post-commit hook by writing a shell script to `.git/hooks/post-commit` and making it executable (errors on Windows ignored).  
  _Evidence: main.py:L87-L101_

- `main() -> None`: Command-line interface entry point; handles arguments, installs hooks, runs pipeline (foreground or background), and prints progress.  
  _Evidence: main.py:L104-L134_

#### Dependencies

- `argparse`: Command-line argument parsing in `main()`.  
  _Evidence: main.py:L5, L104-L134_

- `os`: Environment and path operations, setting environment variables for concurrency.  
  _Evidence: main.py:L6, L109, L121_

- `subprocess`: Spawn background subprocess when running pipeline in background mode.  
  _Evidence: main.py:L7, L124-L126_

- `sys`: Used for error printing, handling Python executable path, and process exits.  
  _Evidence: main.py:L8, L60-L62, L88, L122_

- `concurrent.futures.ThreadPoolExecutor`: Concurrent extraction across source files.  
  _Evidence: main.py:L9, L54-L66_

- `pathlib.Path`: File and directory path manipulation throughout.  
  _Evidence: main.py:L10, L21-L38, L41-L84, L87-L101, L104-L134_

- `extractor_agent.extract_file`: Extraction function called per source file with retries.  
  _Evidence: main.py:L12, L56_

- `formatter_agent.format_knowledge_base`: Used to convert extraction results into Markdown format.  
  _Evidence: main.py:L13, L76_

- `knowledge_types.FileKnowledge`: Data type representing extraction results.  
  _Evidence: main.py:L14, L46, L50_

#### Flows

- **Extraction pipeline flow**: Discover source files, run concurrent extraction tasks with retries per file, gather results, format as Markdown knowledge base, write output, and report any failures.  
  _Evidence: main.py:L41-L84_

- **Command-line interface flow**: Parses CLI arguments, optionally installs Git hook, runs pipeline foreground or background, prints status.  
  _Evidence: main.py:L104-L134_

#### Patterns

- **Directory and filename skipping**: Use of predefined filename and directory skip sets to filter source files during discovery.  
  _Evidence: main.py:L21-L38_

- **Concurrent extraction using ThreadPoolExecutor**: Concurrent submission of file extraction jobs; the retry mechanism is handled by `extract_file` itself.  
  _Evidence: main.py:L54-L66_

- **Background execution using subprocess.Popen**: Runs pipeline as detached background process if requested, silencing its output.  
  _Evidence: main.py:L120-L127_

#### Configuration

- Uses `OKF_EXTRACTOR_WORKERS` environment variable to control number of threads for extraction tasks (default 3).  
  _Evidence: main.py:L111_

- Uses `OPENAI_MAX_RETRIES` to limit per-file retry attempts before skipping (default 3).  
  _Evidence: main.py:L112_

- Supports command-line arguments:  
  - `--path` (required): source root path  
  - `--output` (optional, defaults to `knowledge_base.md` in the source root)  
  - `--workers` (optional)  
  - `--retries` (optional)  
  - `--background` flag  
  - `--install-hook` flag  
  _Evidence: main.py:L105-L113_

#### Evidence

- Sets of suffixes, directories, and files to skip during discovery.  
  _Evidence: main.py:L8-L18_

- Source file discovery implementation excludes skipped items and filters suffix.  
  _Evidence: main.py:L21-L38_

- Main pipeline runs concurrent extraction and formatting producing output file.  
  _Evidence: main.py:L41-L84_

- Post-commit hook installs by writing file and setting executable bit.  
  _Evidence: main.py:L87-L101_

- CLI parses flags and controls pipeline execution mode.  
  _Evidence: main.py:L104-L134_

#### Notes

- Extraction retry per file encapsulated by `extract_file`; not explicitly controlled in pipeline code.  
- Post-commit hook expects POSIX environment; Windows errors ignored on `chmod`.  
- Background execution detaches with no visible output or progress in original process.

---

## Assistant Q&A anchors

*(None supplied in the source)*

## Known evidence gaps

*(None explicitly noted in the source)*

## Assistant Q&A anchors

### How is the repository structured?

The repository contains **5** documented source files.

## Known evidence gaps

Only gaps explicitly reported by extractor agents are included.

<!-- Generated by OKF at 2026-08-07T10:35:05.233420+00:00 -->

## Files not documented
- `extractor_agent.py: JSONDecodeError: Expecting ',' delimiter: line 108 column 5 (char 8724)`
