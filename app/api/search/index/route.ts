// API 路由：轻量级全量搜索索引 JSON 接口 (为前端提供 Instant Search as you type 5ms 零延迟打字即搜体验，支持 ETag 条件协商缓存)
import { createHash } from "node:crypto";
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

export async function GET(request: Request) {
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

    const body = JSON.stringify(items);
    const etag = `W/"${createHash("sha1").update(body).digest("hex").slice(0, 16)}"`;

    if (request && request.headers && request.headers.get("if-none-match") === etag) {
      return new Response(null, {
        status: 304,
        headers: {
          ETag: etag,
          "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
        },
      });
    }

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        ETag: etag,
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "search_index_failed";
    return NextResponse.json({ error: "index_error", message }, { status: 500 });
  }
}
