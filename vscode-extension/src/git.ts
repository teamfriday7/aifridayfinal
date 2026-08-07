import { execFile } from "child_process";
import * as fs from "fs/promises";
import * as path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export async function git(root: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", ["-C", root, ...args], { maxBuffer: 10 * 1024 * 1024 });
  return stdout.trim();
}

/** Automatically discovers top-level Git repository root for monorepos or subdirectories */
export async function findGitRoot(startDir: string): Promise<string> {
  try {
    const root = await git(startDir, ["rev-parse", "--show-toplevel"]);
    return root || startDir;
  } catch {
    return startDir;
  }
}

export async function latestCommit(root: string): Promise<string> {
  const repoRoot = await findGitRoot(root);
  return git(repoRoot, ["rev-parse", "HEAD"]);
}

export async function latestCommitDiff(root: string): Promise<string> {
  const repoRoot = await findGitRoot(root);
  try {
    return await git(repoRoot, ["diff", "--unified=0", "HEAD~1", "HEAD"]);
  } catch {
    return git(repoRoot, ["show", "--format=", "--unified=0", "HEAD"]);
  }
}

export async function stagedDiff(root: string): Promise<string> {
  const repoRoot = await findGitRoot(root);
  try {
    return await git(repoRoot, ["diff", "--cached", "--unified=0"]);
  } catch {
    return "";
  }
}

export async function unpushedDiff(root: string): Promise<string> {
  const repoRoot = await findGitRoot(root);
  try {
    const upstream = await git(repoRoot, ["rev-parse", "--abbrev-ref", "@{u}"]);
    if (upstream) {
      return await git(repoRoot, ["diff", "--unified=0", `${upstream}..HEAD`]);
    }
  } catch {
    // Fall back to latest commit diff if no upstream configured
  }
  return latestCommitDiff(repoRoot);
}

export function filesInDiff(diff: string): string[] {
  const files = new Set<string>();
  for (const line of diff.split(/\r?\n/)) {
    if (line.startsWith("+++ b/")) {
      files.add(line.slice(6));
    }
  }
  return Array.from(files);
}

export async function applyPatchToFile(
  root: string,
  relativeFilePath: string,
  line: number | undefined,
  originalCode: string | undefined,
  replacementCode: string
): Promise<boolean> {
  const repoRoot = await findGitRoot(root);
  const fullPath = path.isAbsolute(relativeFilePath) ? relativeFilePath : path.join(repoRoot, relativeFilePath);
  try {
    const content = await fs.readFile(fullPath, "utf8");
    const eol = content.includes("\r\n") ? "\r\n" : "\n";
    const lines = content.split(/\r?\n/);

    if (line !== undefined && line > 0 && line <= lines.length) {
      lines[line - 1] = replacementCode;
      await fs.writeFile(fullPath, lines.join(eol), "utf8");
      return true;
    } else if (originalCode && content.includes(originalCode)) {
      const updated = content.replace(originalCode, replacementCode);
      await fs.writeFile(fullPath, updated, "utf8");
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
