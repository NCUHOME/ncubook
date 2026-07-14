import type { AnswerModel } from "@/lib/ai/provider";
import { buildAnswerPrompt } from "@/lib/ai/prompt";
import { applyGroundingPolicy } from "@/lib/ai/policy";
import type { RetrievalSource } from "@/lib/ai/retrieve";
import { validateAnswerSession, type AnswerClaim, type AnswerSession, type Citation } from "@/lib/answers/session";
import { assertServerOnly } from "@/lib/server-only";

assertServerOnly("Grounded answers");

type GroundAnswerInput = {
  question: string;
  pageContext?: AnswerSession["pageContext"];
  activeContentVersion: string;
  sources: RetrievalSource[];
  model: AnswerModel;
};

export async function groundAnswer({ question, pageContext, activeContentVersion, sources, model }: GroundAnswerInput): Promise<AnswerSession> {
  const normalizedQuestion = question.trim();
  if (!normalizedQuestion) throw new Error("Question is required");
  const currentSources = sources.filter((source) => source.contentVersion === activeContentVersion && source.school === "ncu");
  if (currentSources.length === 0) return insufficientSession(normalizedQuestion, pageContext, activeContentVersion);

  const prompt = buildAnswerPrompt(normalizedQuestion, currentSources);
  const generated = await model.generateAnswer({ ...prompt, maxOutputTokens: 700 });
  const sourcesById = new Map(currentSources.map((source) => [source.id, source]));
  const claims: AnswerClaim[] = [];
  const usedSourceIds = new Set<string>();
  const usedClaimIds = new Set<string>();

  const policy = applyGroundingPolicy(normalizedQuestion, currentSources, generated.claims);
  for (const claim of policy.claims) {
    if (claim.status === "insufficient" || usedClaimIds.has(claim.id) || claim.sourceIds.length === 0) continue;
    const citedSources = claim.sourceIds.map((id) => sourcesById.get(id));
    if (citedSources.some((source) => !source)) continue;
    usedClaimIds.add(claim.id);
    claim.sourceIds.forEach((id) => usedSourceIds.add(id));
    claims.push({
      id: claim.id,
      text: claim.text,
      citationIds: claim.sourceIds.map((id) => `citation-${id}`),
      status: claim.status,
    });
  }

  if (claims.length === 0) return insufficientSession(normalizedQuestion, pageContext, activeContentVersion);
  const citations: Citation[] = currentSources
    .filter((source) => usedSourceIds.has(source.id))
    .map((source) => ({
      id: `citation-${source.id}`,
      pageId: source.pageId,
      pageTitle: source.pageTitle,
      anchor: source.anchor,
      contentVersion: source.contentVersion,
      excerpt: source.exactText,
      ...(source.sourceUrls[0] ? { sourceUrl: source.sourceUrls[0] } : {}),
    }));
  const confidence = claims.every((claim) => claim.status === "grounded") ? "grounded" : "partial";
  return validateAnswerSession({
    id: `answer-${stableId(`${activeContentVersion}:${normalizedQuestion}`)}`,
    question: normalizedQuestion,
    ...(pageContext ? { pageContext } : {}),
    citations,
    claims,
    confidence,
  }, activeContentVersion);
}

function insufficientSession(question: string, pageContext: AnswerSession["pageContext"] | undefined, activeContentVersion: string): AnswerSession {
  return validateAnswerSession({
    id: `answer-insufficient-${stableId(`${activeContentVersion}:${question}`)}`,
    question,
    ...(pageContext ? { pageContext } : {}),
    citations: [],
    claims: [],
    confidence: "insufficient",
  }, activeContentVersion);
}

function stableId(value: string): string {
  let hash = 0;
  for (const character of value) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return hash.toString(36);
}
