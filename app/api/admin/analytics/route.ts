import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/integrations/supabase";
import { authenticateAdminRequest } from "@/lib/publishing/auth";
import type { AnalyticsSummary } from "@/lib/analytics/types";
import { getArticleMetadataLookup, resolveArticleMeta } from "@/lib/content/metadata-resolver";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const isAuthenticated = await authenticateAdminRequest(request);
  if (!isAuthenticated) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "database_not_configured" }, { status: 500 });
  }

  // 获取全站文章元数据字典，用于反查中文标题与 Notion 链接
  const { lookup: articleLookup } = await getArticleMetadataLookup();

  let rawEvents: Array<{
    id?: number;
    session_id: string;
    event_name: string;
    event_data: Record<string, unknown>;
    created_at: string;
  }> = [];

  // 1. 优先读取 analytics_events 表
  const { data: tableEvents, error: tableErr } = await supabase
    .from("analytics_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1000);

  if (!tableErr && tableEvents && tableEvents.length > 0) {
    rawEvents = tableEvents as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  } else {
    // 2. 读取缓冲池降级数据
    const { data: bufferData } = await supabase
      .from("site_configs")
      .select("value")
      .eq("key", "analytics_events_buffer")
      .maybeSingle();

    if (Array.isArray(bufferData?.value)) {
      rawEvents = bufferData.value as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    }
  }

  // 3. 统计聚合指标
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayStartIso = todayStart.toISOString();

  let todayPv = 0;
  const todaySessions = new Set<string>();
  let totalSearches = 0;
  let zeroResultSearches = 0;
  let totalAiAsks = 0;
  let totalContactCopies = 0;

  const articleViewCounts: Record<
    string,
    { title: string; sectionTitle?: string; routePath?: string; notionUrl?: string; count: number }
  > = {};
  const queryCounts: Record<string, { count: number; zeroResult: boolean; lastAt: string }> = {};

  for (const ev of rawEvents) {
    const isToday = ev.created_at >= todayStartIso;

    if (ev.event_name === "page_view") {
      if (isToday) {
        todayPv++;
        todaySessions.add(ev.session_id);
      }
      const rawSlug = (ev.event_data?.slug as string) || (ev.event_data?.path as string) || "首页";
      const meta = resolveArticleMeta(articleLookup, rawSlug);

      const title = meta?.title || (ev.event_data?.pageTitle as string) || (rawSlug === "/" ? "首页" : rawSlug);
      const sectionTitle = meta?.sectionTitle;
      const routePath = meta?.routePath || (rawSlug.startsWith("/") ? rawSlug : `/docs/${rawSlug}`);
      const notionUrl = meta?.notionUrl;
      const groupKey = meta?.slug || rawSlug.replace(/^\/docs\//, "").replace(/^\/sections\//, "");

      if (rawSlug && rawSlug !== "/") {
        if (!articleViewCounts[groupKey]) {
          articleViewCounts[groupKey] = {
            title,
            sectionTitle,
            routePath,
            notionUrl,
            count: 0,
          };
        }
        articleViewCounts[groupKey].count++;
      }
    } else if (ev.event_name === "search_query") {
      totalSearches++;
      const q = String(ev.event_data?.query || "").trim();
      const count = Number(ev.event_data?.resultCount ?? 0);
      const isZero = count === 0;
      if (isZero) zeroResultSearches++;

      if (q) {
        if (!queryCounts[q]) {
          queryCounts[q] = { count: 0, zeroResult: isZero, lastAt: ev.created_at };
        }
        queryCounts[q].count++;
      }
    } else if (ev.event_name === "ai_ask_submitted") {
      totalAiAsks++;
    } else if (ev.event_name === "contact_copied") {
      totalContactCopies++;
    }
  }

  // 排序热门文章 Top 10
  const topArticles = Object.entries(articleViewCounts)
    .map(([slug, data]) => ({
      slug,
      title: data.title,
      sectionTitle: data.sectionTitle,
      routePath: data.routePath,
      notionUrl: data.notionUrl,
      views: data.count,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  // 排序高频搜索词 Top 10
  const topSearchQueries = Object.entries(queryCounts)
    .map(([query, data]) => ({ query, count: data.count, zeroResult: data.zeroResult }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // 排序零结果词列表
  const zeroResultQueries = Object.entries(queryCounts)
    .filter(([, data]) => data.zeroResult)
    .map(([query, data]) => ({ query, count: data.count, lastSearchedAt: data.lastAt }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  const summary: AnalyticsSummary = {
    todayPv: Math.max(todayPv, rawEvents.filter((e) => e.event_name === "page_view").length),
    todayUv: Math.max(todaySessions.size, new Set(rawEvents.map((e) => e.session_id)).size),
    totalSearches,
    zeroResultSearches,
    totalAiAsks,
    totalContactCopies,
    topArticles,
    topSearchQueries,
    zeroResultQueries,
    recentEvents: rawEvents.slice(0, 50).map((e, idx) => {
      const slug = (e.event_data?.slug as string) || (e.event_data?.path as string);
      const meta = resolveArticleMeta(articleLookup, slug);
      return {
        id: e.id || idx + 1,
        eventName: e.event_name as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        eventData: e.event_data,
        createdAt: e.created_at,
        resolvedTitle: meta?.title || (e.event_data?.pageTitle as string) || (slug === "/" ? "首页" : undefined),
        resolvedSection: meta?.sectionTitle,
        routePath: meta?.routePath || (slug?.startsWith("/") ? slug : slug ? `/docs/${slug}` : undefined),
        notionUrl: meta?.notionUrl,
      };
    }),
  };

  return NextResponse.json({ ok: true, data: summary });
}
