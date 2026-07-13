import { describe, expect, it } from "vitest";
import {
  anchorFromSourceId,
  getAsset,
  getDocumentView,
  getSectionTree,
  resolvePageRoute,
} from "@/lib/content/published-repository";

describe("published document fixture", () => {
  it("keeps stable block anchors and a two-level section tree", () => {
    const shuttle = getDocumentView("campus-shuttle");

    expect(shuttle?.blocks.every((block) => block.anchor.startsWith("b-"))).toBe(true);
    expect(shuttle?.page.parentId).toBeTruthy();
    expect(getSectionTree("campus-life").some((node) => node.children.length > 0)).toBe(true);
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
    expect(getAsset("asset-campus-map")?.publicUrl).toBe("/fixtures/campus-map.svg");
    expect(resolvePageRoute("page-campus-shuttle")).toBe("/docs/campus-shuttle");
    expect(anchorFromSourceId("table-row-fare")).toBe("b-table-row-fare");
  });
});
