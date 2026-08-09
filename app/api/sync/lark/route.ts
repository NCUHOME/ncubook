// API 路由：飞书多维表格 (Bitable) 卡片定时同步 Webhook (Node.js runtime，校验 x-cron-secret 秘钥并执行 Supabase 批量 Upsert)
import { NextRequest, NextResponse } from "next/server";
import { filterPublishedCards } from "@/lib/content/lark-mapper";
import { upsertInformationCards } from "@/lib/content/upsert-cards";
import { fetchLarkInformationCards } from "@/lib/integrations/lark";
import { getSupabaseAdmin } from "@/lib/integrations/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const expectedSecret = process.env.CRON_SECRET;
    const providedSecret = req.headers.get("x-cron-secret") || req.nextUrl.searchParams.get("secret");

    if (expectedSecret && providedSecret !== expectedSecret) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
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
