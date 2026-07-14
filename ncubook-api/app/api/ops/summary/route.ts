import { getCorsHeaders } from "@/lib/cors";
import { getSupabase } from "@/lib/supabase";

type SupabaseQueryError = {
    message?: string;
    details?: string;
    hint?: string;
    code?: string;
};

type RecentLog = {
    latency_ms?: number | null;
};

type GapStatusRow = {
    status?: string | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const GAP_STATUSES = ["open", "triaged", "in_progress", "resolved", "ignored"] as const;

function jsonResponse(body: unknown, init: ResponseInit = {}) {
    const headers = new Headers(init.headers);
    headers.set("Content-Type", "application/json");
    headers.set("Cache-Control", "no-store");

    return new Response(JSON.stringify(body), {
        ...init,
        headers,
    });
}

function serializeError(error: SupabaseQueryError | null) {
    if (!error) {
        return null;
    }

    return {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
    };
}

function requireOpsToken(req: Request) {
    const requiredToken = process.env.OPS_READ_TOKEN;
    if (!requiredToken) {
        return true;
    }

    const url = new URL(req.url);
    const providedToken = req.headers.get("x-ops-token") || url.searchParams.get("token");

    return providedToken === requiredToken;
}

export async function OPTIONS(req: Request) {
    const origin = req.headers.get("origin");
    return new Response(null, {
        status: 204,
        headers: getCorsHeaders(origin, "GET, OPTIONS"),
    });
}

export async function GET(req: Request) {
    const origin = req.headers.get("origin");
    const corsHeaders = getCorsHeaders(origin, "GET, OPTIONS");

    if (!requireOpsToken(req)) {
        return jsonResponse(
            { error: "unauthorized" },
            { status: 401, headers: corsHeaders }
        );
    }

    const supabase = getSupabase();
    const since = new Date(Date.now() - 7 * DAY_MS).toISOString();

    const [
        totalResult,
        weakResult,
        openGapResult,
        feedbackResult,
        helpfulResult,
        notHelpfulResult,
        gapStatusResult,
        negativeFeedbackResult,
        latencyResult,
        recentGapsResult,
        recentLogsResult,
    ] = await Promise.all([
        supabase
            .from("agent_query_logs")
            .select("id", { count: "exact", head: true })
            .gte("created_at", since),
        supabase
            .from("agent_query_logs")
            .select("id", { count: "exact", head: true })
            .gte("created_at", since)
            .in("retrieval_state", ["weak", "none"]),
        supabase
            .from("agent_knowledge_gaps")
            .select("id", { count: "exact", head: true })
            .eq("status", "open"),
        supabase
            .from("agent_feedback")
            .select("id", { count: "exact", head: true })
            .gte("created_at", since),
        supabase
            .from("agent_feedback")
            .select("id", { count: "exact", head: true })
            .gte("created_at", since)
            .eq("vote", "helpful"),
        supabase
            .from("agent_feedback")
            .select("id", { count: "exact", head: true })
            .gte("created_at", since)
            .eq("vote", "not_helpful"),
        supabase
            .from("agent_knowledge_gaps")
            .select("status"),
        supabase
            .from("agent_feedback")
            .select("id, target_type, query_log_id, page_path, question, answer_excerpt, comment, created_at")
            .gte("created_at", since)
            .eq("vote", "not_helpful")
            .order("created_at", { ascending: false })
            .limit(10),
        supabase
            .from("agent_query_logs")
            .select("latency_ms")
            .gte("created_at", since)
            .not("latency_ms", "is", null)
            .order("created_at", { ascending: false })
            .limit(200),
        supabase
            .from("agent_knowledge_gaps")
            .select("id, sample_question, source_path, trigger_reason, status, occurrence_count, last_seen_at, resolution_note")
            .order("last_seen_at", { ascending: false })
            .limit(8),
        supabase
            .from("agent_query_logs")
            .select("id, question, current_path, retrieval_state, source_count, max_similarity, latency_ms, created_at, top_sources")
            .order("created_at", { ascending: false })
            .limit(12),
    ]);

    const firstError =
        totalResult.error ||
        weakResult.error ||
        openGapResult.error ||
        feedbackResult.error ||
        helpfulResult.error ||
        notHelpfulResult.error ||
        gapStatusResult.error ||
        negativeFeedbackResult.error ||
        latencyResult.error ||
        recentGapsResult.error ||
        recentLogsResult.error;

    if (firstError) {
        return jsonResponse(
            {
                error: "ops_tables_not_ready",
                setup: "Run ncubook-api/supabase-agent-ops-migration.sql in Supabase SQL editor.",
                details: serializeError(firstError),
            },
            { status: 503, headers: corsHeaders }
        );
    }

    const latencyRows = (latencyResult.data ?? []) as RecentLog[];
    const latencies = latencyRows
        .map((row) => Number(row.latency_ms ?? 0))
        .filter((value) => Number.isFinite(value) && value > 0);
    const avgLatencyMs =
        latencies.length > 0
            ? Math.round(latencies.reduce((sum, value) => sum + value, 0) / latencies.length)
            : 0;
    const gapStatusCounts = Object.fromEntries(
        GAP_STATUSES.map((status) => [status, 0])
    ) as Record<(typeof GAP_STATUSES)[number], number>;

    ((gapStatusResult.data ?? []) as GapStatusRow[]).forEach((row) => {
        const status = row.status;
        if (status && status in gapStatusCounts) {
            gapStatusCounts[status as (typeof GAP_STATUSES)[number]] += 1;
        }
    });

    return jsonResponse(
        {
            windowDays: 7,
            updatedAt: new Date().toISOString(),
            metrics: {
                totalQueries: totalResult.count ?? 0,
                weakOrNoRetrieval: weakResult.count ?? 0,
                openKnowledgeGaps: openGapResult.count ?? 0,
                feedbackCount: feedbackResult.count ?? 0,
                helpfulFeedback: helpfulResult.count ?? 0,
                notHelpfulFeedback: notHelpfulResult.count ?? 0,
                avgLatencyMs,
            },
            gapStatusCounts,
            recentNegativeFeedback: negativeFeedbackResult.data ?? [],
            recentGaps: recentGapsResult.data ?? [],
            recentQueries: recentLogsResult.data ?? [],
        },
        { status: 200, headers: corsHeaders }
    );
}
