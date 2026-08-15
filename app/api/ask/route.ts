import { createAskHandler, createMinuteRateLimiter, createSupabaseRateLimiter, createProductionAnswerService, type AnswerMode, type AnswerService } from "@/lib/ai/ask";
import { getSupabaseAdmin, hasSupabaseConfig } from "@/lib/integrations/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let productionService: AnswerService | undefined;
const mode = answerMode();
const limit = positiveInteger(process.env.AI_RATE_LIMIT_PER_MINUTE, 10);
const rateLimitLedger = getSupabaseAdmin();
const handle = createAskHandler({
  mode,
  allowRequest: rateLimitLedger ? createSupabaseRateLimiter(rateLimitLedger, limit) : createMinuteRateLimiter(limit),
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
  if (value === "fixture") return "fixture";
  if (value === "shadow") return "shadow";
  if (value === "production") return "production";

  // 若本地环境已配置 AI API Key 与 Supabase，直接走真实生产 RAG 问答，绝不退回假数据
  if (process.env.AI_PROVIDER_API_KEY && hasSupabaseConfig()) {
    return "production";
  }

  const productionContent = process.env.PUBLISHED_CONTENT_ENV === "production" || process.env.VERCEL_ENV === "production";
  return productionContent ? "production" : "fixture";
}

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = value ? Number(value) : Number.NaN;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
