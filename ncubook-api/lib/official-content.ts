import { createHash } from "node:crypto";

export type CandidateStatus =
    | "ignored"
    | "watching"
    | "candidate"
    | "drafted"
    | "approved"
    | "rejected"
    | "exported";

export type RiskLevel = "low" | "medium" | "high";

export type OfficialContentInput = {
    sourceKey: string;
    department: string;
    title: string;
    text: string;
    url: string;
    publishedAt?: string | null;
};

export type ContentClassification = {
    status: Extract<CandidateStatus, "ignored" | "watching" | "candidate">;
    riskLevel: RiskLevel;
    reason: string;
    matchedKeywords: string[];
    ignoredKeywords: string[];
    suggestedDocPath: string | null;
    suggestedAction: string;
};

export type OfficialSourceSeed = {
    source_key: string;
    name: string;
    department: string;
    category: string;
    url: string;
    is_enabled: boolean;
};

const POSITIVE_KEYWORDS = [
    "通知",
    "办法",
    "流程",
    "申请",
    "名单",
    "公示",
    "缴费",
    "报修",
    "开放时间",
    "办理",
    "截止",
    "资格",
    "材料",
    "系统入口",
    "服务时间",
    "服务电话",
    "奖学金",
    "助学金",
    "困难认定",
    "转专业",
    "缓考",
    "重修",
    "成绩复核",
    "选课",
    "校园网",
    "一卡通",
    "一码通",
];

const GENERIC_POSITIVE_KEYWORDS = ["通知"];

const IGNORE_KEYWORDS = [
    "会议",
    "调研",
    "走访",
    "讲座",
    "活动报道",
    "新闻",
    "领导",
    "喜报",
    "顺利举行",
    "圆满结束",
    "学习贯彻",
    "座谈会",
    "推进会",
    "交流会",
    "慰问",
    "主题活动",
    "校园文化",
];

const HIGH_RISK_KEYWORDS = [
    "转专业",
    "奖学金",
    "助学金",
    "困难认定",
    "名单",
    "公示",
    "资格",
    "截止",
    "费用",
    "缴费",
    "处分",
    "考试",
    "缓考",
    "重修",
    "成绩",
    "保研",
    "推免",
];

const DOC_RULES: Array<{ path: string; keywords: string[] }> = [
    { path: "docs/academics/major-change.md", keywords: ["转专业", "专业调整"] },
    { path: "docs/academics/exams.md", keywords: ["考试", "缓考", "补考", "重修", "成绩复核"] },
    { path: "docs/academics/curriculum.md", keywords: ["选课", "培养方案", "课程"] },
    { path: "docs/career/awards.md", keywords: ["奖学金", "助学金", "困难认定", "评奖", "评优", "先进个人", "先进集体"] },
    { path: "docs/onboarding/network.md", keywords: ["校园网", "NCUWLAN", "账号", "密码", "网络"] },
    { path: "docs/onboarding/campus-card.md", keywords: ["一卡通", "一码通", "校园卡"] },
    { path: "docs/campus-life/repair.md", keywords: ["报修", "后勤", "服务电话", "服务时间", "寒假", "暑假"] },
];

export const DEFAULT_OFFICIAL_SOURCES: OfficialSourceSeed[] = [
    {
        source_key: "jwc-major-change-2025",
        name: "教务处：2025级转专业通知",
        department: "教务处",
        category: "学业政策",
        url: "https://jwc.ncu.edu.cn/content.jsp?urltype=news.NewsContentUrl&wbnewsid=56481&wbtreeid=1541",
        is_enabled: true,
    },
    {
        source_key: "net-campus-card-code",
        name: "网络与信息中心：校园一码通",
        department: "网络与信息中心",
        category: "校园卡/一码通",
        url: "https://net.ncu.edu.cn/info/1025/4779.htm",
        is_enabled: true,
    },
    {
        source_key: "xxwl-network-repair",
        name: "网络与信息中心：校园网报修服务",
        department: "网络与信息中心",
        category: "校园网",
        url: "https://xxwl.ncu.edu.cn/info/1010/6179.htm",
        is_enabled: true,
    },
    {
        source_key: "hq-service-guide",
        name: "后勤保障处：服务指南",
        department: "后勤保障处",
        category: "后勤报修",
        url: "https://hqbzc.ncu.edu.cn/glyfw/fwzn/373f4b9832c1482d97d60bcf166bb83d.htm",
        is_enabled: true,
    },
    {
        source_key: "xgc-awards",
        name: "学生工作处：本科优秀学生奖学金评定办法",
        department: "学生工作处",
        category: "评奖评优",
        url: "https://xgc.ncu.edu.cn/docs/2024-04/1c8f2a976dbf4f4e9c90e6f8cd189481.pdf",
        is_enabled: true,
    },
    {
        source_key: "xszz-funding",
        name: "学生资助中心：本科学生资助资金管理办法",
        department: "学生资助中心",
        category: "奖助学金",
        url: "https://xszz.ncu.edu.cn/info/1036/4343.htm",
        is_enabled: true,
    },
];

function normalizeText(value: string) {
    return value.trim().replace(/\s+/g, " ");
}

function findMatches(haystack: string, keywords: string[]) {
    return keywords.filter((keyword) => haystack.includes(keyword));
}

