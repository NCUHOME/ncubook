import type { EmbeddingModel } from "@/lib/ai/provider";
import type { SupabaseClient } from "@supabase/supabase-js";
import { assertServerOnly } from "@/lib/server-only";

assertServerOnly("AI retrieval");

export type RetrievalSource = {
  id: string;
  pageId: string;
  pageTitle: string;
  anchor: string;
  sectionPath: string[];
  exactText: string;
  riskLevel: "normal" | "needs-verification" | "sensitive";
  school: string;
  contentVersion: string;
  lexicalScore: number;
  vectorScore: number;
  sourceUrls: string[];
};

export type RetrievalRepository = {
  getCurrentVersion(): Promise<string | null>;
  searchCurrentVersion(input: {
    question: string;
    queryEmbedding?: number[];
    contentVersion: string;
    school: "ncu";
    limit: number;
  }): Promise<RetrievalSource[]>;
};

type RetrieveInput = {
  question: string;
  pageContext?: { pageId: string; anchor?: string };
  repository: RetrievalRepository;
  embedding?: EmbeddingModel;
  maxCandidates?: number;
  allowedRiskLevels?: RetrievalSource["riskLevel"][];
};

export async function retrieveGroundingSources({
  question,
  pageContext,
  repository,
  embedding,
  maxCandidates = 8,
  allowedRiskLevels = ["normal", "needs-verification"],
}: RetrieveInput): Promise<RetrievalSource[]> {
  const normalizedQuestion = question.trim();
  if (!normalizedQuestion) return [];
  const contentVersion = await repository.getCurrentVersion();
  if (!contentVersion) return [];
  const queryEmbedding = embedding ? (await embedding.embed([normalizedQuestion]))[0] : undefined;
  const candidates = await repository.searchCurrentVersion({
    question: normalizedQuestion,
    ...(queryEmbedding ? { queryEmbedding } : {}),
    contentVersion,
    school: "ncu",
    limit: Math.max(maxCandidates * 3, maxCandidates),
  });
  const allowed = new Set(allowedRiskLevels);

  return candidates
    .filter((source) => source.contentVersion === contentVersion && source.school === "ncu" && allowed.has(source.riskLevel))
    .map((source) => ({
      source,
      score: source.lexicalScore * 1 + source.vectorScore * 2
        + (pageContext?.pageId === source.pageId ? 2 : 0)
        + (pageContext?.pageId === source.pageId && pageContext.anchor === source.anchor ? 3 : 0),
    }))
    .sort((left, right) => right.score - left.score || left.source.id.localeCompare(right.source.id))
    .slice(0, maxCandidates)
    .map(({ source }) => source);
}

export function createSupabaseRetrievalRepository(client: SupabaseClient): RetrievalRepository {
  return {
    async getCurrentVersion() {
      const result = await client.from("published_content_pointer").select("content_version").eq("singleton", true).maybeSingle();
      if (result.error) throw new Error(`Unable to read current content version: ${result.error.message}`);
      const version = asRecord(result.data).content_version;
      return typeof version === "string" ? version : null;
    },
    async searchCurrentVersion({ question, queryEmbedding, limit }) {
      if (queryEmbedding && queryEmbedding.length !== 1536) throw new Error("Query embedding must contain 1536 dimensions");
      const result = await client.rpc("retrieve_published_sources", {
        p_question: question,
        p_query_embedding: queryEmbedding ?? null,
        p_limit: limit,
      });
      if (result.error) throw new Error(`Unable to retrieve grounding sources: ${result.error.message}`);
      return Array.isArray(result.data) ? result.data.map(parseSourceRow) : [];
    },
  };
}

function parseSourceRow(value: unknown): RetrievalSource {
  const row = asRecord(value);
  const riskLevel = requiredString(row.risk_level, "Retrieval risk level");
  if (riskLevel !== "normal" && riskLevel !== "needs-verification" && riskLevel !== "sensitive") {
    throw new Error(`Invalid retrieval risk level: ${riskLevel}`);
  }
  return {
    id: requiredString(row.source_id, "Retrieval source id"),
    pageId: requiredString(row.page_id, "Retrieval page id"),
    pageTitle: requiredString(row.page_title, "Retrieval page title"),
    anchor: requiredString(row.anchor, "Retrieval anchor"),
    sectionPath: stringArray(row.section_path),
    exactText: requiredString(row.exact_text, "Retrieval exact text"),
    riskLevel,
    school: requiredString(row.school, "Retrieval school"),
    contentVersion: requiredString(row.content_version, "Retrieval content version"),
    lexicalScore: finiteNumber(row.lexical_score),
    vectorScore: finiteNumber(row.vector_score),
    sourceUrls: stringArray(row.source_urls),
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required`);
  return value;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function finiteNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
