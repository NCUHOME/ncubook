// API 路由：管理后台获取用户反馈数据汇总与列表（支持直通飞书 Wiki）
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/integrations/supabase";
import { authenticateAdminRequest } from "@/lib/publishing/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const isAuthenticated = await authenticateAdminRequest(request);
  if (!isAuthenticated) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({
      ok: true,
      stats: { total: 0, helpful: 0, unhelpful: 0, helpfulRate: "100%" },
      recent: [],
    });
  }

  try {
    const { data: list, error } = await supabase
      .from("user_feedbacks")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const total = list.length;
    const helpful = list.filter((item) => item.is_helpful).length;
    const unhelpful = total - helpful;
    const helpfulRate = total > 0 ? `${Math.round((helpful / total) * 100)}%` : "100%";

    return NextResponse.json({
      ok: true,
      stats: { total, helpful, unhelpful, helpfulRate },
      recent: list,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "unknown_error" },
      { status: 500 },
    );
  }
}
