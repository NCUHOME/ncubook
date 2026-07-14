import { describe, expect, it } from "vitest";
import { evaluateSmokeReport, type SmokeAnswerSample, type SmokeCase, type SmokeRetrievalSample } from "@/lib/ai/smoke-report";

const cases: SmokeCase[] = [
  { id: "answerable", question: "已知问题", expectedAnswerable: true, expectedSourceIds: ["source-a"], expectedAnchors: ["b-a"] },
  { id: "unknown", question: "未知问题", expectedAnswerable: false },
];

const retrieval: SmokeRetrievalSample[] = [
  { caseId: "answerable", sourceIds: ["source-a"], anchors: ["b-a"] },
  { caseId: "unknown", sourceIds: ["topic-only"], anchors: ["b-topic"] },
];

describe("EdgeOne AI smoke report", () => {
  it("measures recall, grounded success, abstention, failures, and p95", () => {
    const answers: SmokeAnswerSample[] = Array.from({ length: 20 }, (_, index) => ({
      caseId: "answerable",
      status: index === 19 ? 503 : 200,
      latencyMs: (index + 1) * 100,
      confidence: index === 19 ? "error" : "grounded",
      claimCount: index === 19 ? 0 : 1,
      citationCount: index === 19 ? 0 : 1,
      citationAnchors: index === 19 ? [] : ["b-a"],
      citationContentVersions: index === 19 ? [] : ["v2"],
    }));
    answers.push({
      caseId: "unknown", status: 200, latencyMs: 250, confidence: "insufficient",
      claimCount: 0, citationCount: 0, citationAnchors: [], citationContentVersions: [],
    });

    expect(evaluateSmokeReport(cases, retrieval, answers, "v2")).toEqual({
      answerableRecallAt8: 1,
      answerableSuccess: 0.95,
      unanswerableAbstention: 1,
      citationValidity: 1,
      failedRequests: 1,
      p95LatencyMs: 1900,
    });
  });

  it("requires expected source and anchor matches for recall", () => {
    const result = evaluateSmokeReport(cases, [{ caseId: "answerable", sourceIds: ["wrong"], anchors: ["b-wrong"] }], [], "v2");

    expect(result.answerableRecallAt8).toBe(0);
  });
});
