export const ACTIVE_CONTENT_VERSION = "content-2026-07";

export type Citation = {
  id: string;
  pageId: string;
  pageTitle: string;
  anchor: string;
  contentVersion: string;
  excerpt: string;
  sourceUrl?: string;
};

export type AnswerClaim = {
  id: string;
  text: string;
  citationIds: string[];
  status: "grounded" | "needs-verification" | "insufficient";
};

export type AnswerSession = {
  id: string;
  question: string;
  pageContext?: { pageId: string; anchor?: string };
  citations: Citation[];
  claims: AnswerClaim[];
  confidence: "grounded" | "partial" | "insufficient";
};

export function validateAnswerSession(
  session: AnswerSession,
  activeContentVersion = ACTIVE_CONTENT_VERSION,
): AnswerSession {
  if (!session.id || !session.question) throw new Error("Answer session requires an id and question");
  if (session.confidence === "insufficient" && session.claims.length > 0) {
    throw new Error("An insufficient answer cannot contain factual claims");
  }

  const citations = new Map(session.citations.map((citation) => [citation.id, citation]));
  for (const citation of session.citations) {
    if (!citation.anchor.startsWith("b-")) throw new Error(`Invalid citation anchor: ${citation.anchor}`);
    if (citation.contentVersion !== activeContentVersion) {
      throw new Error(`Citation ${citation.id} uses an inactive content version`);
    }
  }

  for (const claim of session.claims) {
    if (claim.status === "grounded" && claim.citationIds.length === 0) {
      throw new Error(`Grounded claim ${claim.id} requires a citation`);
    }
    for (const citationId of claim.citationIds) {
      if (!citations.has(citationId)) throw new Error(`Unknown citation: ${citationId}`);
    }
  }

  if (session.confidence === "grounded" && session.claims.some((claim) => claim.status !== "grounded")) {
    throw new Error("Grounded confidence requires every claim to be grounded");
  }

  return session;
}

export function createAnswerFixture(
  question: string,
  pageContext?: AnswerSession["pageContext"],
): AnswerSession {
  const normalizedQuestion = question.trim();
  if (/环游车|洪城一卡通|车载二维码|0\.9/.test(normalizedQuestion)) {
    return validateAnswerSession({
      id: "answer-shuttle-fare",
      question: normalizedQuestion,
      pageContext,
      confidence: "grounded",
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
    });
  }

  return validateAnswerSession({
    id: `answer-insufficient-${stableId(normalizedQuestion)}`,
    question: normalizedQuestion,
    pageContext,
    confidence: "insufficient",
    citations: [],
    claims: [],
  });
}

function stableId(value: string): string {
  let hash = 0;
  for (const character of value) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return hash.toString(36);
}
