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

  it("reports a block moved out of its quote even when flat order is unchanged", () => {
    const nested: Block = { id: "pdf", anchor: "b-pdf", type: "file", assetId: "asset-pdf", name: "资料.pdf" };
    const source: Block[] = [{ id: "quote", anchor: "b-quote", type: "quote", richText: text("延伸阅读"), children: [nested] }];
    const target: Block[] = [{ id: "quote", anchor: "b-quote", type: "quote", richText: text("延伸阅读"), children: [] }, nested];

    const report = comparePagePublication({ pageId: "page", blocks: source, assetIds: ["asset-pdf"] }, { pageId: "page", blocks: target, assetIds: ["asset-pdf"] });

    expect(report.ok).toBe(false);
    expect(report.issues).toContainEqual(expect.objectContaining({ code: "structure-changed", detail: expect.stringContaining("pdf") }));
  });
});
