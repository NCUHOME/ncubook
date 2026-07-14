import { requireAdminToken, jsonResponse } from "@/lib/admin-auth";
import { generateDraftForEvent } from "@/lib/content-admin-service";
import { getSupabase } from "@/lib/supabase";

export async function POST(req: Request) {
    if (!requireAdminToken(req)) {
        return jsonResponse({ error: "unauthorized" }, { status: 401 });
    }

    const { eventId } = await req.json().catch(() => ({}));
    if (!eventId || typeof eventId !== "string") {
        return jsonResponse({ error: "eventId is required" }, { status: 400 });
    }

    try {
        const draft = await generateDraftForEvent(getSupabase(), eventId);
        return jsonResponse({ draft });
    } catch (error) {
        return jsonResponse(
            {
                error: "draft_generate_failed",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        );
    }
}
