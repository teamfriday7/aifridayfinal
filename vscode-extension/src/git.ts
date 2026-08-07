import { execFile } from "child_process";
import * as fs from "fs/promises";
import * as path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export async function git(root: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", ["-C", root, ...args], { maxBuffer: 5 * 1024 * 1024 });
  return stdout.trim();
}

export async function latestCommit(root: string): Promise<string> {
  return git(root, ["rev-parse", "HEAD"]);
}

export async function latestCommitDiff(root: string): Promise<string> {
  try {
    return await git(root, ["diff", "--unified=0", "HEAD~1", "HEAD"]);
  } catch {
    return git(root, ["show", "--format=", "--unified=0", "HEAD"]);
  }
}

export async function stagedDiff(root: string): Promise<string> {
  try {
    return await git(root, ["diff", "--cached", "--unified=0"]);
  } catch {
    return "";
  }
}

export async function unpushedDiff(root: string): Promise<string> {
  try {
    const upstream = await git(root, ["rev-parse", "--abbrev-ref", "@{u}"]);
    if (upstream) {
      return await git(root, ["diff", "--unified=0", `${upstream}..HEAD`]);
    }
  } catch {
    // Fallback to comparing HEAD~1
  }
  return latestCommitDiff(root);
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
  const fullPath = path.isAbsolute(relativeFilePath) ? relativeFilePath : path.join(root, relativeFilePath);
  try {
    const content = await fs.readFile(fullPath, "utf8");
    const lines = content.split(/\r?\n/);

    if (line !== undefined && line > 0 && line <= lines.length) {
      lines[line - 1] = replacementCode;
    } else if (originalCode && content.includes(originalCode)) {
      const updated = content.replace(originalCode, replacementCode);
      await fs.writeFile(fullPath, updated, "utf8");
      return true;
    } else {
      return false;
    }

    await fs.writeFile(fullPath, lines.join("\n"), "utf8");
    return true;
  } catch {
    return false;
  }
}
