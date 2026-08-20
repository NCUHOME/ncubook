// API 路由：管理后台获取用户反馈数据汇总、工单状态流转与归档批量处理 (/api/admin/feedbacks)
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/integrations/supabase";
import { authenticateAdminRequest } from "@/lib/publishing/auth";
import { getArticleMetadataLookup } from "@/lib/content/metadata-resolver";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type FeedbackStatus = "pending" | "resolved" | "archived" | "ignored";

export async function GET(request: Request) {
  const isAuthenticated = await authenticateAdminRequest(request);
  if (!isAuthenticated) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({
      ok: true,
      stats: { total: 0, helpful: 0, unhelpful: 0, pending: 0, resolved: 0, archived: 0, helpfulRate: "100%" },
      recent: [],
    });
  }

  try {
    const { lookup: articleLookup } = await getArticleMetadataLookup();

    const { data: list, error } = await supabase
      .from("user_feedbacks")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const rawList = Array.isArray(list) ? list : [];

    const enrichedList = rawList.map((item) => {
      const rawTarget = String(item.target_id || "");
      const cleanKey = rawTarget.replace(/^\/docs\//, "").replace(/^\/sections\//, "");
      const meta = articleLookup[rawTarget] || articleLookup[cleanKey];

      const metaObj = (typeof item.metadata === "object" && item.metadata !== null && !Array.isArray(item.metadata))
        ? (item.metadata as Record<string, unknown>)
        : {};
      const status: FeedbackStatus = (metaObj.status as FeedbackStatus) || "pending";

      return {
        id: String(item.id),
        target_type: item.target_type,
        target_id: item.target_id,
        is_helpful: Boolean(item.is_helpful),
        comment: item.comment || null,
        created_at: item.created_at,
        status,
        article_title: meta?.title || (item.target_type === "article" ? cleanKey : "AI 智能问答"),
        section_title: meta?.sectionTitle,
        route_path: meta?.routePath || (item.target_type === "article" ? `/docs/${cleanKey}` : undefined),
        notion_url: meta?.notionUrl,
      };
    });

    const total = enrichedList.length;
    const helpful = enrichedList.filter((item) => item.is_helpful).length;
    const unhelpful = total - helpful;
    const pending = enrichedList.filter((item) => item.status === "pending" && !item.is_helpful).length;
    const resolved = enrichedList.filter((item) => item.status === "resolved").length;
    const archived = enrichedList.filter((item) => item.status === "archived").length;
    const helpfulRate = total > 0 ? `${Math.round((helpful / total) * 100)}%` : "100%";

    return NextResponse.json({
      ok: true,
      stats: { total, helpful, unhelpful, pending, resolved, archived, helpfulRate },
      recent: enrichedList,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "unknown_error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const isAuthenticated = await authenticateAdminRequest(request);
  if (!isAuthenticated) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "database_not_configured" }, { status: 500 });
  }

  try {
    const body = (await request.json()) as {
      id?: string;
      ids?: string[];
      status?: FeedbackStatus;
    };

    const status = body.status;
    if (!status || !["pending", "resolved", "archived", "ignored"].includes(status)) {
      return NextResponse.json({ ok: false, error: "invalid_status" }, { status: 400 });
    }

    const targetIds = body.ids || (body.id ? [body.id] : []);
    if (targetIds.length === 0) {
      return NextResponse.json({ ok: false, error: "no_ids_provided" }, { status: 400 });
    }

    // 更新 user_feedbacks 中的 metadata.status
    for (const id of targetIds) {
      const { data: current } = await supabase
        .from("user_feedbacks")
        .select("metadata")
        .eq("id", id)
        .maybeSingle();

      const currentMeta =
        typeof current?.metadata === "object" && current?.metadata !== null && !Array.isArray(current.metadata)
          ? (current.metadata as Record<string, unknown>)
          : {};
      const newMetadata = { ...currentMeta, status, updated_at: new Date().toISOString() };

      await supabase
        .from("user_feedbacks")
        .update({ metadata: newMetadata })
        .eq("id", id);
    }

    return NextResponse.json({ ok: true, updatedCount: targetIds.length, status });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "unknown_error" },
      { status: 500 },
    );
  }
}
