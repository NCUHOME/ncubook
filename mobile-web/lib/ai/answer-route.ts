import { createHash, randomUUID } from "node:crypto";
import { ACTIVE_CONTENT_VERSION, createAnswerFixture, validateAnswerSession, type AnswerSession } from "@/lib/answers/session";
import { ProviderError } from "@/lib/ai/provider";
import { assertServerOnly } from "@/lib/server-only";

assertServerOnly("AI answer route");

export type AnswerService = (input: { question: string; pageContext?: AnswerSession["pageContext"] }) => Promise<AnswerSession>;
export type AnswerMode = "fixture" | "shadow" | "production";

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
  allowRequest: (request: Request) => boolean;
  recordTelemetry?: (event: TelemetryEvent) => void;
};

export function createAskHandler({ mode, answer, allowRequest, recordTelemetry = () => undefined }: AskHandlerOptions) {
  return async function handle(request: Request): Promise<Response> {
    const requestId = randomUUID();
    const startedAt = performance.now();
    if (!allowRequest(request)) return json({ error: "rate_limited", requestId }, 429);

    const input = await parseInput(request);
    if (!input) return json({ error: "invalid_question_or_context", requestId }, 400);

    try {
      if (mode === "fixture") {
        const session = createAnswerFixture(input.question, input.pageContext);
        recordTelemetry(eventFor(requestId, startedAt, mode, session));
        return json(session, 200);
      }

      const generated = await answer(input);
      const session = mode === "shadow" ? insufficientSession(input.question, input.pageContext) : generated;
      recordTelemetry(eventFor(requestId, startedAt, mode, session));
      return json(session, 200);
    } catch (error) {
      recordTelemetry({ requestId, latencyMs: elapsed(startedAt), confidence: "error", citationCount: 0, mode });
      if (mode === "shadow") return json(insufficientSession(input.question, input.pageContext), 200);
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

function insufficientSession(question: string, pageContext?: AnswerSession["pageContext"]): AnswerSession {
  return validateAnswerSession({
    id: `answer-shadow-${createHash("sha256").update(question).digest("hex").slice(0, 12)}`,
    question,
    ...(pageContext ? { pageContext } : {}),
    confidence: "insufficient",
    claims: [],
    citations: [],
  }, ACTIVE_CONTENT_VERSION);
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
