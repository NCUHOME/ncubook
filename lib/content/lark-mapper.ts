import {
  InformationCard,
  isReviewStatus,
  isRiskLevel,
  isTrustStatus,
} from "@/lib/content/schema";

type LarkFieldValue = string | number | boolean | string[] | null | undefined;

export type LarkRecord = {
  record_id: string;
  fields: Record<string, LarkFieldValue>;
};

function getString(fields: LarkRecord["fields"], key: string, fallback = "") {
  const value = fields[key];
  if (Array.isArray(value)) return value.join("、");
  if (value === null || value === undefined) return fallback;
  return String(value).trim() || fallback;
}

function getStringList(fields: LarkRecord["fields"], key: string) {
  const value = fields[key];
  if (Array.isArray(value)) {
    return value.map(String).map((item) => item.trim()).filter(Boolean);
  }
  if (typeof value !== "string") return [];
  return value
    .split(/[,\n，、]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getLines(fields: LarkRecord["fields"], key: string) {
  return getString(fields, key)
    .split(/\n+/)
    .map((line) => line.replace(/^\s*\d+[.、)]\s*/, "").trim())
    .filter(Boolean);
}

export function mapLarkRecordToCard(record: LarkRecord): InformationCard {
  const reviewStatusRaw = getString(record.fields, "审核状态", "draft");
  const trustStatusRaw = getString(record.fields, "可信状态", "待核实");
  const riskLevelRaw = getString(record.fields, "风险等级", "low");

  return {
    slug: record.record_id,
    title: getString(record.fields, "标题", "未命名信息"),
    category: getString(record.fields, "分类", "未分类"),
    tags: getStringList(record.fields, "场景标签"),
    audience: getString(record.fields, "适用对象", "所有同学"),
    conclusion: getString(record.fields, "核心结论", "这条信息还在整理中。"),
    steps: getLines(record.fields, "办理步骤"),
    notes: getLines(record.fields, "注意事项"),
    sourceType: getString(record.fields, "来源类型", "待核实"),
    sourceUrl: getString(record.fields, "来源链接"),
    updatedAt: getString(record.fields, "更新时间", "待更新"),
    trustStatus: isTrustStatus(trustStatusRaw) ? trustStatusRaw : "待核实",
    reviewStatus: isReviewStatus(reviewStatusRaw) ? reviewStatusRaw : "draft",
    riskLevel: isRiskLevel(riskLevelRaw) ? riskLevelRaw : "low",
    relatedCards: getStringList(record.fields, "关联卡片"),
  };
}

export function filterPublishedCards(cards: InformationCard[]) {
  return cards.filter((card) => card.reviewStatus === "published");
}
