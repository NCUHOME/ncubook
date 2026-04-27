type LarkSyncInput = {
    source: "AI" | "文档页";
    problemType: "内容有误 / 过时" | "信息不够详细" | "找不到想要的内容" | "AI 回答不够准确" | "其他";
    pagePath?: string | null;
    question?: string | null;
    description?: string | null;
    supplement?: string | null;
};

type LarkTokenCache = {
    token: string;
    expiresAt: number;
};

const FEISHU_API_BASE = "https://open.feishu.cn";
const DEFAULT_BASE_TOKEN = "EgvkbmspHaTCdes74AvcsL64nGg";
const DEFAULT_TABLE_ID = "tbllSr5HwymQ2YAq";

let tokenCache: LarkTokenCache | null = null;

function getLarkConfig() {
    const syncEnabled = (process.env.LARK_FEEDBACK_SYNC_ENABLED || "false").trim().toLowerCase();

    return {
        appId: process.env.LARK_APP_ID || process.env.FEISHU_APP_ID || "",
        appSecret: process.env.LARK_APP_SECRET || process.env.FEISHU_APP_SECRET || "",
        baseToken: process.env.LARK_FEEDBACK_BASE_TOKEN || DEFAULT_BASE_TOKEN,
        tableId: process.env.LARK_FEEDBACK_TABLE_ID || DEFAULT_TABLE_ID,
        enabled: syncEnabled !== "false",
    };
}

function compactText(value: unknown, maxLength: number) {
    if (typeof value !== "string") {
        return "";
    }

    return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function getSyncDescription(lines: Array<[string, string | null | undefined]>) {
    return lines
        .map(([label, value]) => {
            const text = compactText(value, 1200);
            return text ? `${label}：${text}` : "";
        })
        .filter(Boolean)
        .join("\n");
}

async function getTenantAccessToken() {
    const config = getLarkConfig();
    if (!config.appId || !config.appSecret) {
        throw new Error("Lark app credentials are not configured.");
    }

    if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
        return tokenCache.token;
    }

    const response = await fetch(`${FEISHU_API_BASE}/open-apis/auth/v3/tenant_access_token/internal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            app_id: config.appId,
            app_secret: config.appSecret,
        }),
    });
    const payload = await response.json();

    if (!response.ok || payload.code !== 0 || !payload.tenant_access_token) {
        throw new Error(payload.msg || `Failed to get Lark tenant token: ${response.status}`);
    }

    tokenCache = {
        token: payload.tenant_access_token,
        expiresAt: Date.now() + Number(payload.expire ?? 7200) * 1000,
    };

    return tokenCache.token;
}

export async function syncRecordToLarkFeedback(input: LarkSyncInput) {
    const config = getLarkConfig();
    if (!config.enabled || !config.appId || !config.appSecret) {
        return { enabled: false, ok: false as const };
    }

    try {
        const tenantAccessToken = await getTenantAccessToken();
        const response = await fetch(
            `${FEISHU_API_BASE}/open-apis/base/v3/bases/${config.baseToken}/tables/${config.tableId}/records`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${tenantAccessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    "来源（自动填写）": input.source,
                    "问题类型 （必填）": input.problemType,
                    "页面（自动填写）": compactText(input.pagePath, 240),
                    "问题（自动填写）": compactText(input.question, 500) || "未填写问题",
                    "问题类型 （必填）-其他-补充内容": "小家园 Agent 自动同步",
                    "具体问题描述 (选填)": compactText(input.description, 2000),
                    "你希望补充哪方面内容 (选填)": compactText(input.supplement, 1000),
                }),
            }
        );
        const payload = await response.json();

        if (!response.ok || payload.code !== 0) {
            const permissionUrl = payload.error?.permission_violations?.[0]?.url;
            const detail = [
                payload.msg,
                payload.error?.message,
                permissionUrl ? `permission_url=${permissionUrl}` : "",
            ]
                .filter(Boolean)
                .join(" | ");

            throw new Error(detail || `Lark record create failed: ${response.status}`);
        }

        return {
            enabled: true,
            ok: true as const,
            recordId:
                payload.data?.record?.record_id ||
                payload.data?.record_id ||
                payload.data?.record?.record_id_list?.[0],
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown Lark sync error";
        console.warn("Lark feedback sync failed:", message);
        return { enabled: true, ok: false as const, error: message };
    }
}

export async function syncNegativeFeedbackToLark({
    targetType,
    queryLogId,
    pagePath,
    question,
    answer,
    comment,
}: {
    targetType: "agent_answer" | "page";
    queryLogId?: string | null;
    pagePath?: string | null;
    question?: string | null;
    answer?: string | null;
    comment?: string | null;
}) {
    const source = targetType === "agent_answer" ? "AI" : "文档页";
    const problemType = targetType === "agent_answer" ? "AI 回答不够准确" : "内容有误 / 过时";

    return syncRecordToLarkFeedback({
        source,
        problemType,
        pagePath,
        question: question || pagePath || "页面反馈",
        description: getSyncDescription([
            ["反馈", "没帮助"],
            ["Query Log", queryLogId],
            ["页面", pagePath],
            ["问题", question],
            ["回答摘要", answer],
            ["备注", comment],
        ]),
        supplement:
            targetType === "agent_answer"
                ? "复盘回答准确性、检索来源和 Trust Boundary，必要时补充知识库。"
                : "复盘页面内容是否过期、不完整或缺少来源。",
    });
}

export async function syncKnowledgeGapToLark({
    question,
    currentPath,
    queryLogId,
    gapReason,
}: {
    question: string;
    currentPath?: string | null;
    queryLogId?: string | null;
    gapReason: string;
}) {
    return syncRecordToLarkFeedback({
        source: "AI",
        problemType: gapReason === "no_retrieved_context" ? "找不到想要的内容" : "信息不够详细",
        pagePath: currentPath,
        question,
        description: getSyncDescription([
            ["触发原因", gapReason],
            ["Query Log", queryLogId],
            ["页面", currentPath],
            ["问题", question],
        ]),
        supplement: "补充对应知识库资料，或确认该问题是否超出小家园回答范围。",
    });
}
