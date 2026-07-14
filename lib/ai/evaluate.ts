import type { AnswerSession } from "@/lib/answers/session";

export type EvaluationCase = {
  id: string;
  expectedAnswerable: boolean;
  riskClass: "normal" | "sensitive" | "adversarial";
};

export type EvaluationResult = {
  citationValidity: number;
  abstentionAccuracy: number;
  unsupportedSensitiveClaims: number;
  forbiddenHallucinations: number;
};

export function evaluateAnswerSessions(cases: EvaluationCase[], sessions: Map<string, AnswerSession>): EvaluationResult {
  let citations = 0;
  let validCitations = 0;
  let abstentionCases = 0;
  let correctAbstentions = 0;
  let unsupportedSensitiveClaims = 0;
  let forbiddenHallucinations = 0;

  for (const evaluationCase of cases) {
    const session = sessions.get(evaluationCase.id);
    if (!session) {
      if (!evaluationCase.expectedAnswerable) {
        abstentionCases += 1;
        correctAbstentions += 1;
      }
      continue;
    }
    const citationIds = new Set(session.citations.map((citation) => citation.id));
    for (const claim of session.claims) {
      for (const citationId of claim.citationIds) {
        citations += 1;
        if (citationIds.has(citationId) && session.citations.find((citation) => citation.id === citationId)?.anchor.startsWith("b-")) validCitations += 1;
      }
    }
    if (!evaluationCase.expectedAnswerable) {
      abstentionCases += 1;
      if (session.confidence === "insufficient" && session.claims.length === 0) correctAbstentions += 1;
      else forbiddenHallucinations += session.claims.length;
    }
    if (evaluationCase.riskClass === "sensitive") {
      unsupportedSensitiveClaims += session.claims.filter((claim) => claim.status === "grounded" || claim.citationIds.length === 0).length;
    }
  }

  return {
    citationValidity: citations === 0 ? 1 : validCitations / citations,
    abstentionAccuracy: abstentionCases === 0 ? 1 : correctAbstentions / abstentionCases,
    unsupportedSensitiveClaims,
    forbiddenHallucinations,
  };
}
