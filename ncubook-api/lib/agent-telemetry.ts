import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { syncKnowledgeGapToLark } from "@/lib/lark-feedback";

export type RetrievedDocument = {
    id?: string | number;
    content?: string;
    metadata?: {
        title?: string;
        url?: string;
        heading?: string;
        [key: string]: unknown;
    };
    similarity?: number;
};

export type RetrievalState = "strong" | "partial" | "weak" | "none";

const STRONG_THRESHOLD = 0.62;
const PARTIAL_THRESHOLD = 0.45;

function normalizeQuestion(question: string) {
    return question
        .trim()
        .toLowerCase()
        .replace(/[，。！？、,.!?;；:：'"“”‘’()[\]{}<>《》\s]+/g, "")
        .slice(0, 120);
}

export function createQuestionFingerprint(question: string) {
    const normalized = normalizeQuestion(question);
    return createHash("sha256").update(normalized || question).digest("hex").slice(0, 32);
}

export function summarizeRetrieval(documents: RetrievedDocument[]) {
    const similarities = documents
        .map((doc) => Number(doc.similarity ?? 0))
        .filter((value) => Number.isFinite(value));
    const maxSimilarity = similarities.length > 0 ? Math.max(...similarities) : 0;
    const sourceCount = documents.length;

    let retrievalState: RetrievalState = "none";
    if (sourceCount > 0 && maxSimilarity >= STRONG_THRESHOLD) {
        retrievalState = "strong";
    } else if (sourceCount > 0 && maxSimilarity >= PARTIAL_THRESHOLD) {
        retrievalState = "partial";
    } else if (sourceCount > 0) {
        retrievalState = "weak";
    }

    const shouldCreateGap = retrievalState === "none" || retrievalState === "weak";
    const gapReason =
        retrievalState === "none"
            ? "no_retrieved_context"
            : retrievalState === "weak"
                ? "low_retrieval_confidence"
                : null;

    const topSources = documents.slice(0, 5).map((doc) => ({
        title: doc.metadata?.title ?? "未知页面",
        url: doc.metadata?.url ?? "",
        heading: doc.metadata?.heading ?? "",
        similarity: Number(doc.similarity ?? 0),
    }));

    return {
        maxSimilarity,
        sourceCount,
        retrievalState,
        shouldCreateGap,
        gapReason,
        topSources,
    };
}

async function upsertKnowledgeGap({
    supabase,
    question,
    currentPath,
    queryLogId,
    gapReason,
}: {
    supabase: SupabaseClient;
    question: string;
    currentPath?: string;
    queryLogId: string;
    gapReason: string;
}) {
    const fingerprint = createQuestionFingerprint(question);

    const { data: existing, error: selectError } = await supabase
        .from("agent_knowledge_gaps")
        .select("id, occurrence_count")
        .eq("fingerprint", fingerprint)
        .maybeSingle();

    if (selectError) {
        throw selectError;
    }

    if (existing) {
        const { error } = await supabase
            .from("agent_knowledge_gaps")
            .update({
                occurrence_count: Number(existing.occurrence_count ?? 0) + 1,
                last_seen_at: new Date().toISOString(),
                latest_query_log_id: queryLogId,
                source_path: currentPath ?? null,
                trigger_reason: gapReason,
                status: "open",
            })
            .eq("id", existing.id);

        if (error) {
            throw error;
        }
        return false;
    }

    const { error } = await supabase.from("agent_knowledge_gaps").insert({
        fingerprint,
        sample_question: question,
        source_path: currentPath ?? null,
        trigger_reason: gapReason,
        latest_query_log_id: queryLogId,
        occurrence_count: 1,
        status: "open",
    });

    if (error) {
        throw error;
    }

    return true;
}

export async function recordAgentQuery({
    supabase,
    queryLogId,
    question,
    currentPath,
    userAgent,
    latencyMs,
    retrieval,
}: {
    supabase: SupabaseClient;
    queryLogId: string;
    question: string;
    currentPath?: string;
    userAgent?: string | null;
    latencyMs: number;
    retrieval: ReturnType<typeof summarizeRetrieval>;
}) {
    try {
        const { error } = await supabase.from("agent_query_logs").insert({
            id: queryLogId,
            question,
            current_path: currentPath ?? null,
            user_agent: userAgent ?? null,
            retrieval_state: retrieval.retrievalState,
            source_count: retrieval.sourceCount,
            max_similarity: retrieval.maxSimilarity,
            top_sources: retrieval.topSources,
            should_create_gap: retrieval.shouldCreateGap,
            gap_reason: retrieval.gapReason,
            latency_ms: latencyMs,
        });

        if (error) {
            throw error;
        }

        if (retrieval.shouldCreateGap && retrieval.gapReason) {
            const createdGap = await upsertKnowledgeGap({
                supabase,
                question,
                currentPath,
                queryLogId,
                gapReason: retrieval.gapReason,
            });

            if (createdGap) {
                await syncKnowledgeGapToLark({
                    question,
                    currentPath,
                    queryLogId,
                    gapReason: retrieval.gapReason,
                });
            }
        }
    } catch (error) {
        console.warn("Agent telemetry write failed:", error);
    }
}
