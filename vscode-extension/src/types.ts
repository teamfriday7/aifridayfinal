export type Severity = "critical" | "high" | "medium" | "low" | "info";

export type FindingStatus = "open" | "accepted" | "rejected" | "ignored";

export interface Finding {
  id?: string;
  severity: Severity;
  title: string;
  message: string;
  suggestion: string;
  replacementCode?: string;
  originalCode?: string;
  ruleId?: string;
  explanation?: string;
  file?: string;
  line?: number;
  source: "local" | "be";
  status?: FindingStatus;
}

export interface AnalysisRequest {
  repositoryPath: string;
  commit: string;
  diff: string;
  files: string[];
  localFindings: Finding[];
  targetRef?: string;
}

export interface AnalysisResponse {
  suggestions: Finding[];
  summary?: string;
}

export interface RewriteRequest {
  finding: Finding;
  repositoryPath?: string;
  instruction?: string;
  originalSnippet?: string;
}

export interface RewriteResponse {
  replacementCode: string;
  explanation: string;
}

export interface ExplainRequest {
  finding: Finding;
  contextSnippet?: string;
}

export interface ExplainResponse {
  explanation: string;
  owaspReference?: string;
  remediationSteps?: string[];
}

export interface ReviewSession {
  id: string;
  timestamp: string;
  repositoryPath: string;
  commit: string;
  targetRef?: string;
  mode: "pre-commit" | "pre-push" | "on-demand";
  findings: Finding[];
  summary: string;
  passed: boolean;
}

export interface ChangedFileItem {
  filePath: string;
  staged: boolean;
  unpushed: boolean;
  findingCount: number;
  hasBlocking: boolean;
}
