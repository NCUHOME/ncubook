import { groundAnswer } from "@/lib/ai/ground-answer";
import { createOpenAICompatibleProvider } from "@/lib/ai/provider";
import { createSupabaseRetrievalRepository, retrieveGroundingSources } from "@/lib/ai/retrieve";
import type { AnswerService } from "@/lib/ai/answer-route";
import { getSupabaseAdmin } from "@/lib/db/supabase";
import { assertServerOnly } from "@/lib/server-only";

assertServerOnly("Production answer service");

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
    const sources = await retrieveGroundingSources({ question, pageContext, repository, embedding });
    return groundAnswer({ question, pageContext, activeContentVersion, sources, model: provider });
  };
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