export function getSuggestedDocPath(text: string) {
    let bestMatch: { path: string; score: number } | null = null;

    for (const rule of DOC_RULES) {
        const score = rule.keywords.filter((keyword) => text.includes(keyword)).length;

        if (score > 0 && (!bestMatch || score > bestMatch.score)) {
            bestMatch = { path: rule.path, score };
        }
    }

    return bestMatch?.path ?? null;
}

export function classifyOfficialContent(input: OfficialContentInput): ContentClassification {
    const title = normalizeText(input.title);
    const text = normalizeText(input.text).slice(0, 6000);
    const corpus = `${input.department} ${title} ${text}`;
    const positiveMatches = findMatches(corpus, POSITIVE_KEYWORDS);
    const ignoredMatches = findMatches(corpus, IGNORE_KEYWORDS);
    const highRiskMatches = findMatches(corpus, HIGH_RISK_KEYWORDS);
    const suggestedDocPath = getSuggestedDocPath(corpus);
    const substantialPositiveMatches = positiveMatches.filter(
        (keyword) => !GENERIC_POSITIVE_KEYWORDS.includes(keyword)
    );

    if (substantialPositiveMatches.length === 0) {
        return {
            status: "ignored",
            riskLevel: "low",
            reason:
                positiveMatches.length > 0
                    ? "只命中“通知”等泛词，未命中办事、政策、资格、材料、费用、入口等维护关键词。"
                    : "未命中办事、政策、资格、材料、费用、入口等维护关键词。",
            matchedKeywords: positiveMatches,
            ignoredKeywords: ignoredMatches,
            suggestedDocPath,
            suggestedAction: "忽略，不进入内容运营队列。",
        };
    }

    if (ignoredMatches.length > 0 && substantialPositiveMatches.length < 2 && highRiskMatches.length === 0) {
        return {
            status: "ignored",
            riskLevel: "low",
            reason: `更像新闻/宣传内容，命中排除词：${ignoredMatches.join("、")}。`,
            matchedKeywords: positiveMatches,
            ignoredKeywords: ignoredMatches,
            suggestedDocPath,
            suggestedAction: "忽略，不生成草稿。",
        };
    }

    const riskLevel: RiskLevel =
        highRiskMatches.length > 0 ? "high" : positiveMatches.length >= 3 ? "medium" : "low";

    return {
        status: riskLevel === "low" && !suggestedDocPath ? "watching" : "candidate",
        riskLevel,
        reason: `命中内容维护关键词：${positiveMatches.slice(0, 6).join("、")}。${
            highRiskMatches.length > 0
                ? `涉及 ${highRiskMatches.slice(0, 4).join("、")}，需要人工审核。`
                : "建议人工判断是否需要更新手册。"
        }`,
        matchedKeywords: positiveMatches,
        ignoredKeywords: ignoredMatches,
        suggestedDocPath,
        suggestedAction: suggestedDocPath
            ? `建议更新 ${suggestedDocPath}`
            : "建议先观察，暂不生成正式草稿。",
    };
}

export function hashText(value: string) {
    return createHash("sha256").update(value).digest("hex");
}

export function stripHtml(html: string) {
    return html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, " ")
        .trim();
}

export function extractTitle(html: string, fallback: string) {
    const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    if (h1) {
        return stripHtml(h1[1]).slice(0, 160) || fallback;
    }

    const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (title) {
        return stripHtml(title[1]).replace(/-南昌大学.*$/, "").slice(0, 160) || fallback;
    }

    return fallback;
}

export function extractPublishedAt(html: string) {
    const dateMatch = html.match(/20\d{2}[-/.年]\d{1,2}[-/.月]\d{1,2}/);
    if (!dateMatch) {
        return null;
    }

    return dateMatch[0].replace(/[年月/.]/g, "-").replace(/日$/, "");
}

export function buildDraftMarkdown(input: {
    title: string;
    sourceUrl: string;
    department: string;
    publishedAt?: string | null;
    contentExcerpt: string;
    classification: ContentClassification;
}) {
    const title = input.title.replace(/^关于/, "").replace(/的通知$/, "");
    const published = input.publishedAt || "待核实";
    const target = input.classification.suggestedDocPath || "待确认";

    return `## ${title}

:::info 官方来源与核验状态
来源：[${input.title}](${input.sourceUrl})  
发布部门：${input.department}  
发布时间：${published}  
建议更新页面：\`${target}\`  
风险级别：${input.classification.riskLevel}
:::

### 学生可读摘要

${input.contentExcerpt.slice(0, 240)}${input.contentExcerpt.length > 240 ? "……" : ""}

### 适用对象和时间范围

- 适用对象：待人工根据官方原文确认。
- 时间范围：以官方通知发布时间和正文要求为准。

### 办理路径 / 注意事项

- 先阅读官方通知原文，确认是否与自己的年级、学院、校区有关。
- 涉及申请、资格、材料、名额、费用或截止时间时，以官方通知和学院细则为准。
- 如正文包含系统入口、服务电话或办理地点，发布前需要人工再次核对。

### 需人工核实字段

- 具体适用年级 / 学院
- 申请或办理截止时间
- 所需材料和提交入口
- 费用、名额、资格条件或服务时间

### 风险提示

这条信息由 AI 根据官网来源生成初稿，尚未正式发布。涉及资格、名额、费用、处分、奖助学金、转专业等权益相关内容时，必须以官方通知或学院细则为准。
`;
}
