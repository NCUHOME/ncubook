const ALLOWED_ORIGINS = [
    "https://book.ncuos.com",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3100",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:3100",
];

export function getCorsHeaders(origin: string | null, methods = "GET, POST, OPTIONS") {
    const allowedOrigin =
        origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

    return {
        "Access-Control-Allow-Origin": allowedOrigin,
        "Access-Control-Allow-Methods": methods,
        "Access-Control-Allow-Headers": "Content-Type, X-Ops-Token",
        "Access-Control-Expose-Headers":
            "X-Ncubook-Query-Id, X-Ncubook-Retrieval-State, X-Ncubook-Source-Count",
    };
}
