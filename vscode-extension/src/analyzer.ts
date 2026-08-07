import { Finding, Severity } from "./types";

interface Rule {
  pattern: RegExp;
  severity: Severity;
  title: string;
  message: string;
  suggestion: string;
}

const RULES: Rule[] = [
  {
    pattern: /(?:api[_-]?key|secret|password|token)\s*[:=]\s*["'][^"']{6,}["']/i,
    severity: "high",
    title: "Possible hard-coded credential",
    message: "The added line appears to contain a credential in source code.",
    suggestion: "Move the value to a secret manager or environment variable, then rotate the exposed value."
  },
  {
    pattern: /verify\s*=\s*False|rejectUnauthorized\s*:\s*false|NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*["']?0/i,
    severity: "high",
    title: "TLS certificate verification disabled",
    message: "The change disables certificate validation.",
    suggestion: "Use the trusted CA bundle instead of disabling TLS verification."
  },
  {
    pattern: /\beval\s*\(|\bexec\s*\(/,
    severity: "high",
    title: "Dynamic code execution",
    message: "Dynamic evaluation can execute untrusted input.",
    suggestion: "Replace dynamic execution with a typed allow-list or a safe parser."
  },
  {
    pattern: /except\s*:\s*pass|catch\s*\([^)]*\)\s*\{\s*\}/,
    severity: "medium",
    title: "Exception is silently ignored",
    message: "The change discards failures without logging or recovery.",
    suggestion: "Catch a specific error, log safe context, and either recover or rethrow."
  },
  {
    pattern: /console\.log\(|\bprint\(/,
    severity: "low",
    title: "Debug output added",
    message: "Debug output can leak data and make production logs noisy.",
    suggestion: "Use the project logger with an appropriate level, or remove the statement."
  },
  {
    pattern: /\bTODO\b|\bFIXME\b/i,
    severity: "info",
    title: "Follow-up work remains",
    message: "The change includes a TODO or FIXME marker.",
    suggestion: "Create a tracked issue with an owner and due date, or finish the work before merge."
  }
];

/** Analyze only added lines so existing legacy code does not create new push noise. */
export function analyzeDiff(diff: string): Finding[] {
  const findings: Finding[] = [];
  let currentFile: string | undefined;
  let currentLine: number | undefined;

  for (const line of diff.split(/\r?\n/)) {
    if (line.startsWith("+++ b/")) {
      currentFile = line.slice(6);
      continue;
    }
Replace dynamic execution with a typed allow-list or a safe parser.
    if (hunk) {
      currentLine = Number(hunk[1]);
      continue;
    }
    if (!line.startsWith("+") || line.startsWith("+++")) {
      continue;
    }

    const added = line.slice(1);
    for (const rule of RULES) {
      if (rule.pattern.test(added)) {
        findings.push({ ...rule, file: currentFile, line: currentLine, source: "local" });
      }
    }
    if (currentLine !== undefined) {
      currentLine += 1;
    }
  }
  return dedupe(findings);
}

export function dedupe(findings: Finding[]): Finding[] {
  const seen = new Set<string>();
  return findings.filter((finding) => {
    const key = `${finding.title}:${finding.file ?? ""}:${finding.line ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function hasBlockingFinding(findings: Finding[]): boolean {
  return findings.some((finding) => finding.severity === "high" || finding.severity === "critical");
}
