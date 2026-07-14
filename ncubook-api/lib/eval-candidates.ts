export type CandidateSource = "query_log" | "feedback" | "knowledge_gap";
export type CandidateRisk = "low" | "medium" | "high";
export type CandidateFailureHint =
    | "retrieval_or_knowledge_gap"
    | "answer_quality_or_trust_boundary"
    | "high_frequency_gap";

export type QueryLogCandidateRow = {
    id: string;
    question: string;
    current_path?: string | null;
    retrieval_state?: string | null;
    source_count?: number | null;
    max_similarity?: number | null;
    latency_ms?: number | null;
    created_at: string;
};

export type FeedbackCandidateRow = {
    id: string;
    vote: "helpful" | "not_helpful";
    target_type?: "agent_answer" | "page" | string | null;
    query_log_id?: string | null;
    page_path?: string | null;
    question?: string | null;
    comment?: string | null;
    answer_excerpt?: string | null;
    created_at: string;
};

export type KnowledgeGapCandidateRow = {
    id: string;
    sample_question: string;
    source_path?: string | null;
    trigger_reason?: string | null;
    status?: string | null;
    occurrence_count?: number | null;
    last_seen_at: string;
    resolution_note?: string | null;
};

export type EvalCandidate = {
    query: string;
    source: CandidateSource;
    source_id: string;
    source_label: string;
    current_path: string | null;
    retrieval_state: string | null;
    source_count: number | null;
    max_similarity: number | null;
    feedback_vote: "helpful" | "not_helpful" | null;
    occurrence_count: number | null;
    suggested_risk: CandidateRisk;
    failure_hint: CandidateFailureHint;
    suggested_action: string;
    selection_reason: string;
    priority_score: number;
    created_at: string;
};

const HIGH_RISK_PATTERN = /转专业|奖学金|助学金|保研|重修|补考|考试|成绩|绩点|处分|资格|名额|费用|缴费|退款|退费|截止|时间|学籍|毕业|挂科/;
const MEDIUM_RISK_PATTERN = /校园卡|挂失|补办|医保|报修|宿舍|宽带|校园网|图书馆|证明|材料|办理|申请|入口|电话|地址/;

function compactQuery(value: string | null | undefined) {
    return String(value || "").trim().replace(/\s+/g, " ");
}

function isWeakOrNoRetrieval(value: string | null | undefined) {
    return value === "weak" || value === "none";
}

export function inferCandidateRisk(query: string): CandidateRisk {
    if (HIGH_RISK_PATTERN.test(query)) {
        return "high";
    }

    if (MEDIUM_RISK_PATTERN.test(query)) {
        return "medium";
    }

    return "low";
}

function riskBoost(risk: CandidateRisk) {
    return risk === "high" ? 15 : risk === "medium" ? 6 : 0;
}

function clampPriority(value: number) {
    return Math.max(0, Math.min(100, Math.round(value)));
}

function actionForFailureHint(hint: CandidateFailureHint, risk: CandidateRisk) {
    if (hint === "retrieval_or_knowledge_gap") {
        return "检查知识库是否覆盖该问题；若已覆盖，检查切片、标题、metadata 和检索阈值；若未覆盖，记录 knowledge gap 并补充内容。";
    }

    if (hint === "high_frequency_gap") {
        return "优先分诊该知识缺口，补充官方来源或手册内容；解决后加入正式 Eval 做回归测试。";
    }

    if (risk === "high") {
        return "回看原回答和来源，检查是否没有满足真实需求或没有守住高风险信任边界；必要时优化 prompt 和风险提示。";
    }

    return "回看原回答、来源和用户反馈，判断是回答不够直接、来源不匹配，还是信息提炼不足；必要时优化 prompt。";
}

export function candidateFromQueryLog(row: QueryLogCandidateRow): EvalCandidate | null {
    const query = compactQuery(row.question);
    if (!query || !isWeakOrNoRetrieval(row.retrieval_state)) {
        return null;
    }

    const suggestedRisk = inferCandidateRisk(query);
    const priority = clampPriority(
        (row.retrieval_state === "none" ? 82 : 70) + riskBoost(suggestedRisk)
    );

    return {
        query,
        source: "query_log",
        source_id: row.id,
        source_label: "弱命中/未命中 Query Log",
        current_path: row.current_path ?? null,
        retrieval_state: row.retrieval_state ?? null,
        source_count: row.source_count ?? null,
        max_similarity: row.max_similarity ?? null,
        feedback_vote: null,
        occurrence_count: null,
        suggested_risk: suggestedRisk,
        failure_hint: "retrieval_or_knowledge_gap",
        suggested_action: actionForFailureHint("retrieval_or_knowledge_gap", suggestedRisk),
        selection_reason: `retrieval_state=${row.retrieval_state}`,
        priority_score: priority,
        created_at: row.created_at,
    };
}

