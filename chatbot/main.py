"""OKF Orchestrator: discover source files, dispatch extractors, write Markdown."""
from __future__ import annotations

import argparse
import os
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from extractor_agent import extract_file
from formatter_agent import format_knowledge_base
from knowledge_types import FileKnowledge

SOURCE_SUFFIXES = {
    ".py", ".js", ".jsx", ".ts", ".tsx", ".java", ".kt", ".go", ".rs", ".c", ".h", ".cpp", ".hpp",
    ".cs", ".rb", ".php", ".swift", ".scala", ".sh", ".ps1", ".sql", ".html", ".css", ".scss", ".vue",
    ".svelte", ".json", ".yaml", ".yml", ".toml", ".xml", ".ini", ".cfg", ".md",
}
SKIPPED_DIRECTORIES = {".git", ".venv", "venv", "node_modules", "__pycache__", ".next", "dist", "build", ".idea", ".vscode", "chroma_defects", ".tiktoken_cache"}
SKIPPED_FILES = {
    "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "Pipfile.lock", "poetry.lock",
    "composer.lock", "Cargo.lock", "knowledge_base.md", "defect_reports.db"
}


def discover_source_files(root: Path) -> list[Path]:
    """Discover repository source files while avoiding generated/vendor content."""
    res = []
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        rel_parts = path.relative_to(root).parts
        if any(part in SKIPPED_DIRECTORIES for part in rel_parts):
            continue
        filename = path.name.lower()
        if filename in SKIPPED_FILES or filename.endswith(".min.js") or filename.endswith(".min.css") or filename.endswith(".map"):
            continue
        if path.suffix.lower() in SOURCE_SUFFIXES:
            res.append(path)
    return sorted(res)


def run_pipeline(root: Path, output: Path, workers: int = 3, retries: int = 3) -> Path:
    root, output = root.resolve(), output.resolve()
    if not root.is_dir():
        raise NotADirectoryError(f"Source path is not a directory: {root}")
    files = discover_source_files(root)
    if not files:
        raise ValueError(f"No supported source files found beneath {root}")

    records: list[FileKnowledge] = []
    failures: list[str] = []
    total_files = len(files)
    completed_count = 0

    print(f"Starting extraction for {total_files} file(s) with {workers} worker(s), retries={retries}...", flush=True)

    # Each dispatched task is one Knowledge Extractor subagent invocation.
    with ThreadPoolExecutor(max_workers=max(1, workers), thread_name_prefix="extractor") as pool:
        futures = {pool.submit(extract_file, path, root, retries): path for path in files}
        for future in as_completed(futures):
            path = futures[future]
            completed_count += 1
            try:
                records.append(future.result())
                print(f"[{completed_count}/{total_files}] Extracted: {path.relative_to(root)}", flush=True)
            except Exception as exc:
                failures.append(f"{path.relative_to(root)}: {type(exc).__name__}: {exc}")
                print(f"[{completed_count}/{total_files}] Skipped: {failures[-1]}", file=sys.stderr, flush=True)
    if not records:
        raise RuntimeError("No FileKnowledge records were produced. " + " | ".join(failures))

    records.sort(key=lambda item: item.path)
    markdown = format_knowledge_base(records, str(root), retries=retries)
    if failures:
        markdown += "\n\n## Files not documented\n" + "\n".join(f"- `{failure}`" for failure in failures) + "\n"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(markdown, encoding="utf-8")
    return output


def install_post_commit_hook(repository: Path, script: Path) -> Path:
    git_dir = repository / ".git"
    if not git_dir.is_dir():
        raise ValueError(f"Not a Git worktree: {repository}")
    hook = git_dir / "hooks" / "post-commit"
    command = f'"{sys.executable}" "{script}" --path "$PWD" --output "$PWD/knowledge_base.md" --background\n'
    hook.write_text("#!/bin/sh\n# Auto-generated OKF documentation hook.\n" + command, encoding="utf-8")
    try:
        hook.chmod(hook.stat().st_mode | 0o111)
    except OSError:  # Windows Git invokes the hook without POSIX executable bits.
        pass
    return hook


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate source-grounded RAG Markdown with the OKF agent system.")
    parser.add_argument("--path", required=True, type=Path, help="Repository or codebase directory")
    parser.add_argument("--output", type=Path, default=None, help="Markdown artifact path (default: <path>/knowledge_base.md)")
    parser.add_argument("--workers", type=int, default=int(os.getenv("OKF_EXTRACTOR_WORKERS", "3")), help="Number of parallel thread workers (default: 3)")
    parser.add_argument("--retries", type=int, default=int(os.getenv("OPENAI_MAX_RETRIES", "3")), help="Maximum retries per file before skipping (default: 3)")
    parser.add_argument("--background", action="store_true", help="Detach pipeline execution; used by the Git hook")
    parser.add_argument("--run", action="store_true", help=argparse.SUPPRESS)
    parser.add_argument("--install-hook", action="store_true", help="Install a post-commit hook in --path")
    args = parser.parse_args()
    root = args.path.resolve()
    output = (args.output or root / "knowledge_base.md").resolve()

    if args.install_hook:
        print(f"Installed: {install_post_commit_hook(root, Path(__file__).resolve())}")
        return
    if args.background and not args.run:
        command = [sys.executable, str(Path(__file__).resolve()), "--path", str(root), "--output", str(output), "--workers", str(args.workers), "--retries", str(args.retries), "--run"]
        subprocess.Popen(command, cwd=root, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                         start_new_session=True)
        print(f"OKF generation started in background: {output}")
        return
    artifact = run_pipeline(root, output, args.workers, args.retries)
    print(f"Knowledge base written: {artifact}")


if __name__ == "__main__":
    main()
