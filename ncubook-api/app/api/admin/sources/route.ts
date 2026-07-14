import { requireAdminToken, jsonResponse } from "@/lib/admin-auth";
import { listOfficialSources } from "@/lib/content-admin-service";
import { getSupabase } from "@/lib/supabase";

export async function GET(req: Request) {
    if (!requireAdminToken(req)) {
        return jsonResponse({ error: "unauthorized" }, { status: 401 });
    }

    try {
        const sources = await listOfficialSources(getSupabase());
        return jsonResponse({ sources });
    } catch (error) {
        return jsonResponse(
            {
                error: "sources_not_ready",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 503 }
        );
    }
}
