import { NextRequest, NextResponse } from "next/server";
import { getPublishedCards } from "@/lib/content/repository";
import { composeSearchAnswer } from "@/lib/search/answer";
import { searchCards } from "@/lib/search/search-cards";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q")?.trim() || "";
  const cards = await getPublishedCards();
  const results = query ? searchCards(query, cards) : [];
  const answer = query ? composeSearchAnswer(query, results) : null;

  return NextResponse.json({
    query,
    answer,
    results: results.map((result) => ({
      score: result.score,
      reasons: result.reasons,
      card: result.card,
    })),
  });
}

export async function POST(req: NextRequest) {
  const payload = (await req.json().catch(() => ({}))) as { query?: string };
  const url = new URL(req.url);
  url.searchParams.set("q", payload.query || "");
  return GET(new NextRequest(url));
}
