// API 路由：轻量级全量搜索索引 JSON 接口 (为前端提供 Instant Search as you type 5ms 零延迟打字即搜体验)
import { NextResponse } from "next/server";
import { loadPublishedRepository } from "@/lib/content/server";

export const runtime = "nodejs";
export const revalidate = 3600;

export type CompactSearchItem = {
  pid: string; // pageId
  t: string;   // pageTitle
  p: string[]; // sectionPath
  e: string;   // excerpt (plainText)
  a: string;   // anchor
  h: string;   // href (with #anchor)
  r: string;   // base route
  b: string;   // blockType
};

export async function GET() {
  try {
    const repository = await loadPublishedRepository();
    if (!repository) {
      return NextResponse.json([], { status: 200 });
    }

    const entries = repository.getSearchIndex();
    const resolveRoute = repository.resolvePageRoute;

    const items: CompactSearchItem[] = entries.map((entry) => {
      const baseRoute = resolveRoute(entry.pageId);
      return {
        pid: entry.pageId,
        t: entry.pageTitle,
        p: [...entry.sectionPath],
        e: entry.plainText,
        a: entry.anchor,
        h: entry.anchor ? `${baseRoute}#${entry.anchor}` : baseRoute,
        r: baseRoute,
        b: entry.blockType,
      };
    });

    return NextResponse.json(items, {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "search_index_failed";
    return NextResponse.json({ error: "index_error", message }, { status: 500 });
  }
}
