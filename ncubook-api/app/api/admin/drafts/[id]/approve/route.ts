import { requireAdminToken, jsonResponse } from "@/lib/admin-auth";
import { approveDraft } from "@/lib/content-admin-service";
import { getSupabase } from "@/lib/supabase";

export async function POST(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    if (!requireAdminToken(req)) {
        return jsonResponse({ error: "unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));

    try {
        const draft = await approveDraft(getSupabase(), id, body.reviewNote);
        return jsonResponse({ draft });
    } catch (error) {
        return jsonResponse(
            {
                error: "draft_approve_failed",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        );
    }
}
