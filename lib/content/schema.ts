export const TRUST_STATUSES = [
  "官方来源",
  "同学经验已核实",
  "待核实",
  "可能过期",
] as const;

export const REVIEW_STATUSES = [
  "draft",
  "reviewing",
  "published",
  "archived",
] as const;

export const RISK_LEVELS = ["low", "medium", "high"] as const;

export type TrustStatus = (typeof TRUST_STATUSES)[number];
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];
export type RiskLevel = (typeof RISK_LEVELS)[number];

export type InformationCard = {
  slug: string;
  title: string;
  category: string;
  tags: string[];
  audience: string;
  conclusion: string;
  steps: string[];
  notes: string[];
  sourceType: string;
  sourceUrl: string;
  updatedAt: string;
  trustStatus: TrustStatus;
  reviewStatus: ReviewStatus;
  riskLevel: RiskLevel;
  relatedCards: string[];
};

export function isTrustStatus(value: unknown): value is TrustStatus {
  return typeof value === "string" && TRUST_STATUSES.includes(value as TrustStatus);
}

export function isReviewStatus(value: unknown): value is ReviewStatus {
  return typeof value === "string" && REVIEW_STATUSES.includes(value as ReviewStatus);
}

export function isRiskLevel(value: unknown): value is RiskLevel {
  return typeof value === "string" && RISK_LEVELS.includes(value as RiskLevel);
}
