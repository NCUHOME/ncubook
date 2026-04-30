import { getCorsHeaders } from "@/lib/cors";
import { buildHealthSnapshot } from "@/lib/health";

function jsonResponse(body: unknown, init: ResponseInit = {}) {
    const headers = new Headers(init.headers);
    headers.set("Content-Type", "application/json");
    headers.set("Cache-Control", "no-store");

    return new Response(JSON.stringify(body, null, 2), {
        ...init,
        headers,
    });
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
    const snapshot = buildHealthSnapshot();

    return jsonResponse(snapshot, {
        status: snapshot.status === "ok" ? 200 : 503,
        headers: getCorsHeaders(origin, "GET, OPTIONS"),
    });
}
