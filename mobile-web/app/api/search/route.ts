import { NextRequest, NextResponse } from "next/server";
import { getSearchIndex, resolvePageRoute } from "@/lib/content/published-repository";
import { searchEntries } from "@/lib/search/search-blocks";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const results = searchEntries(query, getSearchIndex(), resolvePageRoute);
  return NextResponse.json({ query, results });
}

export async function POST(request: NextRequest) {
  const payload = (await request.json().catch(() => ({}))) as { query?: string };
  const url = new URL(request.url);
  url.searchParams.set("q", payload.query ?? "");
  return GET(new NextRequest(url));
}
