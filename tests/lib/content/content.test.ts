// 单测：测试内容仓库 (published-repository) 树结构构造、板块层级关系解析、页面 Slug 路径映射与元数据提取
import { describe, expect, it } from "vitest";
import {
  anchorFromSourceId,
  getAsset,
  getDocumentView,
  getSectionChildren,
  getSectionTree,
  getSectionView,
  resolvePageRoute,
} from "@/lib/content/repo";

describe("published document fixture", () => {
  it("keeps stable block anchors and a two-level section tree", () => {
    const shuttle = getDocumentView("campus-shuttle");

    expect(shuttle?.blocks.every((block) => block.anchor.startsWith("b-"))).toBe(true);
    expect(shuttle?.page.parentId).toBeTruthy();
    expect(getSectionTree("campus-life").some((node) => node.children.length > 0)).toBe(true);
  });

  it("filters out child page-link blocks in getSectionView to prevent duplicate rendering", () => {
    const sectionView = getSectionView("campus-life");
    expect(sectionView).not.toBeNull();
    const childIds = new Set(getSectionChildren("campus-life").map((child) => child.id));
    const hasChildPageLink = sectionView?.blocks.some(
      (block) => block.type === "page-link" && childIds.has(block.pageId),
    );
    expect(hasChildPageLink).toBe(false);
  });

  it("covers every approved rich-content block type", () => {
    const guide = getDocumentView("rich-content-guide");
    const types = new Set(guide?.blocks.map((block) => block.type));

    expect(types).toEqual(
      new Set([
        "paragraph",
        "quote",
        "heading",
        "bulleted-list",
        "numbered-list",
        "callout",
        "divider",
        "table",
        "image",
        "file",
        "columns",
        "embed",
        "page-link",
      ]),
    );
  });

  it("resolves assets, page routes and row anchors without extending the publication schema", () => {
    expect(getAsset("asset-campus-map")?.publicUrl).toBe("/images/campus-map.svg");
    expect(resolvePageRoute("page-campus-shuttle")).toBe("/docs/campus-shuttle");
    expect(anchorFromSourceId("table-row-fare")).toBe("b-table-row-fare");
  });
});
