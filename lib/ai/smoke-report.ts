export type SmokeCase = {
  id: string;
  question: string;
  expectedAnswerable: boolean;
  expectedSourceIds?: string[];
  expectedAnchors?: string[];
};

export type SmokeRetrievalSample = {
  caseId: string;
  sourceIds: string[];
  anchors: string[];
};

export type SmokeAnswerSample = {
  caseId: string;
  status: number;
  latencyMs: number;
  confidence: "grounded" | "partial" | "insufficient" | "error";
  claimCount: number;
  citationCount: number;
  citationAnchors: string[];
  citationContentVersions: string[];
};

export type SmokeReport = {
  answerableRecallAt8: number;
  answerableSuccess: number;
  unanswerableAbstention: number;
  citationValidity: number;
  failedRequests: number;
  p95LatencyMs: number;
};

export function evaluateSmokeReport(
  cases: SmokeCase[],
  retrieval: SmokeRetrievalSample[],
  answers: SmokeAnswerSample[],
  activeContentVersion: string,
): SmokeReport {
  const answerableCases = cases.filter((item) => item.expectedAnswerable);
  const unanswerableCases = new Set(cases.filter((item) => !item.expectedAnswerable).map((item) => item.id));
  const retrievalByCase = new Map(retrieval.map((sample) => [sample.caseId, sample]));
  const recalled = answerableCases.filter((item) => {
    const sample = retrievalByCase.get(item.id);
    if (!sample) return false;
    const sourceMatched = !item.expectedSourceIds?.length || item.expectedSourceIds.some((id) => sample.sourceIds.includes(id));
    const anchorMatched = !item.expectedAnchors?.length || item.expectedAnchors.some((anchor) => sample.anchors.includes(anchor));
    return sourceMatched && anchorMatched;
  }).length;

  const answerableIds = new Set(answerableCases.map((item) => item.id));
  const answerableAnswers = answers.filter((sample) => answerableIds.has(sample.caseId));
  const groundedAnswers = answerableAnswers.filter((sample) => sample.status >= 200 && sample.status < 300
    && (sample.confidence === "grounded" || sample.confidence === "partial")
    && sample.claimCount > 0
    && sample.citationCount > 0
    && sample.citationAnchors.every((anchor) => anchor.startsWith("b-"))
    && sample.citationContentVersions.every((version) => version === activeContentVersion)).length;

  const unanswerableAnswers = answers.filter((sample) => unanswerableCases.has(sample.caseId));
  const abstentions = unanswerableAnswers.filter((sample) => sample.status >= 200 && sample.status < 300
    && sample.confidence === "insufficient"
    && sample.claimCount === 0).length;

  let citations = 0;
  let validCitations = 0;
  for (const sample of answerableAnswers) {
    citations += sample.citationCount;
    for (let index = 0; index < sample.citationCount; index += 1) {
      if (sample.citationAnchors[index]?.startsWith("b-") && sample.citationContentVersions[index] === activeContentVersion) {
        validCitations += 1;
      }
    }
  }
  const latencies = answers.map((sample) => sample.latencyMs).sort((left, right) => left - right);

  return {
    answerableRecallAt8: ratio(recalled, answerableCases.length),
    answerableSuccess: ratio(groundedAnswers, answerableAnswers.length),
    unanswerableAbstention: ratio(abstentions, unanswerableAnswers.length),
    citationValidity: ratio(validCitations, citations),
    failedRequests: answers.filter((sample) => sample.status < 200 || sample.status >= 300 || sample.confidence === "error").length,
    p95LatencyMs: latencies[Math.max(0, Math.ceil(latencies.length * 0.95) - 1)] ?? 0,
  };
}

function ratio(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator;
}
