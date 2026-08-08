// 单测：测试问答会话 (AnswerSession) 数据结构校验、防篡改反序列化与历史记录本地存储 (sessionStorage) 格式化
import { describe, expect, it } from "vitest";
import { sampleCards } from "@/lib/content/sample-cards";
import { composeSearchAnswer, requiresOfficialVerification } from "@/lib/search/answer";
import { searchCards } from "@/lib/search/search-cards";
import {
  ACTIVE_CONTENT_VERSION,
  createAnswerFixture,
  validateAnswerSession,
  type AnswerSession,
} from "@/lib/answers/session";

function groundedSession(overrides: Partial<AnswerSession> = {}): AnswerSession {
  return {
    id: "answer-shuttle-fare",
    question: "环游车怎么付费？",
    confidence: "grounded",
    pageContext: { pageId: "page-campus-shuttle" },
    citations: [
      {
        id: "fare-source",
        pageId: "page-campus-shuttle",
        pageTitle: "校园环游车乘坐指南",
        anchor: "b-fare",
        contentVersion: ACTIVE_CONTENT_VERSION,
        excerpt: "单次收费 0.9 元。",
      },
      {
        id: "payment-source",
        pageId: "page-campus-shuttle",
        pageTitle: "校园环游车乘坐指南",
        anchor: "b-fare",
        contentVersion: ACTIVE_CONTENT_VERSION,
        excerpt: "可使用支付宝洪城一卡通或扫描车载二维码付款。",
      },
    ],
    claims: [
      { id: "fare", text: "单次费用为 0.9 元。", citationIds: ["fare-source"], status: "grounded" },
      { id: "payment", text: "可以使用支付宝或扫描车载二维码付款。", citationIds: ["payment-source"], status: "grounded" },
    ],
    ...overrides,
  };
}

describe("answer evidence sessions & card boundary", () => {
  it("composes a short sourced answer from reliable card matches", () => {
    const results = searchCards("校园卡丢了怎么办", sampleCards);
    const answer = composeSearchAnswer("校园卡丢了怎么办", results);

    expect(answer.state).toBe("answered");
    expect(answer.conclusion).toContain("先挂失");
    expect(answer.sources[0]?.title).toBe("校园卡丢了怎么办");
    expect(answer.followUps.length).toBeGreaterThanOrEqual(2);
  });

  it("does not fabricate an answer when no reliable card is found", () => {
    const answer = composeSearchAnswer("学校附近哪里能办潜水证", []);

    expect(answer.state).toBe("no_source");
    expect(answer.conclusion).toContain("暂未找到可靠信息");
    expect(answer.sources).toEqual([]);
  });

  it("flags fees, deadlines, grades, qualification and policy questions for official verification", () => {
    expect(requiresOfficialVerification("转专业截止时间和资格要求是什么")).toBe(true);
    expect(requiresOfficialVerification("补卡费用多少钱")).toBe(true);

    const answer = composeSearchAnswer(
      "补卡费用多少钱",
      searchCards("补卡费用多少钱", sampleCards),
    );

    expect(answer.verificationNotice).toContain("以官方通知或人工确认为准");
  });

  it("rejects grounded factual claims without citations", () => {
    const session = groundedSession({
      citations: [],
      claims: [{ id: "fare", text: "单次费用为 0.9 元。", citationIds: [], status: "grounded" }],
    });

    expect(() => validateAnswerSession(session)).toThrow(/citation/i);
  });

  it("requires every factual claim in a multi-claim answer to cite the active content version", () => {
    const session = groundedSession();

    expect(validateAnswerSession(session)).toEqual(session);
    expect(session.claims.every((claim) => claim.citationIds.length > 0)).toBe(true);
  });

  it("rejects unknown citations and stale published content", () => {
    expect(() => validateAnswerSession(groundedSession({
      claims: [{ id: "fare", text: "单次费用为 0.9 元。", citationIds: ["missing"], status: "grounded" }],
    }))).toThrow(/unknown citation/i);

    const stale = groundedSession();
    stale.citations[0] = { ...stale.citations[0], contentVersion: "content-2025-01" };
    expect(() => validateAnswerSession(stale)).toThrow(/content version/i);
  });

  it("allows an empty insufficient answer but rejects factual claims in one", () => {
    const insufficient = createAnswerFixture("图书馆今天几点关门？");
    expect(validateAnswerSession(insufficient)).toEqual(insufficient);
    expect(insufficient).toMatchObject({ confidence: "insufficient", claims: [], citations: [] });

    expect(() => validateAnswerSession({
      ...insufficient,
      claims: [{ id: "hours", text: "图书馆 22:00 关门。", citationIds: [], status: "grounded" }],
    })).toThrow(/insufficient/i);
  });
});