export function candidateFromFeedback(
    row: FeedbackCandidateRow,
    linkedQueryLog?: QueryLogCandidateRow
): EvalCandidate | null {
    if (row.vote !== "not_helpful") {
        return null;
    }

    const query = compactQuery(row.question || linkedQueryLog?.question || row.page_path || row.comment);
    if (!query) {
        return null;
    }

    const retrievalState = linkedQueryLog?.retrieval_state ?? null;
    const suggestedRisk = inferCandidateRisk(query);
    const failureHint: CandidateFailureHint = isWeakOrNoRetrieval(retrievalState)
        ? "retrieval_or_knowledge_gap"
        : "answer_quality_or_trust_boundary";
    const priority = clampPriority(88 + riskBoost(suggestedRisk));

    return {
        query,
        source: "feedback",
        source_id: row.id,
        source_label: "用户没帮助反馈",
        current_path: row.page_path ?? linkedQueryLog?.current_path ?? null,
        retrieval_state: retrievalState,
        source_count: linkedQueryLog?.source_count ?? null,
        max_similarity: linkedQueryLog?.max_similarity ?? null,
        feedback_vote: "not_helpful",
        occurrence_count: null,
        suggested_risk: suggestedRisk,
        failure_hint: failureHint,
        suggested_action: actionForFailureHint(failureHint, suggestedRisk),
        selection_reason: linkedQueryLog
            ? `not_helpful + retrieval_state=${retrievalState || "unknown"}`
            : "not_helpful feedback",
        priority_score: priority,
        created_at: row.created_at,
    };
}

export function candidateFromKnowledgeGap(row: KnowledgeGapCandidateRow): EvalCandidate | null {
    const query = compactQuery(row.sample_question);
    if (!query) {
        return null;
    }

    const occurrenceCount = Number(row.occurrence_count ?? 1);
    const suggestedRisk = inferCandidateRisk(query);
    const priority = clampPriority(64 + Math.min(20, occurrenceCount * 3) + riskBoost(suggestedRisk));

    return {
        query,
        source: "knowledge_gap",
        source_id: row.id,
        source_label: "高频知识缺口",
        current_path: row.source_path ?? null,
        retrieval_state: row.trigger_reason === "no_retrieved_context" ? "none" : "weak",
        source_count: null,
        max_similarity: null,
        feedback_vote: null,
        occurrence_count: occurrenceCount,
        suggested_risk: suggestedRisk,
        failure_hint: "high_frequency_gap",
        suggested_action: actionForFailureHint("high_frequency_gap", suggestedRisk),
        selection_reason: `status=${row.status || "unknown"}, occurrence_count=${occurrenceCount}`,
        priority_score: priority,
        created_at: row.last_seen_at,
    };
}

export function buildEvalCandidates({
    queryLogs,
    feedback,
    knowledgeGaps,
}: {
    queryLogs: QueryLogCandidateRow[];
    feedback: FeedbackCandidateRow[];
    knowledgeGaps: KnowledgeGapCandidateRow[];
}) {
    const queryLogById = new Map(queryLogs.map((row) => [row.id, row]));
    const candidates = [
        ...queryLogs.map(candidateFromQueryLog),
        ...feedback.map((row) => candidateFromFeedback(row, row.query_log_id ? queryLogById.get(row.query_log_id) : undefined)),
        ...knowledgeGaps.map(candidateFromKnowledgeGap),
    ].filter((candidate): candidate is EvalCandidate => Boolean(candidate));

    const seen = new Set<string>();
    return candidates
        .filter((candidate) => {
            const key = `${candidate.source}:${candidate.query}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        })
        .sort((a, b) => {
            if (b.priority_score !== a.priority_score) {
                return b.priority_score - a.priority_score;
            }
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
}
