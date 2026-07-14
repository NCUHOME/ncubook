import type { ModelClaim } from "@/lib/ai/provider";
import type { RetrievalSource } from "@/lib/ai/retrieve";

export type PolicyOutcome = "normal" | "sensitive-verification" | "insufficient-sensitive" | "conflicting-sources";

const sensitiveTerms = [
  "招生", "报名", "截止", "费用", "收费", "资格", "成绩", "绩点", "处分",
  "受伤", "生病", "服药", "医疗", "急救", "火灾", "报警", "危险", "安全事故",
];

export function applyGroundingPolicy(
  question: string,
  sources: RetrievalSource[],
  claims: ModelClaim[],
): { claims: ModelClaim[]; outcome: PolicyOutcome } {
  const sensitive = sensitiveTerms.some((term) => question.includes(term));
  const sourcesById = new Map(sources.map((source) => [source.id, source]));
  const conflict = sensitive && hasConflictingValues(sources);

  if (!sensitive) {
    return {
      claims: claims.map((claim) => claim.sourceIds.some((id) => sourcesById.get(id)?.riskLevel !== "normal")
        ? { ...claim, status: "needs-verification" }
        : claim),
      outcome: "normal",
    };
  }

  const authoritativeClaims = claims.filter((claim) => claim.sourceIds.some((id) => {
    const source = sourcesById.get(id);
    return source ? isAuthoritative(source) : false;
  }));
  if (authoritativeClaims.length === 0) return { claims: [], outcome: "insufficient-sensitive" };

  return {
    claims: authoritativeClaims.map((claim) => ({ ...claim, status: "needs-verification" })),
    outcome: conflict ? "conflicting-sources" : "sensitive-verification",
  };
}

function isAuthoritative(source: RetrievalSource): boolean {
  return source.sourceUrls.some((value) => {
    try {
      const hostname = new URL(value).hostname.toLocaleLowerCase("en-US");
      return hostname === "ncu.edu.cn" || hostname.endsWith(".ncu.edu.cn") || hostname.endsWith(".gov.cn");
    } catch {
      return false;
    }
  });
}

function hasConflictingValues(sources: RetrievalSource[]): boolean {
  const valueSets = sources
    .map((source) => source.exactText.match(/\d+(?:\.\d+)?\s*(?:元|月|日|点|时|分|%)?/g)?.join("|") ?? "")
    .filter(Boolean);
  return new Set(valueSets).size > 1;
}
