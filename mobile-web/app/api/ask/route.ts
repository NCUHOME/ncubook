import { createAskHandler, createMinuteRateLimiter, type AnswerMode, type AnswerService } from "@/lib/ai/answer-route";
import { createProductionAnswerService } from "@/lib/ai/answer-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let productionService: AnswerService | undefined;
const mode = answerMode();
const limit = positiveInteger(process.env.AI_RATE_LIMIT_PER_MINUTE, 10);
const handle = createAskHandler({
  mode,
  allowRequest: createMinuteRateLimiter(limit),
  answer(input) {
    productionService ??= createProductionAnswerService();
    return productionService(input);
  },
  recordTelemetry(event) {
    console.info(JSON.stringify({ event: "grounded_answer", ...event }));
  },
});

export async function POST(request: Request): Promise<Response> {
  return handle(request);
}

function answerMode(): AnswerMode {
  const value = process.env.AI_ANSWER_MODE;
  const productionContent = process.env.PUBLISHED_CONTENT_ENV === "production" || process.env.VERCEL_ENV === "production";
  if (value === "production" || value === "shadow") return value;
  return productionContent ? "shadow" : "fixture";
}

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = value ? Number(value) : Number.NaN;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
