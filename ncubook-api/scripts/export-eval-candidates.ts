import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
    buildEvalCandidates,
    type FeedbackCandidateRow,
    type KnowledgeGapCandidateRow,
    type QueryLogCandidateRow,
} from "../lib/eval-candidates";

const DAY_MS = 24 * 60 * 60 * 1000;

function loadLocalEnv() {
    const envPath = path.resolve(process.cwd(), ".env.local");
    return readFile(envPath, "utf8")
        .then((raw) => {
            for (const line of raw.split(/\n/)) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith("#")) continue;
                const index = trimmed.indexOf("=");
                if (index > 0 && !process.env[trimmed.slice(0, index)]) {
                    process.env[trimmed.slice(0, index)] = trimmed.slice(index + 1);
                }
            }
        })
        .catch(() => undefined);
}

function countBy<T extends string>(values: T[]) {
    return values.reduce(
        (counts, value) => {
            counts[value] = (counts[value] ?? 0) + 1;
            return counts;
        },
        {} as Record<T, number>
    );
}

async function main() {
    await loadLocalEnv();

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    }

    const windowDays = Number(process.env.EVAL_CANDIDATE_WINDOW_DAYS || 30);
    const limit = Number(process.env.EVAL_CANDIDATE_LIMIT || 50);
    const since = new Date(Date.now() - windowDays * DAY_MS).toISOString();
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const weakLogsQuery = supabase
        .from("agent_query_logs")
        .select("id, question, current_path, retrieval_state, source_count, max_similarity, latency_ms, created_at")
        .gte("created_at", since)
        .in("retrieval_state", ["weak", "none"])
        .order("created_at", { ascending: false })
        .limit(limit);

    const feedbackQuery = supabase
        .from("agent_feedback")
        .select("id, vote, target_type, query_log_id, page_path, question, comment, answer_excerpt, created_at")
        .gte("created_at", since)
        .eq("vote", "not_helpful")
        .order("created_at", { ascending: false })
        .limit(limit);

    const gapsQuery = supabase
        .from("agent_knowledge_gaps")
        .select("id, sample_question, source_path, trigger_reason, status, occurrence_count, last_seen_at, resolution_note")
        .in("status", ["open", "triaged", "in_progress"])
        .order("occurrence_count", { ascending: false })
        .order("last_seen_at", { ascending: false })
        .limit(limit);

    const [weakLogsResult, feedbackResult, gapsResult] = await Promise.all([
        weakLogsQuery,
        feedbackQuery,
        gapsQuery,
    ]);

    const firstError = weakLogsResult.error || feedbackResult.error || gapsResult.error;
    if (firstError) {
        throw firstError;
    }

    const feedbackRows = (feedbackResult.data ?? []) as FeedbackCandidateRow[];
    const linkedLogIds = feedbackRows
        .map((row) => row.query_log_id)
        .filter((id): id is string => Boolean(id));

    let linkedLogs: QueryLogCandidateRow[] = [];
    if (linkedLogIds.length > 0) {
        const { data, error } = await supabase
            .from("agent_query_logs")
            .select("id, question, current_path, retrieval_state, source_count, max_similarity, latency_ms, created_at")
            .in("id", linkedLogIds);

        if (error) {
            throw error;
        }

        linkedLogs = (data ?? []) as QueryLogCandidateRow[];
    }

    const queryLogs = [
        ...((weakLogsResult.data ?? []) as QueryLogCandidateRow[]),
        ...linkedLogs,
    ];

    const candidates = buildEvalCandidates({
        queryLogs,
        feedback: feedbackRows,
        knowledgeGaps: (gapsResult.data ?? []) as KnowledgeGapCandidateRow[],
    }).slice(0, limit);

    const outDir = path.join(process.cwd(), "evals/candidates");
    await mkdir(outDir, { recursive: true });

    const summary = {
        generatedAt: new Date().toISOString(),
        windowDays,
        total: candidates.length,
        countsBySource: countBy(candidates.map((candidate) => candidate.source)),
        countsByFailureHint: countBy(candidates.map((candidate) => candidate.failure_hint)),
        note: "Candidate pool only. Human review is required before adding items to the formal eval set.",
        candidates,
    };

    const outPath = path.join(outDir, `eval-candidates-${Date.now()}.json`);
    await writeFile(outPath, JSON.stringify(summary, null, 2));

    console.log(`Eval candidates exported: ${candidates.length}`);
    console.log(`Counts by source: ${JSON.stringify(summary.countsBySource)}`);
    console.log(`Counts by failure hint: ${JSON.stringify(summary.countsByFailureHint)}`);
    console.log(`Result saved to ${outPath}`);
}

main().catch((error) => {
    console.error("Failed to export eval candidates:", error);
    process.exit(1);
});
