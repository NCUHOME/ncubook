import { NextRequest, NextResponse } from "next/server";
import { filterPublishedCards } from "@/lib/content/lark-mapper";
import { upsertInformationCards } from "@/lib/content/upsert-cards";
import { getSupabaseAdmin } from "@/lib/db/supabase";
import { fetchLarkInformationCards } from "@/lib/lark/client";

export async function POST(req: NextRequest) {
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
}
