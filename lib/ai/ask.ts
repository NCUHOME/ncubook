// AI 问答引擎：/api/ask 路由 Handler 工厂与生产环境问答服务装配 (支持版本绑定的 Exact Match 内存会话缓存)
import { createHash, randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { groundAnswer } from "@/lib/ai/ground";
import { ProviderError, createOpenAICompatibleProvider } from "@/lib/ai/provider";
import { createSupabaseRetrievalRepository, retrieveGroundingSources } from "@/lib/ai/retrieve";
import { createAnswerFixture, type AnswerSession } from "@/lib/ai/session";
import type { Database } from "@/lib/database.types";
import { assertServerOnly } from "@/lib/integrations/server-only";
import { getSupabaseAdmin } from "@/lib/integrations/supabase";

assertServerOnly("AI answer route and service");

export type AnswerService = (input: { question: string; pageContext?: AnswerSession["pageContext"] }) => Promise<AnswerSession>;
export type AnswerMode = "fixture" | "production" | "shadow";

type TelemetryEvent = {
  requestId: string;
  latencyMs: number;
  confidence: AnswerSession["confidence"] | "error";
  citationCount: number;
  mode: AnswerMode;
};

type AskHandlerOptions = {
  mode: AnswerMode;
  answer: AnswerService;
  allowRequest: (request: Request) => boolean | Promise<boolean>;
  recordTelemetry?: (event: TelemetryEvent) => void;
};

// 进程级精准问答会话缓存（Exact Match Cache）：绑定内容版本与规范化问题，极大提升高频热门问答响应速度并节约 Token
const exactAnswerCache = new Map<string, { session: AnswerSession; cachedAt: number }>();
const MAX_EXACT_CACHE_SIZE = 256;
const EXACT_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 小时

export function clearExactAnswerCache(): void {
  exactAnswerCache.clear();
}

export function createAskHandler({ mode, answer, allowRequest, recordTelemetry = () => undefined }: AskHandlerOptions) {
  return async function handle(request: Request): Promise<Response> {
    const requestId = randomUUID();
    const startedAt = performance.now();
    if (!(await allowRequest(request))) return json({ error: "rate_limited", requestId }, 429);

    const input = await parseInput(request);
    if (!input) return json({ error: "invalid_question_or_context", requestId }, 400);

    try {
      if (mode === "fixture") {
        const session = createAnswerFixture(input.question, input.pageContext);
        recordTelemetry(eventFor(requestId, startedAt, mode, session));
        return json(session, 200);
      }

      if (mode === "shadow") {
        const fixtureSession = createAnswerFixture(input.question, input.pageContext);
        try {
          const generated = await answer(input);
          recordTelemetry(eventFor(requestId, startedAt, "shadow", generated));
          return json(generated, 200);
        } catch {
          recordTelemetry({ requestId, latencyMs: elapsed(startedAt), confidence: "error", citationCount: 0, mode: "shadow" });
          return json(fixtureSession, 200);
        }
      }

      const generated = await answer(input);
      recordTelemetry(eventFor(requestId, startedAt, mode, generated));
      return json(generated, 200);
    } catch (error) {
      recordTelemetry({ requestId, latencyMs: elapsed(startedAt), confidence: "error", citationCount: 0, mode });
      if (error instanceof ProviderError) return json({ error: "answer_temporarily_unavailable", requestId }, 503);
      return json({ error: "answer_failed", requestId }, 500);
    }
  };
}

export function createMinuteRateLimiter(limit: number): (request: Request) => boolean {
  const windows = new Map<string, { minute: number; count: number }>();
  return (request) => {
    const address = (request.headers.get("x-forwarded-for")?.split(",", 1)[0] ?? "unknown").trim();
    const key = createHash("sha256").update(address).digest("hex");
    const minute = Math.floor(Date.now() / 60_000);
    const current = windows.get(key);
    if (!current || current.minute !== minute) {
      windows.set(key, { minute, count: 1 });
      return true;
    }
    current.count += 1;
    return current.count <= limit;
  };
}

// 跨实例限流：以 Supabase 原子计数 RPC 为共享账本，多实例/多节点部署下限流阈值全局生效；仅存 IP 不可逆哈希
export function createSupabaseRateLimiter(
  client: SupabaseClient<Database>,
  limit: number,
): (request: Request) => Promise<boolean> {
  return async (request) => {
    const address = (request.headers.get("x-forwarded-for")?.split(",", 1)[0] ?? "unknown").trim();
    const key = createHash("sha256").update(address).digest("hex");
    const minute = Math.floor(Date.now() / 60_000);
    const result = await client.rpc("consume_ask_rate_limit", { p_bucket_key: key, p_minute_window: minute });
    if (result.error) {
      // 计数账本不可用时放行（此时问答链路依赖的 Supabase 内容读取同样不可用，问答会走既有失败降级），但必须留下可观测日志
      console.error(JSON.stringify({ event: "rate_limit_ledger_unavailable", error: result.error.message }));
      return true;
    }
    return (typeof result.data === "number" ? result.data : 1) <= limit;
  };
}

export function createProductionAnswerService(): AnswerService {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase published content is not configured");
  const provider = createOpenAICompatibleProvider({
    baseUrl: environment("AI_PROVIDER_BASE_URL"),
    apiKey: environment("AI_PROVIDER_API_KEY"),
    chatModel: environment("AI_CHAT_MODEL"),
    embeddingModel: optionalEnvironment("AI_EMBEDDING_MODEL"),
    timeoutMs: positiveInteger(process.env.AI_REQUEST_TIMEOUT_MS, 8000),
  });
  const embedding = provider.embed ? { embed: provider.embed } : undefined;
  const repository = createSupabaseRetrievalRepository(supabase);

  return async ({ question, pageContext }) => {
    const activeContentVersion = await repository.getCurrentVersion();
    if (!activeContentVersion) throw new Error("No published content version is available");

    const normalizedQ = question.trim().toLocaleLowerCase("zh-CN").replace(/\s+/g, "");
    const contextKey = pageContext?.pageId ? `${pageContext.pageId}:${pageContext.anchor ?? ""}` : "global";
    const cacheKey = `${activeContentVersion}:${contextKey}:${normalizedQ}`;

    const cached = exactAnswerCache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < EXACT_CACHE_TTL_MS) {
      return {
        ...cached.session,
        id: randomUUID(), // 返回新的唯一会话 ID
      };
    }

    const sources = await retrieveGroundingSources({ question, pageContext, repository, embedding });
    const session = await groundAnswer({ question, pageContext, activeContentVersion, sources, model: provider });

    // 仅对有效问答（有正文或明确归因结果）进行缓存
    if (session.confidence !== "insufficient" || session.claims.length > 0) {
      if (exactAnswerCache.size >= MAX_EXACT_CACHE_SIZE) {
        const oldestKey = exactAnswerCache.keys().next().value;
        if (oldestKey) exactAnswerCache.delete(oldestKey);
      }
      exactAnswerCache.set(cacheKey, { session, cachedAt: Date.now() });
    }

    return session;
  };
}

