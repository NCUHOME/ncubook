import { requireAdminToken, jsonResponse } from "@/lib/admin-auth";
import { updateDraft } from "@/lib/content-admin-service";
import { getSupabase } from "@/lib/supabase";

export async function PATCH(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    if (!requireAdminToken(req)) {
        return jsonResponse({ error: "unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));

    try {
        const draft = await updateDraft(getSupabase(), id, {
            title: body.title,
            targetDocPath: body.targetDocPath,
            editedMarkdown: body.editedMarkdown,
            reviewNote: body.reviewNote,
        });
        return jsonResponse({ draft });
    } catch (error) {
        return jsonResponse(
            {
                error: "draft_update_failed",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        );
    }
}
