export function getAdminToken() {
    return process.env.ADMIN_TOKEN || process.env.OPS_READ_TOKEN || "";
}

export function requireAdminToken(req: Request) {
    const requiredToken = getAdminToken();
    if (!requiredToken) {
        return true;
    }

    const url = new URL(req.url);
    const providedToken =
        req.headers.get("x-admin-token") ||
        req.headers.get("x-ops-token") ||
        url.searchParams.get("token");

    return providedToken === requiredToken;
}

export function jsonResponse(body: unknown, init: ResponseInit = {}) {
    const headers = new Headers(init.headers);
    headers.set("Content-Type", "application/json");
    headers.set("Cache-Control", "no-store");

    return new Response(JSON.stringify(body), {
        ...init,
        headers,
    });
}
