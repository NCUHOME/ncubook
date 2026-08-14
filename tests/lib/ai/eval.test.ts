// 单元测试：评测引擎核心算法与跑批执行套件 (tests/lib/ai/eval.test.ts)
import { describe, expect, it } from "vitest";
import {
  evaluateSingleCase,
  evaluateAnswerSessions,
  runEvaluationSuite,
  type EvaluationCase,
  type Thresholds,
} from "@/lib/ai/eval";
import type { AnswerSession } from "@/lib/ai/session";

describe("lib/ai/eval suite", () => {
  const sampleCase: EvaluationCase = {
    id: "test-case-1",
    question: "校园环游车怎么收费？",
    category: "校内出行",
    expectedAnswerable: true,
    riskClass: "normal",
    mustInclude: ["0.9", "支付宝"],
    mustNotInclude: ["免费", "5元"],
  };

  const defaultThresholds: Thresholds = {
    citationValidity: 1,
    abstentionAccuracy: 1,
    unsupportedSensitiveClaims: 0,
    forbiddenHallucinations: 0,
    factualityRate: 1,
    p95LatencyMs: 500,
  };

  it("evaluates a compliant answer session as pass", () => {
    const validSession: AnswerSession = {
      id: "session-1",
      question: "校园环游车怎么收费？",
      confidence: "grounded",
      claims: [
        {
          id: "claim-1",
          text: "校园环游车票价为0.9元，支持支付宝或微信扫码乘车。",
          status: "grounded",
          citationIds: ["cit-1"],
        },
      ],
      citations: [
        {
          id: "cit-1",
          pageId: "page-1",
          pageTitle: "环游车指南",
          anchor: "b-pricing",
          contentVersion: "content-2026-07",
          excerpt: "单次票价0.9元",
        },
      ],
    };

    const detail = evaluateSingleCase(sampleCase, validSession, 12);
    expect(detail.isPass).toBe(true);
    expect(detail.failReasons).toHaveLength(0);
    expect(detail.claimCount).toBe(1);
    expect(detail.citationCount).toBe(1);
  });

  it("detects missing golden facts and forbidden hallucinations", () => {
    const faultySession: AnswerSession = {
      id: "session-2",
      question: "校园环游车怎么收费？",
      confidence: "grounded",
      claims: [
        {
          id: "claim-1",
          text: "校园环游车全天免费开放乘坐，无需使用支付宝。",
          status: "grounded",
          citationIds: ["cit-1"],
        },
      ],
      citations: [
        {
          id: "cit-1",
          pageId: "page-1",
          pageTitle: "环游车指南",
          anchor: "b-pricing",
          contentVersion: "content-2026-07",
          excerpt: "相关介绍",
        },
      ],
    };

    const detail = evaluateSingleCase(sampleCase, faultySession, 15);
    expect(detail.isPass).toBe(false);
    expect(detail.failReasons.some((r) => r.includes("0.9"))).toBe(true);
    expect(detail.failReasons.some((r) => r.includes("免费"))).toBe(true);
  });

  it("evaluates correct abstention for unanswerable question", () => {
    const abstentionCase: EvaluationCase = {
      id: "test-case-unanswerable",
      question: "今天二食堂三楼午餐有什么菜？",
      category: "日常餐饮",
      expectedAnswerable: false,
      riskClass: "normal",
    };

    const abstainedSession: AnswerSession = {
      id: "session-3",
      question: "今天二食堂三楼午餐有什么菜？",
      confidence: "insufficient",
      claims: [],
      citations: [],
    };

    const detail = evaluateSingleCase(abstentionCase, abstainedSession, 8);
    expect(detail.isPass).toBe(true);
    expect(detail.failReasons).toHaveLength(0);
  });

  it("calculates aggregate metrics and P95 latency across sessions", () => {
    const cases: EvaluationCase[] = [sampleCase];
    const sessions = new Map<string, AnswerSession>([
      [
        sampleCase.id,
        {
          id: "session-4",
          question: "校园环游车怎么收费？",
          confidence: "grounded",
          claims: [
            {
              id: "c-1",
              text: "校园环游车为0.9元，支持支付宝扫码。",
              status: "grounded",
              citationIds: ["cit-1"],
            },
          ],
          citations: [
            {
              id: "cit-1",
              pageId: "page-1",
              pageTitle: "环游车指南",
              anchor: "b-pricing",
              contentVersion: "content-2026-07",
              excerpt: "0.9元",
            },
          ],
        },
      ],
    ]);

    const report = evaluateAnswerSessions(cases, sessions, [25], defaultThresholds);
    expect(report.metrics.passCount).toBe(1);
    expect(report.metrics.totalCount).toBe(1);
    expect(report.metrics.factualityRate).toBe(1);
    expect(report.metrics.citationValidity).toBe(1);
    expect(report.metrics.abstentionAccuracy).toBe(1);
    expect(report.metrics.p95LatencyMs).toBe(25);
  });

  it("runs full mock evaluation suite with 35 benchmark cases", async () => {
    const report = await runEvaluationSuite({ isMock: true });
    expect(report.metrics.totalCount).toBeGreaterThanOrEqual(35);
    expect(report.metrics.passCount).toBe(report.metrics.totalCount);
    expect(report.metrics.factualityRate).toBe(1);
    expect(report.metrics.citationValidity).toBe(1);
    expect(report.metrics.abstentionAccuracy).toBe(1);
    expect(report.metrics.unsupportedSensitiveClaims).toBe(0);
    expect(report.metrics.forbiddenHallucinations).toBe(0);
  });
});
