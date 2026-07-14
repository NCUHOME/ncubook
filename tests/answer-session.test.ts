import { describe, expect, it } from "vitest";
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

describe("answer evidence sessions", () => {
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
