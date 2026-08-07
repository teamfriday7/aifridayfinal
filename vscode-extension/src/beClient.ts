import {
  AnalysisRequest,
  AnalysisResponse,
  ChatRequest,
  ChatResponse,
  ExplainRequest,
  ExplainResponse,
  RewriteRequest,
  RewriteResponse
} from "./types";

const PORTS_TO_PROBE = [8010, 8015, 8000, 8080, 8011];

/** Discovers active backend URL by probing common ports if primary configured URL fails */
async function resolveActiveBaseUrl(configuredUrl: string): Promise<string> {
  const cleanUrl = configuredUrl.replace(/\/$/, "");
  if (await pingHealth(cleanUrl)) {
    return cleanUrl;
  }
  for (const port of PORTS_TO_PROBE) {
    const candidate = `http://127.0.0.1:${port}`;
    if (await pingHealth(candidate)) {
      return candidate;
    }
  }
  return cleanUrl;
}

async function pingHealth(baseUrl: string): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(1_000) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function analyzeWithBackend(
  baseUrl: string,
  token: string,
  request: AnalysisRequest,
  apiKey?: string
): Promise<AnalysisResponse | undefined> {
  const activeUrl = await resolveActiveBaseUrl(baseUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6_000);
  try {
    const response = await fetch(`${activeUrl}/api/extension/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "X-CodeGuardian-Token": token } : {}),
        ...(apiKey ? { "X-CodeGuardian-ApiKey": apiKey } : {})
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

export async function rewriteWithBackend(
  baseUrl: string,
  token: string,
  request: RewriteRequest,
  apiKey?: string
): Promise<RewriteResponse | undefined> {
  const activeUrl = await resolveActiveBaseUrl(baseUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(`${activeUrl}/api/extension/rewrite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "X-CodeGuardian-Token": token } : {}),
        ...(apiKey ? { "X-CodeGuardian-ApiKey": apiKey } : {})
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

export async function explainWithBackend(
  baseUrl: string,
  token: string,
  request: ExplainRequest,
  apiKey?: string
): Promise<ExplainResponse | undefined> {
  const activeUrl = await resolveActiveBaseUrl(baseUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(`${activeUrl}/api/extension/explain`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "X-CodeGuardian-Token": token } : {}),
        ...(apiKey ? { "X-CodeGuardian-ApiKey": apiKey } : {})
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

export async function chatWithBackend(
  baseUrl: string,
  token: string,
  request: ChatRequest,
  apiKey?: string
): Promise<ChatResponse | undefined> {
  const activeUrl = await resolveActiveBaseUrl(baseUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(`${activeUrl}/api/extension/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "X-CodeGuardian-Token": token } : {}),
        ...(apiKey ? { "X-CodeGuardian-ApiKey": apiKey } : {})
      },
      body: JSON.stringify(request),
      signal: controller.signal
    });
    if (!response.ok) return undefined;
    return (await response.json()) as ChatResponse;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timeout);
  }
}
