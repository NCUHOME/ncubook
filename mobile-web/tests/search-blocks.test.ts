import { describe, expect, it } from "vitest";
import { searchIndexFixture } from "@/lib/content/published-fixtures";
import { resolvePageRoute } from "@/lib/content/published-repository";
import { searchEntries } from "@/lib/search/search-blocks";

describe("keyword-only document search", () => {
  it("returns the original paragraph and a stable anchor", () => {
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
