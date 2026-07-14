import { describe, expect, it } from "vitest";
import type { NotionBlockNode } from "@/lib/publishing/notion-client";
import { selectNotionPageNodes, stableSlugForNotionPage } from "@/lib/publishing/notion-publication";

const pageNode = (id: string, title: string, children: NotionBlockNode[] = []): NotionBlockNode => ({
  id, type: "child_page", child_page: { title }, has_children: true, children,
});

describe("Notion page-tree publication selection", () => {
  it("uses direct root children as sections and retains every descendant page", () => {
    const tree = [
      pageNode("section-life", "校园生活", [
        { id: "paragraph", type: "paragraph", paragraph: { rich_text: [] }, children: [] },
        pageNode("page-transport", "校园交通", [pageNode("page-shuttle", "环游车")]),
      ]),
      pageNode("section-study", "学习"),
    ];

    const selected = selectNotionPageNodes(tree, true, []);

    expect(selected.map((item) => [item.node.id, item.parentPageId])).toEqual([
      ["section-life", null],
      ["page-transport", "section-life"],
      ["page-shuttle", "page-transport"],
      ["section-study", null],
    ]);
  });

  it("rejects requested pages outside the configured root", () => {
    const tree = [pageNode("section-life", "校园生活")];
    expect(() => selectNotionPageNodes(tree, false, ["outside-page"])).toThrow("outside the configured Notion root");
  });

  it("prefers an explicit slug and otherwise uses a UUID-stable fallback", () => {
    expect(stableSlugForNotionPage({ id: "page-one", properties: { Slug: { type: "rich_text", rich_text: [{ plain_text: "campus-life" }] } } })).toBe("campus-life");
    expect(stableSlugForNotionPage({ id: "12345678-abcd-ef00-1234-56789abcdef0", properties: {} })).toBe("page-12345678abcdef00");
  });
});
