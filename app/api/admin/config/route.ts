// API 路由：管理后台更新全站配置（公告栏、联系方式、Hero 引言）
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/integrations/supabase";
import { authenticateAdminRequest } from "@/lib/publishing/auth";
import type { Json } from "@/lib/database.types";

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

  const { data, error } = await supabase.from("site_configs").select("key, value, updated_at");
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const { getArticleMetadataLookup } = await import("@/lib/content/metadata-resolver");
  const { articles } = await getArticleMetadataLookup();

  return NextResponse.json({ ok: true, data, allArticles: articles });
}

export async function POST(request: Request) {
  const isAuthenticated = await authenticateAdminRequest(request);
  if (!isAuthenticated) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "database_not_configured" }, { status: 500 });
  }

  try {
    const body = (await request.json()) as { key?: string; value?: unknown };
    const key = body.key?.trim();
    if (!key || typeof body.value === "undefined") {
      return NextResponse.json({ ok: false, error: "invalid_parameters" }, { status: 400 });
    }

    const { error } = await supabase
      .from("site_configs")
      .upsert({ key, value: body.value as Json, updated_at: new Date().toISOString() });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    try {
      const { revalidatePath, revalidateTag } = await import("next/cache");
      revalidatePath("/", "page");
      revalidatePath("/search", "page");
      revalidatePath("/docs/[slug]", "page");
      revalidatePath("/api/config");
      revalidateTag("site_configs");
    } catch {
      // 忽略在无静态上下文中的 revalidate 警告
    }

    return NextResponse.json({ ok: true, key, value: body.value });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "unknown_error" }, { status: 500 });
  }
}
