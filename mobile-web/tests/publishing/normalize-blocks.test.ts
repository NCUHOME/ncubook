import { describe, expect, it, vi } from "vitest";
import { normalizeNotionBlocks, UnsupportedNotionBlockError } from "@/lib/publishing/normalize-blocks";
import type { NotionBlockNode, NotionObject } from "@/lib/publishing/notion-client";

function node(value: NotionObject, children: NotionBlockNode[] = []): NotionBlockNode {
  return { ...value, children };
}

const rich = (plainText: string) => [{
  plain_text: plainText,
  href: null,
  annotations: { bold: false, italic: false, underline: false, strikethrough: false, code: false, color: "default" },
}];

describe("Notion block normalization", () => {
  it("preserves stable anchors, rich text and groups consecutive list items", () => {
    const blocks = normalizeNotionBlocks([
      node({ id: "heading-id", type: "heading_2", heading_2: { rich_text: rich("路线与收费") } }),
      node({
        id: "paragraph-id",
        type: "paragraph",
        paragraph: {
          rich_text: [{
            plain_text: "查看校车页面",
            href: "https://www.notion.so/page-target",
            annotations: { bold: true, color: "blue_background" },
            mention: { type: "page", page: { id: "page-target" } },
          }],
        },
      }),
      node({ id: "list-one", type: "bulleted_list_item", bulleted_list_item: { rich_text: rich("第一项") } }, [
        node({ id: "nested", type: "paragraph", paragraph: { rich_text: rich("补充说明") } }),
      ]),
      node({ id: "list-two", type: "bulleted_list_item", bulleted_list_item: { rich_text: rich("第二项") } }),
    ]);

    expect(blocks[0]).toMatchObject({ id: "heading-id", anchor: "b-heading-id", type: "heading", level: 2 });
    expect(blocks[1]).toMatchObject({
      id: "paragraph-id",
      anchor: "b-paragraph-id",
      type: "paragraph",
      richText: [{ plainText: "查看校车页面", pageId: "page-target", annotations: { bold: true, color: "blue" } }],
    });
    expect(blocks[2]).toMatchObject({
      id: "list-one",
      type: "bulleted-list",
      items: [
        { id: "list-one", richText: [{ plainText: "第一项" }], children: [{ id: "nested", type: "paragraph" }] },
        { id: "list-two", richText: [{ plainText: "第二项" }], children: [] },
      ],
    });
    expect(blocks).toHaveLength(3);
  });

  it("maps tables, columns, mirrored assets and page links without flattening", () => {
    const blocks = normalizeNotionBlocks([
      node({ id: "table-id", type: "table", table: { has_column_header: true } }, [
        node({ id: "row-header", type: "table_row", table_row: { cells: [rich("项目"), rich("说明")] } }),
        node({ id: "row-fare", type: "table_row", table_row: { cells: [rich("费用"), rich("0.9 元")] } }),
      ]),
      node({ id: "columns-id", type: "column_list", column_list: {} }, [
        node({ id: "column-one", type: "column", column: {} }, [node({ id: "left", type: "paragraph", paragraph: { rich_text: rich("左列") } })]),
        node({ id: "column-two", type: "column", column: {} }, [node({ id: "right", type: "paragraph", paragraph: { rich_text: rich("右列") } })]),
      ]),
      node({ id: "image-id", type: "image", image: { caption: rich("路线图"), file: { url: "https://notion-temp/image" } } }),
      node({ id: "file-id", type: "file", file: { caption: rich("附件"), name: "指南.pdf", file: { url: "https://notion-temp/file" } } }),
      node({ id: "child-page-id", type: "child_page", child_page: { title: "校园环游车" } }),
      node({ id: "map-id", type: "embed", embed: { url: "https://school-map.ncuos.com/routes", caption: rich("校园地图") } }),
    ]);

    expect(blocks[0]).toMatchObject({ type: "table", hasHeaderRow: true, rows: [{ id: "row-header" }, { id: "row-fare" }] });
    expect(blocks[1]).toMatchObject({ type: "columns", columns: [{ id: "column-one", blocks: [{ id: "left" }] }, { id: "column-two", blocks: [{ id: "right" }] }] });
    expect(blocks[2]).toMatchObject({ type: "image", assetId: "asset-image-id" });
    expect(blocks[3]).toMatchObject({ type: "file", assetId: "asset-file-id", name: "指南.pdf" });
    expect(blocks[4]).toMatchObject({ type: "page-link", pageId: "child-page-id" });
    expect(blocks[5]).toMatchObject({ type: "embed", provider: "school-map", canonicalUrl: "https://school-map.ncuos.com/routes" });
  });

  it("rejects unknown blocks with their source identity", () => {
    expect(() => normalizeNotionBlocks([node({ id: "toggle-id", type: "toggle", toggle: { rich_text: rich("隐藏内容") } })]))
      .toThrow(new UnsupportedNotionBlockError("toggle-id", "toggle"));
  });

  it("preserves dividers and recursive callout children", () => {
    const nestedCallout = node(
      { id: "callout-id", type: "callout", callout: { rich_text: rich("公告"), color: "gray_background" } },
      [node({ id: "nested-item", type: "bulleted_list_item", bulleted_list_item: { rich_text: rich("新生必看") } })],
    );

    expect(normalizeNotionBlocks([
      node({ id: "divider-id", type: "divider", divider: {} }),
      nestedCallout,
    ])).toMatchObject([
      { id: "divider-id", anchor: "b-divider-id", type: "divider" },
      {
        id: "callout-id",
        anchor: "b-callout-id",
        type: "callout",
        richText: [{ plainText: "公告" }],
        children: [{ type: "bulleted-list", items: [{ id: "nested-item", richText: [{ plainText: "新生必看" }] }] }],
      },
    ]);
  });

  it("skips empty embed placeholders and reports their source identity", () => {
    const onWarning = vi.fn();

    expect(normalizeNotionBlocks([
      node({ id: "empty-embed", type: "embed", embed: { url: "", caption: [] } }),
      node({ id: "paragraph", type: "paragraph", paragraph: { rich_text: rich("继续阅读") } }),
    ], { onWarning })).toMatchObject([{ id: "paragraph", type: "paragraph" }]);
    expect(onWarning).toHaveBeenCalledWith({ blockId: "empty-embed", code: "empty-embed" });
  });

  it("preserves external bookmarks as source links", () => {
    expect(normalizeNotionBlocks([
      node({ id: "cet-link", type: "bookmark", bookmark: { url: "https://cet.neea.edu.cn/", caption: [] } }),
    ])).toMatchObject([{
      id: "cet-link",
      type: "paragraph",
      richText: [{ plainText: "在新页面打开", href: "https://cet.neea.edu.cn/" }],
    }]);
  });
});
