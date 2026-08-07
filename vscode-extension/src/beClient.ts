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

let cachedActiveUrl: { url: string; timestamp: number } | undefined;
const CACHE_TTL_MS = 30_000;

/** Discovers active backend URL by probing common ports if primary configured URL fails */
export async function resolveActiveBaseUrl(configuredUrl: string): Promise<string> {
  const now = Date.now();
  if (cachedActiveUrl && (now - cachedActiveUrl.timestamp < CACHE_TTL_MS)) {
    return cachedActiveUrl.url;
  }

  const cleanUrl = configuredUrl.replace(/\/$/, "");
  if (await pingHealth(cleanUrl)) {
    cachedActiveUrl = { url: cleanUrl, timestamp: now };
    return cleanUrl;
  }
  for (const port of PORTS_TO_PROBE) {
    const candidate = `http://127.0.0.1:${port}`;
    if (await pingHealth(candidate)) {
      cachedActiveUrl = { url: candidate, timestamp: now };
      return candidate;
    }
  }
  cachedActiveUrl = { url: cleanUrl, timestamp: now };
  return cleanUrl;
}

export async function checkBackendHealth(configuredUrl: string): Promise<{ online: boolean; url: string; message: string }> {
  const activeUrl = await resolveActiveBaseUrl(configuredUrl);
  const online = await pingHealth(activeUrl);
  return {
    online,
    url: activeUrl,
    message: online ? `Connected to CodeGuardian extension service at ${activeUrl}` : `Could not reach sidecar service at ${configuredUrl}`
  };
}

async function pingHealth(baseUrl: string): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(1_200) });
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
  const timeout = setTimeout(() => controller.abort(), 8_000);
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

export async function chatWithBackendStreaming(
  baseUrl: string,
  token: string,
  request: ChatRequest,
  apiKey: string | undefined,
  onChunk: (chunkText: string) => void
): Promise<ChatResponse | undefined> {
  const activeUrl = await resolveActiveBaseUrl(baseUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(`${activeUrl}/api/extension/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "X-CodeGuardian-Token": token } : {}),
        ...(apiKey ? { "X-CodeGuardian-ApiKey": apiKey } : {})
      },
      body: JSON.stringify({ ...request, stream: true }),
      signal: controller.signal
    });

    if (!response.ok) return undefined;

    if (response.body && typeof response.body.getReader === "function") {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const textChunk = decoder.decode(value, { stream: true });
        fullText += textChunk;
        onChunk(textChunk);
      }

      try {
        const parsed = JSON.parse(fullText) as ChatResponse;
        return parsed;
      } catch {
        return { reply: fullText, suggestedActions: ["Explain Selection", "Generate Unit Tests"] };
      }
    } else {
      const jsonRes = (await response.json()) as ChatResponse;
      onChunk(jsonRes.reply);
      return jsonRes;
    }
  } catch {
    return undefined;
  } finally {
    clearTimeout(timeout);
  }
}

