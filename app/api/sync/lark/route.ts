// API 路由：飞书多维表格 (Bitable) 卡片定时同步与问卷预留 Webhook (Node.js runtime，严格校验 CRON_SECRET 秘钥并执行 Supabase 批量 Upsert)
import { NextRequest, NextResponse } from "next/server";
import { filterPublishedCards } from "@/lib/content/lark-mapper";
import { upsertInformationCards } from "@/lib/content/upsert-cards";
import { fetchLarkInformationCards } from "@/lib/integrations/lark";
import { getSupabaseAdmin } from "@/lib/integrations/supabase";
import { safeStringEqual } from "@/lib/publishing/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const expectedSecret = process.env.CRON_SECRET;
    if (!expectedSecret) {
      return NextResponse.json(
        { error: "cron_secret_unconfigured", reason: "环境变量 CRON_SECRET 未配置" },
        { status: 503 },
      );
    }

    const providedSecret = req.headers.get("x-cron-secret") || req.nextUrl.searchParams.get("secret") || "";

    if (!safeStringEqual(providedSecret, expectedSecret)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // 预留：后续飞书问卷 / 多维表格 (Lark Forms & Bitable) 收集数据清洗与同步入口
    const formSyncType = req.nextUrl.searchParams.get("type");
    if (formSyncType === "lark_form") {
      return NextResponse.json({
        ok: true,
        type: "lark_form",
        message: "Lark Form sync entrypoint reached. Reserved for future Lark Form webhook processing.",
      });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "missing_supabase_config" }, { status: 503 });
    }

    const cards = await fetchLarkInformationCards();
    const publishedCards = filterPublishedCards(cards);
    const { error } = await upsertInformationCards(supabase, cards);

    if (error) {
      return NextResponse.json({ error: "upsert_failed", details: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      fetched: cards.length,
      published: publishedCards.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "lark_sync_internal_error";
    return NextResponse.json({ error: "sync_failed", message }, { status: 500 });
  }
}
