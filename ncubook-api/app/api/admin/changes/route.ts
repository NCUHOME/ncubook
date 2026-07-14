import { requireAdminToken, jsonResponse } from "@/lib/admin-auth";
import { listCandidateEvents } from "@/lib/content-admin-service";
import { getSupabase } from "@/lib/supabase";

export async function GET(req: Request) {
    if (!requireAdminToken(req)) {
        return jsonResponse({ error: "unauthorized" }, { status: 401 });
    }

    try {
        const events = await listCandidateEvents(getSupabase());
        return jsonResponse({ events });
    } catch (error) {
        return jsonResponse(
            {
                error: "changes_not_ready",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 503 }
        );
    }
}
