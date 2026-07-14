import { assertServerOnly } from "@/lib/server-only";

assertServerOnly("AI provider");

export type ModelClaim = {
  id: string;
  text: string;
  sourceIds: string[];
  status: "grounded" | "needs-verification" | "insufficient";
};

export type ModelAnswer = {
  confidence: "grounded" | "partial" | "insufficient";
  claims: ModelClaim[];
  usage?: { inputTokens: number; outputTokens: number };
};

export type AnswerModel = {
  generateAnswer(input: { system: string; user: string; maxOutputTokens: number }): Promise<ModelAnswer>;
};

export type EmbeddingModel = {
  embed(texts: string[]): Promise<number[][]>;
};

export class ProviderError extends Error {
  constructor(public readonly reason: "timeout" | "invalid-response" | "rate-limited" | "unavailable" | "truncated") {
    super(`AI provider request failed: ${reason}`);
    this.name = "ProviderError";
  }
}

type ProviderOptions = {
  baseUrl: string;
  apiKey: string;
  chatModel: string;
  embeddingModel?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  sleep?: (milliseconds: number) => Promise<void>;
};

export function createOpenAICompatibleProvider({
  baseUrl,
  apiKey,
  chatModel,
  embeddingModel,
  fetchImpl = fetch,
  timeoutMs = 8000,
  sleep = wait,
}: ProviderOptions): AnswerModel & Partial<EmbeddingModel> {
  for (const [label, value] of [["base URL", baseUrl], ["API key", apiKey], ["chat model", chatModel]]) {
    if (!value.trim()) throw new Error(`AI provider ${label} is required`);
  }

  async function request(path: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      let response: Response;
      try {
        response = await fetchWithTimeout(fetchImpl, `${baseUrl.replace(/\/$/, "")}${path}`, {
          method: "POST",
          headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
          body: JSON.stringify(body),
        }, timeoutMs);
      } catch (error) {
        if (isAbortError(error)) throw new ProviderError("timeout");
        throw new ProviderError("unavailable");
      }

      if (response.ok) {
        const value: unknown = await response.json().catch(() => null);
        if (!isRecord(value)) throw new ProviderError("invalid-response");
        return value;
      }

      const retryable = response.status === 429 || [502, 503, 504].includes(response.status);
      if (retryable && attempt === 0) {
        await sleep(retryDelay(response.headers.get("retry-after")));
        continue;
      }
      if (response.status === 429) throw new ProviderError("rate-limited");
      throw new ProviderError("unavailable");
    }
    throw new ProviderError("unavailable");
  }

  return {
    async generateAnswer({ system, user, maxOutputTokens }) {
      const response = await request("/chat/completions", {
        model: chatModel,
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
        thinking: { type: "disabled" },
        response_format: { type: "json_object" },
        temperature: 0,
        max_tokens: maxOutputTokens,
      });
      const choices = response.choices;
      if (!Array.isArray(choices) || choices.length !== 1) throw new ProviderError("invalid-response");
      const choice = asRecord(choices[0]);
      if (choice.finish_reason === "length") throw new ProviderError("truncated");
      const content = asRecord(choice.message).content;
      if (typeof content !== "string") throw new ProviderError("invalid-response");
      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        throw new ProviderError("invalid-response");
      }
      const answer = parseModelAnswer(parsed);
      const usage = asRecord(response.usage);
      const inputTokens = finiteNumber(usage.prompt_tokens);
      const outputTokens = finiteNumber(usage.completion_tokens);
      return inputTokens !== undefined && outputTokens !== undefined
        ? { ...answer, usage: { inputTokens, outputTokens } }
        : answer;
    },
    ...(embeddingModel?.trim() ? { async embed(texts: string[]) {
      if (texts.length === 0) return [];
      const response = await request("/embeddings", { model: embeddingModel, input: texts });
      if (!Array.isArray(response.data)) throw new ProviderError("invalid-response");
      const ordered = response.data.map((item) => {
        const row = asRecord(item);
        const index = finiteNumber(row.index);
        const embedding = Array.isArray(row.embedding) && row.embedding.every((value) => typeof value === "number" && Number.isFinite(value))
          ? row.embedding as number[]
          : null;
        if (index === undefined || !embedding) throw new ProviderError("invalid-response");
        return { index, embedding };
      }).sort((left, right) => left.index - right.index);
      if (ordered.length !== texts.length) throw new ProviderError("invalid-response");
      return ordered.map((item) => item.embedding);
    } } : {}),
  };
}

function parseModelAnswer(value: unknown): ModelAnswer {
  const source = asRecord(value);
  const confidence = source.confidence;
  if (confidence !== "grounded" && confidence !== "partial" && confidence !== "insufficient") throw new ProviderError("invalid-response");
  if (!Array.isArray(source.claims)) throw new ProviderError("invalid-response");
  const claims = source.claims.map((claimValue) => {
    const claim = asRecord(claimValue);
    const status = claim.status;
    if (typeof claim.id !== "string" || !claim.id || typeof claim.text !== "string" || !claim.text) throw new ProviderError("invalid-response");
    if (status !== "grounded" && status !== "needs-verification" && status !== "insufficient") throw new ProviderError("invalid-response");
    if (!Array.isArray(claim.sourceIds) || !claim.sourceIds.every((id) => typeof id === "string" && Boolean(id))) throw new ProviderError("invalid-response");
    const sourceIds = claim.sourceIds.filter((id): id is string => typeof id === "string");
    return { id: claim.id, text: claim.text, sourceIds, status } satisfies ModelClaim;
  });
  return { confidence, claims };
}

async function fetchWithTimeout(fetchImpl: typeof fetch, url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function retryDelay(retryAfter: string | null): number {
  const seconds = retryAfter ? Number(retryAfter) : Number.NaN;
  return Number.isFinite(seconds) && seconds >= 0 ? Math.min(seconds * 1000, 2000) : 250;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError"
    || error instanceof Error && error.name === "AbortError";
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
