import { AnalysisRequest, AnalysisResponse, ExplainRequest, ExplainResponse, RewriteRequest, RewriteResponse } from "./types";

export async function analyzeWithBackend(baseUrl: string, token: string, request: AnalysisRequest): Promise<AnalysisResponse | undefined> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/extension/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "X-CodeGuardian-Token": token } : {})
      },
      body: JSON.stringify({ ...request, diff: request.diff.slice(0, 60_000) }),
      signal: controller.signal
    });
    if (!response.ok) return undefined;
    return (await response.json()) as AnalysisResponse;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timeout);
  }
}

export async function rewriteWithBackend(baseUrl: string, token: string, request: RewriteRequest): Promise<RewriteResponse | undefined> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/extension/rewrite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "X-CodeGuardian-Token": token } : {})
      },
      body: JSON.stringify(request),
      signal: controller.signal
    });
    if (!response.ok) return undefined;
    return (await response.json()) as RewriteResponse;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timeout);
  }
}

export async function explainWithBackend(baseUrl: string, token: string, request: ExplainRequest): Promise<ExplainResponse | undefined> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/extension/explain`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "X-CodeGuardian-Token": token } : {})
      },
      body: JSON.stringify(request),
      signal: controller.signal
    });
    if (!response.ok) return undefined;
    return (await response.json()) as ExplainResponse;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timeout);
  }
}
