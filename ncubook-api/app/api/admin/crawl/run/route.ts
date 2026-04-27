import { requireAdminToken, jsonResponse } from "@/lib/admin-auth";
import { runOfficialSourceCrawl } from "@/lib/content-admin-service";
import { getSupabase } from "@/lib/supabase";

export async function POST(req: Request) {
    if (!requireAdminToken(req)) {
        return jsonResponse({ error: "unauthorized" }, { status: 401 });
    }

    try {
        const result = await runOfficialSourceCrawl(getSupabase());
        return jsonResponse({ ok: true, result });
    } catch (error) {
        return jsonResponse(
            {
                error: "crawl_failed",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        );
    }
}
