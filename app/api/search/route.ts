// API 路由：关键词搜索 API 接口 (处理 GET/POST 请求，Node.js runtime，含 IP 分钟级 Rate Limit 限流防护与 JSON 错误捕获)
import { NextRequest, NextResponse } from "next/server";
import { createMinuteRateLimiter } from "@/lib/ai/route";
import { searchEntries } from "@/lib/content/search";
import { loadPublishedRepository } from "@/lib/content/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const checkSearchRateLimit = createMinuteRateLimiter(60);

export async function GET(request: NextRequest) {
  if (!checkSearchRateLimit(request)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  try {
    const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
    const repository = await loadPublishedRepository();
    const results = searchEntries(query, repository.getSearchIndex(), repository.resolvePageRoute);
    return NextResponse.json({ query, results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "search_internal_error";
    return NextResponse.json({ error: "search_failed", message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json().catch(() => ({}))) as { query?: string };
    const url = new URL(request.url);
    url.searchParams.set("q", payload.query ?? "");
    return GET(new NextRequest(url, { headers: request.headers }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid_request_body";
    return NextResponse.json({ error: "bad_request", message }, { status: 400 });
  }
}
