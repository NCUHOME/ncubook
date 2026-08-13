// 单测：测试块级全文检索算法 (searchEntries)，校验关键词分词匹配、摘要片段高亮切割与 b-<blockId> 锚点计算
import { describe, expect, it } from "vitest";
import { searchIndexFixture, createFixtureRepository } from "@/lib/content/fixture";
import { searchEntries } from "@/lib/content/search";

describe("block search algorithm", () => {
  const repo = createFixtureRepository();

  it("returns the original paragraph and a stable anchor via searchEntries", () => {
    const [result] = searchEntries("环游车", searchIndexFixture, repo.resolvePageRoute);

    expect(result.pageTitle).toBe("校园环游车乘坐指南");
    expect(result.excerpt).toContain("环游车");
    expect(result.href).toMatch(/^\/docs\/campus-shuttle#b-/);
    expect(result).not.toHaveProperty("answer");
  });

  it("returns no results for an empty query", () => {
    expect(searchEntries("   ", searchIndexFixture, repo.resolvePageRoute)).toEqual([]);
  });
});
