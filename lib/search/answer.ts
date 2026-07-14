import type { CardSearchResult } from "@/lib/search/search-cards";

export type SearchAnswer = {
  state: "answered" | "no_source";
  conclusion: string;
  steps: string[];
  notes: string[];
  sources: Array<{
    title: string;
    slug: string;
    trustStatus: string;
    sourceUrl: string;
  }>;
  followUps: string[];
  verificationNotice: string;
};

const OFFICIAL_VERIFICATION_TERMS = [
  "费用",
  "多少钱",
  "截止",
  "时间",
  "资格",
  "条件",
  "成绩",
  "绩点",
  "处分",
  "政策",
  "名额",
  "审核",
  "收费",
  "报销",
];

export function requiresOfficialVerification(query: string) {
  return OFFICIAL_VERIFICATION_TERMS.some((term) => query.includes(term));
}

export function composeSearchAnswer(query: string, results: CardSearchResult[]): SearchAnswer {
  const reliableResults = results.filter((result) =>
    ["官方来源", "同学经验已核实"].includes(result.card.trustStatus),
  );
  const top = reliableResults[0];

  if (!top || top.score < 8) {
    return {
      state: "no_source",
      conclusion: "暂未找到可靠信息，这个问题需要同学或维护者进一步核实。",
      steps: [],
      notes: ["你可以提交修正或补充线索，后续会进入内容整理队列。"],
      sources: [],
      followUps: ["换一个更具体的关键词再搜", "提交这个问题给维护者"],
      verificationNotice: requiresOfficialVerification(query)
        ? "涉及费用、资格、截止时间、成绩或政策解释的信息，请以官方通知或人工确认为准。"
        : "",
    };
  }

  const sourceThreshold = Math.max(20, top.score * 0.5);
  const sourceResults = reliableResults.filter((result) => result.score >= sourceThreshold).slice(0, 3);
  const cards = (sourceResults.length > 0 ? sourceResults : [top]).map((result) => result.card);
  const verificationNotice =
    requiresOfficialVerification(query) || cards.some((card) => card.riskLevel !== "low")
      ? "涉及费用、资格、截止时间、成绩或政策解释的信息，请以官方通知或人工确认为准。"
      : "";

  return {
    state: "answered",
    conclusion: top.card.conclusion,
    steps: top.card.steps.slice(0, 4),
    notes: [...top.card.notes, verificationNotice].filter(Boolean).slice(0, 4),
    sources: cards.map((card) => ({
      title: card.title,
      slug: card.slug,
      trustStatus: card.trustStatus,
      sourceUrl: card.sourceUrl,
    })),
    followUps: buildFollowUps(top.card.title, top.card.tags),
    verificationNotice,
  };
}

function buildFollowUps(title: string, tags: string[]) {
  const primaryTag = tags[0] || title;
  return [
    `${primaryTag}需要准备什么？`,
    `${primaryTag}有没有官方入口？`,
    `这个信息最近更新了吗？`,
  ];
}
