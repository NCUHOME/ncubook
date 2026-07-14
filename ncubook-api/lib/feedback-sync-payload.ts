export type FeedbackSource = "AI" | "文档页";
export type FeedbackProblemType =
    | "内容有误 / 过时"
    | "信息不够详细"
    | "找不到想要的内容"
    | "AI 回答不够准确"
    | "其他";

export type LarkFeedbackFields = {
    "来源（自动填写）": FeedbackSource;
    "问题类型 （必填）": FeedbackProblemType;
    "页面（自动填写）": string;
    "问题（自动填写）": string;
    "问题类型 （必填）-其他-补充内容": string;
    "具体问题描述 (选填)": string;
    "你希望补充哪方面内容 (选填)": string;
};

const AGENT_SYNC_MARKER = "[AgentSync]";

export function compactText(value: unknown, maxLength: number) {
    if (typeof value !== "string") {
        return "";
    }

    return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

export function buildSyncKey(type: "feedback" | "gap", id: string) {
    return `${type}:${id}`;
}

export function buildSyncMarkerLine(syncKey: string) {
    return `${AGENT_SYNC_MARKER} ${syncKey}`;
}

export function extractSyncKey(value: unknown) {
    if (typeof value !== "string") {
        return null;
    }

    const match = value.match(/\[AgentSync\]\s+([^\s]+)/);
    return match?.[1] ?? null;
}

function buildLines(lines: Array<[string, string | null | undefined]>) {
    return lines
        .map(([label, value]) => {
            const text = compactText(value, 1200);
            return text ? `${label}：${text}` : "";
        })
        .filter(Boolean)
        .join("\n");
}

function withSyncMarker(syncKey: string, body: string) {
    const detail = compactText(body, 2000);
    return detail ? `${buildSyncMarkerLine(syncKey)}\n${detail}` : buildSyncMarkerLine(syncKey);
}

export function buildNegativeFeedbackRecord({
    id,
    targetType,
    queryLogId,
    pagePath,
    question,
    answer,
    comment,
}: {
    id: string;
    targetType: "agent_answer" | "page";
    queryLogId?: string | null;
    pagePath?: string | null;
    question?: string | null;
    answer?: string | null;
    comment?: string | null;
}) {
    const syncKey = buildSyncKey("feedback", id);
    const source: FeedbackSource = targetType === "agent_answer" ? "AI" : "文档页";
    const problemType: FeedbackProblemType =
        targetType === "agent_answer" ? "AI 回答不够准确" : "内容有误 / 过时";

    return {
        syncKey,
        fields: {
            "来源（自动填写）": source,
            "问题类型 （必填）": problemType,
            "页面（自动填写）": compactText(pagePath, 240),
            "问题（自动填写）": compactText(question, 500) || compactText(pagePath, 240) || "页面反馈",
            "问题类型 （必填）-其他-补充内容": "小家园 Agent 自动同步",
            "具体问题描述 (选填)": withSyncMarker(
                syncKey,
                buildLines([
                    ["反馈", "没帮助"],
                    ["Query Log", queryLogId],
                    ["页面", pagePath],
                    ["问题", question],
                    ["回答摘要", answer],
                    ["备注", comment],
                ])
            ),
            "你希望补充哪方面内容 (选填)": compactText(
                targetType === "agent_answer"
                    ? "复盘回答准确性、检索来源和 Trust Boundary，必要时补充知识库。"
                    : "复盘页面内容是否过期、不完整或缺少来源。",
                1000
            ),
        } satisfies LarkFeedbackFields,
    };
}

export function buildKnowledgeGapRecord({
    id,
    question,
    currentPath,
    queryLogId,
    gapReason,
    occurrenceCount,
    status,
}: {
    id: string;
    question: string;
    currentPath?: string | null;
    queryLogId?: string | null;
    gapReason: string;
    occurrenceCount?: number | null;
    status?: string | null;
}) {
    const syncKey = buildSyncKey("gap", id);
    const problemType: FeedbackProblemType =
        gapReason === "no_retrieved_context" ? "找不到想要的内容" : "信息不够详细";

    return {
        syncKey,
        fields: {
            "来源（自动填写）": "AI",
            "问题类型 （必填）": problemType,
            "页面（自动填写）": compactText(currentPath, 240),
            "问题（自动填写）": compactText(question, 500) || "知识缺口",
            "问题类型 （必填）-其他-补充内容": "小家园 Agent 自动同步",
            "具体问题描述 (选填)": withSyncMarker(
                syncKey,
                buildLines([
                    ["触发原因", gapReason],
                    ["Query Log", queryLogId],
                    ["页面", currentPath],
                    ["问题", question],
                    ["出现次数", occurrenceCount ? String(occurrenceCount) : null],
                    ["状态", status],
                ])
            ),
            "你希望补充哪方面内容 (选填)": compactText(
                "补充对应知识库资料，或确认该问题是否超出小家园回答范围。",
                1000
            ),
        } satisfies LarkFeedbackFields,
    };
}
