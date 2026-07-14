export type EvalChecks = {
    apiOk: boolean;
    hasAnswer: boolean;
    hasSourceHeading: boolean;
    hasFollowUpHeading: boolean;
    hasQueryLogId: boolean;
    hasRetrievalState: boolean;
    mentionsRequiredTerms: boolean;
    verificationBoundary: boolean;
};

export type EvalRisk = "low" | "medium" | "high";

export type EvalFailureCategory =
    | "passed"
    | "api_error"
    | "generation_error"
    | "format_error"
    | "logging_error"
    | "retrieval_or_knowledge_gap"
    | "missing_required_content"
    | "trust_boundary";

export type EvalFailureAnalysis = {
    failureCategory: EvalFailureCategory;
    suggestedAction: string;
    failureReasons: string[];
};

const ACTIONS: Record<EvalFailureCategory, string> = {
    passed: "No action needed.",
    api_error: "检查 API 服务、环境变量、模型供应商响应和部署状态。",
    generation_error: "检查模型调用、prompt 输入和流式响应，确认回答能稳定生成。",
    format_error: "收紧回答格式约束，要求所有回答必须包含信息来源和继续追问。",
    logging_error: "检查 query log 写入和 response header 返回，确保每次回答都能被追踪和复盘。",
    retrieval_or_knowledge_gap:
        "检查知识库是否覆盖该问题；若已覆盖，检查切片、标题、metadata 和检索阈值；若未覆盖，记录 knowledge gap 并补充内容。",
    missing_required_content:
        "检查回答是否充分使用已检索上下文；强化 prompt 中关键流程/术语覆盖要求，必要时优化 context 排序或 case 标注。",
    trust_boundary: "强化高风险问题回答边界；涉及政策、资格、金额、时间、成绩、处分等问题必须提示官方核实，禁止承诺结果。",
};

function isWeakRetrieval(retrievalState: string) {
    return retrievalState === "weak" || retrievalState === "none";
}

export function classifyEvalFailure({
    checks,
    retrievalState,
}: {
    checks: EvalChecks;
    retrievalState?: string;
    risk?: EvalRisk;
}): EvalFailureAnalysis {
    const failureReasons = Object.entries(checks)
        .filter(([, passed]) => !passed)
        .map(([name]) => name);

    let failureCategory: EvalFailureCategory = "passed";

    if (!checks.apiOk) {
        failureCategory = "api_error";
    } else if (!checks.hasAnswer) {
        failureCategory = "generation_error";
    } else if (!checks.hasQueryLogId || !checks.hasRetrievalState) {
        failureCategory = "logging_error";
    } else if (!checks.hasSourceHeading || !checks.hasFollowUpHeading) {
        failureCategory = "format_error";
    } else if (!checks.mentionsRequiredTerms && isWeakRetrieval(retrievalState || "")) {
        failureCategory = "retrieval_or_knowledge_gap";
    } else if (!checks.verificationBoundary) {
        failureCategory = "trust_boundary";
    } else if (!checks.mentionsRequiredTerms) {
        failureCategory = "missing_required_content";
    }

    return {
        failureCategory,
        suggestedAction: ACTIONS[failureCategory],
        failureReasons,
    };
}
