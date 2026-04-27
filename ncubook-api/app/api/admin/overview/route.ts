import { requireAdminToken, jsonResponse } from "@/lib/admin-auth";
import { getAdminOverview } from "@/lib/content-admin-service";
import { getSupabase } from "@/lib/supabase";

function serializeError(error: unknown) {
    if (error && typeof error === "object" && "message" in error) {
        return (error as { message?: string }).message;
    }
    return "Unknown error";
}

export async function GET(req: Request) {
    if (!requireAdminToken(req)) {
        return jsonResponse({ error: "unauthorized" }, { status: 401 });
    }

    try {
        const data = await getAdminOverview(getSupabase());
        return jsonResponse(data);
    } catch (error) {
        return jsonResponse(
            {
                error: "content_admin_not_ready",
                setup: "Run ncubook-api/supabase-official-content-admin-migration.sql in Supabase SQL editor.",
                details: serializeError(error),
            },
            { status: 503 }
        );
    }
}
