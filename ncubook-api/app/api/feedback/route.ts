import { getCorsHeaders } from "@/lib/cors";
import { syncNegativeFeedbackToLark } from "@/lib/lark-feedback";
import { getSupabase } from "@/lib/supabase";

type FeedbackPayload = {
    targetType?: "agent_answer" | "page";
    queryLogId?: string;
    vote?: "helpful" | "not_helpful";
    pagePath?: string;
    question?: string;
    answer?: string;
    comment?: string;
};

function jsonResponse(body: unknown, init: ResponseInit = {}) {
    const headers = new Headers(init.headers);
    headers.set("Content-Type", "application/json");
    headers.set("Cache-Control", "no-store");

    return new Response(JSON.stringify(body), {
        ...init,
        headers,
    });
}

function compactText(value: unknown, maxLength: number) {
    if (typeof value !== "string") {
        return null;
    }

    const trimmed = value.trim().replace(/\s+/g, " ");
    return trimmed ? trimmed.slice(0, maxLength) : null;
}

export async function OPTIONS(req: Request) {
    const origin = req.headers.get("origin");
    return new Response(null, {
        status: 204,
        headers: getCorsHeaders(origin, "POST, OPTIONS"),
    });
}

export async function POST(req: Request) {
    const origin = req.headers.get("origin");
    const corsHeaders = getCorsHeaders(origin, "POST, OPTIONS");

    try {
        const payload = (await req.json()) as FeedbackPayload;

        if (payload.vote !== "helpful" && payload.vote !== "not_helpful") {
            return jsonResponse(
                { error: "vote must be helpful or not_helpful" },
                { status: 400, headers: corsHeaders }
            );
        }

        const targetType =
            payload.targetType === "page" || payload.targetType === "agent_answer"
                ? payload.targetType
                : payload.queryLogId
                    ? "agent_answer"
                    : "page";

        const supabase = getSupabase();
        const { data, error } = await supabase
            .from("agent_feedback")
            .insert({
                target_type: targetType,
                query_log_id: payload.queryLogId || null,
                vote: payload.vote,
                page_path: compactText(payload.pagePath, 240),
                question: compactText(payload.question, 500),
                answer_excerpt: compactText(payload.answer, 1000),
                comment: compactText(payload.comment, 1000),
                user_agent: compactText(req.headers.get("user-agent"), 500),
            })
            .select("id")
            .single();

        if (error) {
            console.error("Feedback write failed:", error);
            return jsonResponse(
                {
                    error: "feedback_table_not_ready",
                    setup: "Run ncubook-api/supabase-agent-ops-migration.sql in Supabase SQL editor.",
                    details: error.message,
                },
            { status: 503, headers: corsHeaders }
            );
        }

        const larkSync =
            payload.vote === "not_helpful"
                ? await syncNegativeFeedbackToLark({
                    targetType,
                    queryLogId: payload.queryLogId,
                    pagePath: payload.pagePath,
                    question: payload.question,
                    answer: payload.answer,
                    comment: payload.comment,
                })
                : { enabled: false, ok: false as const };

        return jsonResponse(
            { ok: true, id: data?.id, larkSync },
            { status: 201, headers: corsHeaders }
        );
    } catch (error) {
        console.error("Feedback API error:", error);
        return jsonResponse(
            { error: "invalid_feedback_payload" },
            { status: 400, headers: corsHeaders }
        );
    }
}
