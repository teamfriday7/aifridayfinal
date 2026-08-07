import { Finding, Severity } from "./types";

interface Rule {
  id: string;
  pattern: RegExp;
  severity: Severity;
  title: string;
  message: string;
  suggestion: string;
  languages?: string[];
}

const RULES: Rule[] = [
  // Secrets & Hardcoded Credentials
  {
    id: "sec-hardcoded-secret",
    pattern: /(?:api[_-]?key|secret|password|passwd|private[_-]?key|access[_-]?key)\s*[:=]\s*["'][^"']{8,}["']/i,
    severity: "critical",
    title: "Hard-coded Secret / Credential",
    message: "The change adds what appears to be an unencrypted secret or API key.",
    suggestion: "Move secret to environment variables or secret manager (e.g. process.env or os.getenv). Rotate the credential immediately."
  },
  {
    id: "sec-jwt-hardcoded",
    pattern: /eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.[A-Za-z0-9-_.+/=]+/,
    severity: "critical",
    title: "Hard-coded JWT Token",
    message: "A raw JSON Web Token was found hardcoded in the diff.",
    suggestion: "Remove hardcoded JWT tokens from source code and load dynamically at runtime."
  },

  // Security & TLS
  {
    id: "sec-disabled-tls",
    pattern: /\b(rejectUnauthorized\s*:\s*false|NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*["']?0|InsecureSkipVerify\s*:\s*true|TrustAllManager)\b/i,
    severity: "high",
    title: "TLS Verification Disabled",
    message: "Certificate verification has been explicitly disabled, exposing network traffic to MITM attacks.",
    suggestion: "Re-enable TLS verification and configure trusted Root CA bundles."
  },

  // Injection Attacks
  {
    id: "sec-sql-injection",
    pattern: /(?:\bSELECT\b.+\+|\bINSERT\b.+\+|\bUPDATE\b.+\+|f["'].*\bSELECT\b).*(?:FROM|WHERE|INTO)/i,
    severity: "high",
    title: "Potential SQL Injection",
    message: "Dynamic string concatenation in SQL query detected.",
    suggestion: "Use parameterized queries or prepared statements instead of string concatenation."
  },
  {
    id: "sec-cmd-injection",
    pattern: /\b(subprocess\.run\([^)]*shell\s*=\s*True|os\.system\(|child_process\.exec\(|Runtime\.getRuntime\(\)\.exec\(|exec\.Command\("sh",\s*"-c"\))\b/,
    severity: "high",
    title: "Unsafe Command Execution",
    message: "Executing shell commands dynamically can lead to command injection if user input is passed.",
    suggestion: "Avoid passing raw shell strings. Pass arguments as an array and validate inputs."
  },
  {
    id: "sec-xss-html-inject",
    pattern: /(?:\.innerHTML\s*=|dangerouslySetInnerHTML\s*=|v-html\s*=)/,
    severity: "medium",
    title: "DOM / HTML Injection Surface",
    message: "Directly rendering untrusted HTML into the DOM opens XSS vulnerabilities.",
    suggestion: "Use DOMPurify or framework text bindings (e.g. textContent or standard React JSX) to sanitize output."
  },

  // Dynamic Code & Deserialization
  {
    id: "sec-eval-exec",
    pattern: /\beval\s*\([^\)]+\)|\bexec\s*\([^\)]+\)|pickle\.loads\(|yaml\.load\([^,)]*\)/,
    severity: "high",
    title: "Dynamic Code Evaluation / Unsafe Deserialization",
    message: "Dynamic code execution or unsafe object deserialization detected.",
    suggestion: "Use safe JSON parsers or yaml.safe_load, and eliminate dynamic code evaluation."
  },

  // Error Handling & Reliability
  {
    id: "qual-silent-catch",
    pattern: /except\s*:\s*pass|catch\s*\([^)]*\)\s*\{\s*\}|panic\(err\)/,
    severity: "medium",
    title: "Silent Failure / Swallowed Exception",
    message: "Exceptions are caught and discarded without logging or recovery logic.",
    suggestion: "Log error context using a structured logger and handle or re-throw the error."
  }
];

const MAX_DIFF_LENGTH = 100_000;

/** Files that define analyzer rules or test runners should be excluded from self-referential false positives */
function isAnalyzerOrMetaFile(filePath?: string): boolean {
  if (!filePath) return false;
  const normalized = filePath.replace(/\\/g, "/").toLowerCase();
  return (
    normalized.includes("analyzer.ts") ||
    normalized.includes("pre-commit-runner.ts") ||
    normalized.includes("pre-push-runner.ts") ||
    normalized.includes("scratch/") ||
    normalized.includes("test_") ||
    normalized.includes(".test.") ||
    normalized.includes(".spec.")
  );
}

/** Lines containing rule definitions, regex patterns, or comments should be ignored */
function isMetaOrCommentLine(line: string): boolean {
  const trimmed = line.trim();
  if (
    trimmed.startsWith("//") ||
    trimmed.startsWith("#") ||
    trimmed.startsWith("/*") ||
    trimmed.startsWith("*") ||
    trimmed.includes("pattern:") ||
    trimmed.includes("re.compile") ||
    trimmed.includes("RULES =") ||
    trimmed.includes("rules =") ||
    trimmed.includes("test_endpoint")
  ) {
    return true;
  }
  return false;
}

/** Analyze added lines in diffs across JavaScript, TypeScript, Python, React, Java, Go, C++, etc. */
export function analyzeDiff(diff: string): Finding[] {
  if (!diff) return [];
  const safeDiff = diff.length > MAX_DIFF_LENGTH ? diff.slice(0, MAX_DIFF_LENGTH) : diff;

  const findings: Finding[] = [];
  let currentFile: string | undefined;
  let currentLine: number | undefined;

  for (const line of safeDiff.split(/\r?\n/)) {
    if (line.startsWith("+++ b/")) {
      currentFile = line.slice(6);
      continue;
    }
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)/.exec(line);
    if (hunk) {
      currentLine = Number(hunk[1]);
      continue;
    }
    if (!line.startsWith("+") || line.startsWith("+++")) {
      continue;
    }

    const added = line.slice(1);

    // Skip analyzer files or meta/rule definition lines to avoid false positives
    if (isAnalyzerOrMetaFile(currentFile) || isMetaOrCommentLine(added)) {
      if (currentLine !== undefined) currentLine += 1;
      continue;
    }

    for (const rule of RULES) {
      if (rule.pattern.test(added)) {
        findings.push({
          id: `${rule.id}:${currentFile ?? "file"}:${currentLine ?? 0}`,
          severity: rule.severity,
          title: rule.title,
          message: rule.message,
          suggestion: rule.suggestion,
          originalCode: added.trim(),
          ruleId: rule.id,
          file: currentFile,
          line: currentLine,
          source: "local"
        });
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
    // Deduplicate by file and line so local and backend findings on the same line do not double count
    const key = `${finding.file ?? ""}:${finding.line ?? 0}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function hasBlockingFinding(findings: Finding[]): boolean {
  return findings.some((finding) => finding.severity === "high" || finding.severity === "critical");
}
