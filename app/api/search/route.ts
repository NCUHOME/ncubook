import { NextRequest, NextResponse } from "next/server";
import { loadPublishedRepository } from "@/lib/content/supabase-published-repository";
import { searchEntries } from "@/lib/search/search-blocks";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const repository = await loadPublishedRepository();
  const results = searchEntries(query, repository.getSearchIndex(), repository.resolvePageRoute);
  return NextResponse.json({ query, results });
}

export async function POST(request: NextRequest) {
  const payload = (await request.json().catch(() => ({}))) as { query?: string };
  const url = new URL(request.url);
  url.searchParams.set("q", payload.query ?? "");
  return GET(new NextRequest(url));
}
