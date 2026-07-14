import { describe, expect, it } from "vitest";
import type { Block, Page, RichText } from "@/lib/content/published-schema";
import { buildSearchIndex } from "@/lib/publishing/build-search-index";

const text = (plainText: string): RichText => [{ plainText, annotations: {} }];

function page(contentVersion = "content-v2"): Page {
  return {
    id: "page-shuttle",
    schemaVersion: 1,
    contentVersion,
    parentId: "section-life",
    title: "校园环游车",
    slug: "campus-shuttle",
    status: "published",
    lastEditedTime: "2026-07-13T12:00:00.000Z",
    lastPublishedAt: "2026-07-13T13:00:00.000Z",
    metadata: { school: "ncu", sourceUrls: [], riskLevel: "normal" },
  };
}

describe("deterministic published search entries", () => {
  it("creates one entry per searchable source block and tracks heading hierarchy", () => {
    const blocks: Block[] = [
      { id: "intro", anchor: "b-intro", type: "paragraph", richText: text("正文开头") },
      { id: "route", anchor: "b-route", type: "heading", level: 2, richText: text("路线") },
      { id: "north", anchor: "b-north", type: "heading", level: 3, richText: text("前湖校区") },
      { id: "stop", anchor: "b-stop", type: "paragraph", richText: text("从体育馆上车") },
      { id: "fare", anchor: "b-fare", type: "heading", level: 2, richText: text("收费") },
      {
        id: "price", anchor: "b-price", type: "callout", tone: "info", richText: text("单次 0.9 元"),
        children: [{ id: "payment", anchor: "b-payment", type: "paragraph", richText: text("支持扫码付款") }],
      },
      { id: "divider", anchor: "b-divider", type: "divider" },
    ];

    const entries = buildSearchIndex(page(), blocks, ["校园生活"]);

    expect(entries.map((entry) => entry.id)).toEqual([
      "content-v2-intro", "content-v2-route", "content-v2-north", "content-v2-stop", "content-v2-fare", "content-v2-price", "content-v2-payment",
    ]);
    expect(entries.find((entry) => entry.id.endsWith("-stop"))?.sectionPath).toEqual(["校园生活", "路线", "前湖校区"]);
    expect(entries.find((entry) => entry.id.endsWith("-price"))?.sectionPath).toEqual(["校园生活", "收费"]);
    expect(entries.find((entry) => entry.id.endsWith("-payment"))?.plainText).toBe("支持扫码付款");
    expect(entries.some((entry) => entry.id.endsWith("-divider"))).toBe(false);
  });

  it("indexes table rows and list items at their rendered stable anchors", () => {
    const blocks: Block[] = [
      {
        id: "schedule", anchor: "b-schedule", type: "table", hasHeaderRow: true,
        rows: [
          { id: "row-header", cells: [text("站点"), text("时间")] },
          { id: "row-one", cells: [text("体育馆"), text("08:00")] },
        ],
      },
      {
        id: "notes", anchor: "b-notes", type: "bulleted-list",
        items: [{ id: "note-one", richText: text("请提前候车"), children: [] }],
      },
    ];

    const entries = buildSearchIndex(page(), blocks, ["校园生活"]);

    expect(entries.map(({ anchor, plainText, blockType }) => ({ anchor, plainText, blockType }))).toEqual([
      { anchor: "b-row-header", plainText: "站点 时间", blockType: "table" },
      { anchor: "b-row-one", plainText: "体育馆 08:00", blockType: "table" },
      { anchor: "b-note-one", plainText: "请提前候车", blockType: "paragraph" },
    ]);
  });

  it("uses original captions and recursively indexes column content", () => {
    const blocks: Block[] = [
      { id: "map", anchor: "b-map", type: "image", assetId: "asset-map", caption: text("校园路线图") },
      {
        id: "columns", anchor: "b-columns", type: "columns",
        columns: [{ id: "left", blocks: [{ id: "left-text", anchor: "b-left-text", type: "quote", richText: text("左侧原文"), children: [] }] }],
      },
    ];

    const entries = buildSearchIndex(page(), blocks, ["校园生活"]);

    expect(entries.map(({ anchor, plainText }) => ({ anchor, plainText }))).toEqual([
      { anchor: "b-map", plainText: "校园路线图" },
      { anchor: "b-left-text", plainText: "左侧原文" },
    ]);
  });

  it("scopes every entry and identifier to exactly one content version", () => {
    const blocks: Block[] = [{ id: "same-source", anchor: "b-same-source", type: "paragraph", richText: text("同一原文") }];

    const oldEntries = buildSearchIndex(page("content-v1"), blocks, []);
    const newEntries = buildSearchIndex(page("content-v2"), blocks, []);

    expect(oldEntries[0]).toMatchObject({ id: "content-v1-same-source", contentVersion: "content-v1" });
    expect(newEntries[0]).toMatchObject({ id: "content-v2-same-source", contentVersion: "content-v2" });
  });
});
