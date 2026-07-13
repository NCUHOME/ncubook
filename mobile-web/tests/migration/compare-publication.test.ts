import { describe, expect, it } from "vitest";
import type { Block, RichText } from "@/lib/content/published-schema";
import { comparePagePublication } from "@/lib/migration/compare-publication";

const text = (plainText: string): RichText => [{ plainText, annotations: {} }];
const sourceBlocks: Block[] = [
  { id: "h", anchor: "b-h", type: "heading", level: 2, richText: text("路线") },
  { id: "p", anchor: "b-p", type: "paragraph", richText: text("环游车收费 0.9 元") },
  { id: "l", anchor: "b-l", type: "bulleted-list", items: [{ id: "i", richText: text("体育馆上车"), children: [] }] },
  { id: "t", anchor: "b-t", type: "table", hasHeaderRow: true, rows: [{ id: "r", cells: [text("站点"), text("时间")] }] },
  { id: "img", anchor: "b-img", type: "image", assetId: "asset-img", caption: text("路线图") },
];

describe("content migration parity", () => {
  it("passes only with zero lost text, headings, structures, anchors, links, and assets", () => {
    const report = comparePagePublication({ pageId: "page", blocks: sourceBlocks, assetIds: ["asset-img"] }, { pageId: "page", blocks: structuredClone(sourceBlocks), assetIds: ["asset-img"] });
    expect(report.ok).toBe(true);
    expect(report.issues).toEqual([]);
  });

  it("reports lost original text, changed order, missing assets and anchors", () => {
    const target = structuredClone(sourceBlocks).filter((block) => block.id !== "p" && block.id !== "img");
    const report = comparePagePublication({ pageId: "page", blocks: sourceBlocks, assetIds: ["asset-img"] }, { pageId: "page", blocks: target, assetIds: [] });
    expect(report.ok).toBe(false);
    expect(report.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining(["lost-text", "heading-or-order-changed", "structure-changed", "missing-anchor", "missing-asset"]));
  });
});
