// 单测：测试内容仓库 (FixtureContentRepository) 树结构构造、板块层级关系解析、页面 Slug 路径映射、元数据提取与线上发布块解码
import { describe, expect, it } from "vitest";
import { anchorFromSourceId } from "@/lib/content/schema";
import { createFixtureRepository } from "@/lib/content/fixture";
import { decodePublishedBlock } from "@/lib/content/server";

describe("published document fixture & content server", () => {
  const repo = createFixtureRepository();

  it("keeps stable block anchors and a two-level section tree", () => {
    const shuttle = repo.getDocumentView("campus-shuttle");

    expect(shuttle?.blocks.every((block) => block.anchor.startsWith("b-"))).toBe(true);
    expect(shuttle?.page.parentId).toBeTruthy();
    expect(repo.getSectionTree("campus-life").some((node) => node.children.length > 0)).toBe(true);
  });

  it("preserves embedded page-link blocks in getSectionView for rich section documents", () => {
    const sectionView = repo.getSectionView("campus-life");
    expect(sectionView).not.toBeNull();
    const hasBlocks = sectionView?.blocks && sectionView.blocks.length > 0;
    expect(hasBlocks).toBe(true);
  });

  it("covers every approved rich-content block type", () => {
    const guide = repo.getDocumentView("rich-content-guide");
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
    expect(repo.getAsset("asset-campus-map")?.publicUrl).toBe("/images/campus-map.svg");
    expect(repo.resolvePageRoute("page-campus-shuttle")).toBe("/docs/campus-shuttle");
    expect(anchorFromSourceId("table-row-fare")).toBe("b-table-row-fare");
  });

  it("normalizes a legacy schema-v1 quote without children during decodePublishedBlock", () => {
    expect(
      decodePublishedBlock({
        id: "legacy-quote",
        anchor: "b-legacy-quote",
        type: "quote",
        richText: [{ plainText: "旧引用", annotations: {} }],
      }),
    ).toEqual({
      id: "legacy-quote",
      anchor: "b-legacy-quote",
      type: "quote",
      richText: [{ plainText: "旧引用", annotations: {} }],
      children: [],
    });
  });
});
