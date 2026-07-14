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
  value: unknown,
  activeContentVersion = ACTIVE_CONTENT_VERSION,
): AnswerSession {
  const source = requireRecord(value, "Answer session");
  const session: AnswerSession = {
    id: requireText(source.id, "Answer session id"),
    question: requireText(source.question, "Answer session question"),
    confidence: parseConfidence(source.confidence),
    citations: requireArray(source.citations, "Answer citations").map(parseCitation),
    claims: requireArray(source.claims, "Answer claims").map(parseClaim),
    ...(source.pageContext === undefined ? {} : { pageContext: parsePageContext(source.pageContext) }),
  };
  if (!session.id || !session.question) throw new Error("Answer session requires an id and question");
  if (session.confidence === "insufficient" && session.claims.length > 0) {
    throw new Error("An insufficient answer cannot contain factual claims");
  }

  const citations = new Map(session.citations.map((citation) => [citation.id, citation]));
  if (citations.size !== session.citations.length) throw new Error("Answer session contains duplicate citation ids");
  const claimIds = new Set(session.claims.map((claim) => claim.id));
  if (claimIds.size !== session.claims.length) throw new Error("Answer session contains duplicate claim ids");
  for (const citation of session.citations) {
    if (!citation.anchor.startsWith("b-")) throw new Error(`Invalid citation anchor: ${citation.anchor}`);
    if (citation.contentVersion !== activeContentVersion) {
      throw new Error(`Citation ${citation.id} uses an inactive content version`);
    }
  }

  for (const claim of session.claims) {
    if (claim.citationIds.length === 0) {
      throw new Error(`Factual claim ${claim.id} requires a citation`);
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

function parseCitation(value: unknown): Citation {
  const source = requireRecord(value, "Answer citation");
  const sourceUrl = source.sourceUrl;
  if (sourceUrl !== undefined && typeof sourceUrl !== "string") throw new Error("Answer citation source URL must be text");
  return {
    id: requireText(source.id, "Citation id"),
    pageId: requireText(source.pageId, "Citation page id"),
    pageTitle: requireText(source.pageTitle, "Citation page title"),
    anchor: requireText(source.anchor, "Citation anchor"),
    contentVersion: requireText(source.contentVersion, "Citation content version"),
    excerpt: requireText(source.excerpt, "Citation excerpt"),
    ...(sourceUrl ? { sourceUrl } : {}),
  };
}

function parseClaim(value: unknown): AnswerClaim {
  const source = requireRecord(value, "Answer claim");
  const status = source.status;
  if (status !== "grounded" && status !== "needs-verification" && status !== "insufficient") throw new Error("Answer claim has an invalid status");
  return {
    id: requireText(source.id, "Claim id"),
    text: requireText(source.text, "Claim text"),
    citationIds: requireArray(source.citationIds, "Claim citations").map((id) => requireText(id, "Claim citation id")),
    status,
  };
}

function parsePageContext(value: unknown): NonNullable<AnswerSession["pageContext"]> {
  const source = requireRecord(value, "Answer page context");
  const anchor = source.anchor;
  if (anchor !== undefined && (typeof anchor !== "string" || !anchor.startsWith("b-"))) throw new Error("Answer context anchor is invalid");
  return { pageId: requireText(source.pageId, "Answer context page id"), ...(anchor ? { anchor } : {}) };
}

function parseConfidence(value: unknown): AnswerSession["confidence"] {
  if (value !== "grounded" && value !== "partial" && value !== "insufficient") throw new Error("Answer session has invalid confidence");
  return value;
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(`${label} must be an object`);
  return value as Record<string, unknown>;
}

function requireArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  return value;
}

function requireText(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required`);
  return value;
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
