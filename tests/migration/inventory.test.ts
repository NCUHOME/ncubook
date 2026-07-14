import manifest from "@/migration/manifest.json";
import { describe, expect, it } from "vitest";

describe("Notion migration inventory", () => {
  it("uses the complete public page-tree count as the migration reference", () => {
    expect(manifest.sourceRootPageId).toBe("24c7d60a-0dda-808b-aaf0-c30129eeff3b");
    expect(manifest.rootPageExcludedFromPublication).toBe(true);
    expect(manifest.pages).toHaveLength(manifest.referencePageCount);
    expect(manifest.referencePageCount).toBe(37);
  });

  it("keeps stable IDs, slugs, parents, owners, risk and disposition for every page", () => {
    const ids = new Set(manifest.pages.map((page) => page.sourcePageId));
    const slugs = new Set(manifest.pages.map((page) => page.targetSlug));
    expect(ids.size).toBe(manifest.pages.length);
    expect(slugs.size).toBe(manifest.pages.length);
    for (const page of manifest.pages) {
      expect(page.sourcePath).toBe(`notion:${page.sourcePageId}`);
      expect(page.targetPageId).toBe(page.sourcePageId);
      expect(page.targetSlug).toMatch(/^page-[a-z0-9]+$/);
      expect(page.parentPageId === null || ids.has(page.parentPageId)).toBe(true);
      expect(page.owner).not.toBe("");
      expect(["normal", "needs-verification", "sensitive"]).toContain(page.riskLevel);
      expect(page.status).toBe("inventoried");
      expect(page.notes).not.toBe("");
    }
  });

  it("contains seven top-level site sections and the observed deeper course pages", () => {
    expect(manifest.pages.filter((page) => page.parentPageId === null)).toHaveLength(7);
    expect(manifest.pages.find((page) => page.title === "培养方案")?.parentPageId).toBe("2587d60a0dda8083bac6c145842c6269");
    expect(manifest.pages.find((page) => page.title === "教师评价课程")?.parentPageId).toBe("2587d60a0dda8083bac6c145842c6269");
  });
});
