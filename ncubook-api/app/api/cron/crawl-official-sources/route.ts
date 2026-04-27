import { jsonResponse } from "@/lib/admin-auth";
import { runOfficialSourceCrawl } from "@/lib/content-admin-service";
import { getSupabase } from "@/lib/supabase";

function requireCronSecret(req: Request) {
    const secret = process.env.CRON_SECRET || process.env.ADMIN_TOKEN || process.env.OPS_READ_TOKEN || "";
    if (!secret) {
        return true;
    }

    const url = new URL(req.url);
    const provided =
        req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
        req.headers.get("x-cron-secret") ||
        url.searchParams.get("token");

    return provided === secret;
}

async function handle(req: Request) {
    if (!requireCronSecret(req)) {
        return jsonResponse({ error: "unauthorized" }, { status: 401 });
    }

    try {
        const result = await runOfficialSourceCrawl(getSupabase());
        return jsonResponse({ ok: true, result, ranAt: new Date().toISOString() });
    } catch (error) {
        return jsonResponse(
            {
                error: "cron_crawl_failed",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        );
    }
}

export async function GET(req: Request) {
    return handle(req);
}

export async function POST(req: Request) {
    return handle(req);
}