async function parseInput(request: Request): Promise<{ question: string; pageContext?: AnswerSession["pageContext"] } | null> {
  const value: unknown = await request.json().catch(() => null);
  if (!isRecord(value) || typeof value.question !== "string" || !value.question.trim()) return null;
  if (value.question.trim().length > 500) return null;
  if (value.pageContext === undefined) return { question: value.question.trim() };
  if (!isRecord(value.pageContext) || typeof value.pageContext.pageId !== "string" || !value.pageContext.pageId.trim()) return null;
  const anchor = value.pageContext.anchor;
  if (anchor !== undefined && (typeof anchor !== "string" || !anchor.startsWith("b-"))) return null;
  return {
    question: value.question.trim(),
    pageContext: { pageId: value.pageContext.pageId, ...(anchor ? { anchor } : {}) },
  };
}

function eventFor(requestId: string, startedAt: number, mode: AnswerMode, session: AnswerSession): TelemetryEvent {
  return { requestId, latencyMs: elapsed(startedAt), confidence: session.confidence, citationCount: session.citations.length, mode };
}

function elapsed(startedAt: number): number {
  return Math.max(0, Math.round(performance.now() - startedAt));
}

function json(value: unknown, status: number): Response {
  return Response.json(value, { status });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function environment(name: string): string {
  const value = process.env[name];
  if (!value?.trim()) throw new Error(`${name} is required`);
  return value;
}

function optionalEnvironment(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = value ? Number(value) : Number.NaN;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
