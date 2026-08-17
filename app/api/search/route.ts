// API 路由：关键词搜索 API 接口 (处理 GET/POST 请求，Node.js runtime，含 IP 分钟级 Rate Limit 限流防护与 JSON 错误捕获)
import { NextRequest, NextResponse } from "next/server";
import { createMinuteRateLimiter } from "@/lib/ai/ask";
import { groupSqlSearchSegments, searchGroupedEntries } from "@/lib/content/search";
import { loadPublishedRepository } from "@/lib/content/server";
import { getSupabaseAdmin, hasSupabaseConfig } from "@/lib/integrations/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const checkSearchRateLimit = createMinuteRateLimiter(60);

export async function GET(request: NextRequest) {
  if (!checkSearchRateLimit(request)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!query) {
    return NextResponse.json({ query: "", results: [] });
  }

  try {

    const repository = await loadPublishedRepository();
    const client = getSupabaseAdmin();

    if (hasSupabaseConfig() && client) {
      const { data: segments, error } = await client.rpc("search_published_segments", {
        p_query: query,
        p_limit: 20,
      });

      if (!error && Array.isArray(segments)) {
        const routes = await repository.getPageRoutes();
        const results = groupSqlSearchSegments(segments, routes, query);
        return NextResponse.json({ query, results });
      }
    }

    // Fixture / 离线降级分支
    const searchIndex = await repository.getSearchIndex();
    const results = searchGroupedEntries(query, searchIndex, repository.resolvePageRoute);
    return NextResponse.json({ query, results });
  } catch {
    return NextResponse.json({ query, results: [] });
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
