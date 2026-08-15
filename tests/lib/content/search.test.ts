// 单测：测试文章级聚合全文检索算法 (searchGroupedEntries 与 searchEntries)
import { describe, expect, it } from "vitest";
import { searchIndexFixture, createFixtureRepository } from "@/lib/content/fixture";
import { cleanHeadingPunctuation, extractSnippet, searchEntries, searchGroupedEntries } from "@/lib/content/search";
import type { SearchIndexEntry } from "@/lib/content/schema";

describe("document-grouped search algorithm", () => {
  const repo = createFixtureRepository();

  it("groups snippets under a single document card via searchGroupedEntries", () => {
    const grouped = searchGroupedEntries("环游车", searchIndexFixture, repo.resolvePageRoute);

    expect(grouped.length).toBe(1);
    expect(grouped[0]?.pageTitle).toBe("校园环游车乘坐指南");
    expect(grouped[0]?.isTitleMatch).toBe(true);
    expect(grouped[0]?.snippets.length).toBeGreaterThan(0);
    expect(grouped[0]?.snippets[0]?.text).toContain("环游车");
    expect(grouped[0]?.href).toBe("/docs/campus-shuttle");
  });

  it("prioritizes title matches and fills smart overview snippets for empty bodies", () => {
    const customIndex: SearchIndexEntry[] = [
      {
        id: "v1-p1",
        schemaVersion: 1,
        contentVersion: "v1",
        pageId: "page-yellow-pages",
        pageTitle: "黄页",
        sectionPath: ["校园生活", "常用信息:"],
        anchor: "b-phone-1",
        plainText: "83969110（前湖校区）",
        blockType: "paragraph",
        updatedAt: "2026-08-14T00:00:00Z",
      },
      {
        id: "v1-p2",
        schemaVersion: 1,
        contentVersion: "v1",
        pageId: "page-yellow-pages",
        pageTitle: "黄页",
        sectionPath: ["校园生活", "常用信息:"],
        anchor: "b-phone-2",
        plainText: "83969119（保卫处值班室）",
        blockType: "paragraph",
        updatedAt: "2026-08-14T00:00:00Z",
      },
      {
        id: "v1-p3",
        schemaVersion: 1,
        contentVersion: "v1",
        pageId: "page-other",
        pageTitle: "其他指南",
        sectionPath: ["校园生活"],
        anchor: "b-p3",
        plainText: "这里提到了黄页的内容",
        blockType: "paragraph",
        updatedAt: "2026-08-14T00:00:00Z",
      },
    ];

    const results = searchGroupedEntries("黄页", customIndex, (id) => `/docs/${id}`);
    expect(results.length).toBe(2);
    // 标题精确匹配排第一
    expect(results[0]?.pageId).toBe("page-yellow-pages");
    expect(results[0]?.isTitleMatch).toBe(true);
    // 黄页文档仅标题命中，正文无重复词时不强制生成断片
    expect(results[0]?.snippets.length).toBe(0);

    // 第二个文档是正文匹配
    expect(results[1]?.pageId).toBe("page-other");
    expect(results[1]?.snippets.length).toBe(1);
  });

  it("cleans trailing punctuation from headings", () => {
    expect(cleanHeadingPunctuation("书院核心的三化三制:")).toBe("书院核心的三化三制");
    expect(cleanHeadingPunctuation("学习相关 / 实验班：")).toBe("学习相关 / 实验班");
    expect(cleanHeadingPunctuation("生活指南/")).toBe("生活指南");
  });

  it("extracts smart snippet window around search query", () => {
    const longText = "南昌大学是一所办学历史悠久的综合性大学，其中校园环游车为师生提供便捷的短途通勤服务。";
    const snippet = extractSnippet(longText, "环游车", 30);
    expect(snippet).toContain("环游车");
  });

  it("returns compatible flat results via searchEntries", () => {
    const [result] = searchEntries("环游车", searchIndexFixture, repo.resolvePageRoute);

    expect(result).toBeDefined();
    expect(result?.pageTitle).toBe("校园环游车乘坐指南");
    expect(result?.excerpt).toContain("环游车");
    expect(result?.href).toMatch(/^\/docs\/campus-shuttle/);
    expect(result).not.toHaveProperty("answer");
  });

  it("returns no results for an empty query", () => {
    expect(searchGroupedEntries("   ", searchIndexFixture, repo.resolvePageRoute)).toEqual([]);
    expect(searchEntries("   ", searchIndexFixture, repo.resolvePageRoute)).toEqual([]);
  });
});
