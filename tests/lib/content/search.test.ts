// 单测：全文与 Block 粒度检索与稳定锚点解析测试
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/search/route";
import { searchIndexFixture } from "@/lib/content/published-fixtures";
import { resolvePageRoute } from "@/lib/content/published-repository";
import { searchEntries } from "@/lib/search/search-blocks";

describe("keyword search API boundary & block search", () => {
  it("returns only query and original block results from search API", async () => {
    const response = await GET(new NextRequest("http://localhost/api/search?q=环游车"));
    const payload = await response.json();

    expect(Object.keys(payload).sort()).toEqual(["query", "results"]);
    expect(payload.results[0]).toMatchObject({
      pageTitle: "校园环游车乘坐指南",
      anchor: "b-shuttle-intro",
    });
    expect(payload.results[0].excerpt).toContain("环游车");
  });

  it("returns the original paragraph and a stable anchor via searchEntries", () => {
    const [result] = searchEntries("环游车", searchIndexFixture, resolvePageRoute);

    expect(result.pageTitle).toBe("校园环游车乘坐指南");
    expect(result.excerpt).toContain("环游车");
    expect(result.href).toMatch(/^\/docs\/campus-shuttle#b-/);
    expect(result).not.toHaveProperty("answer");
  });

  it("returns no results for an empty query", () => {
    expect(searchEntries("   ", searchIndexFixture, resolvePageRoute)).toEqual([]);
  });
});
