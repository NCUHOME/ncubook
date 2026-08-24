import { describe, expect, it } from "vitest";
import type { Block } from "@/lib/content/schema";
import { adaptFreshmanBlocksToPrototype } from "@/lib/content/freshman-prototype";
import { freshmanNotionBlocks } from "@/lib/content/notion-preview";

function withRemoteIds(blocks: Block[]): Block[] {
  let sequence = 0;
  const nextId = () => `notion-uuid-${++sequence}`;

  const visit = (block: Block): Block => {
    const id = nextId();
    const base = { ...block, id, anchor: `b-${id}` };

    if (base.type === "quote" || base.type === "callout") {
      return { ...base, children: base.children.map(visit) };
    }
    if (base.type === "bulleted-list" || base.type === "numbered-list") {
      return {
        ...base,
        items: base.items.map((item) => ({ ...item, id: nextId(), children: item.children.map(visit) })),
      };
    }
    if (base.type === "columns") {
      return {
        ...base,
        columns: base.columns.map((column) => ({ ...column, id: nextId(), blocks: column.blocks.map(visit) })),
      };
    }
    if (base.type === "table") {
      return { ...base, rows: base.rows.map((row) => ({ ...row, id: nextId() })) };
    }
    return base;
  };

  return blocks.map(visit);
}

describe("freshman prototype Supabase compatibility", () => {
  it("derives all special layouts from semantic content instead of fixture ids", () => {
    const remoteBlocks = withRemoteIds(freshmanNotionBlocks);
    const adapted = adaptFreshmanBlocksToPrototype(remoteBlocks);
    const presentations = adapted.map((block) => block.presentation).filter(Boolean);

    expect(presentations).toContain("sales-script-table");
    expect(presentations).toContain("registration-timeline");
    expect(presentations).toContain("map-card");
    expect(presentations).toContain("route-columns");
    expect(presentations.filter((value) => value === "media-grid").length).toBeGreaterThanOrEqual(2);
    expect(JSON.stringify(adapted)).not.toContain("freshman-notion-");
  });

  it("preserves remote ids, links and source text while changing presentation", () => {
    const adapted = adaptFreshmanBlocksToPrototype(withRemoteIds(freshmanNotionBlocks));
    const timeline = adapted.find((block) => block.presentation === "registration-timeline");
    const mapCard = adapted.find((block) => block.presentation === "map-card");
    const serialized = JSON.stringify(adapted);

    expect(timeline?.type).toBe("table");
    if (timeline?.type === "table") {
      expect(timeline.id).toMatch(/^notion-uuid-/);
      expect(timeline.rows).toHaveLength(7);
      expect(timeline.rows[2]?.cells.map((cell) => cell.map((part) => part.plainText).join(""))).toEqual([
        "8.10—8.30",
        "企业微信线上报到",
        "绑定本人微信和手机号",
      ]);
    }

    expect(mapCard).toMatchObject({
      type: "embed",
      title: "南大家园校园地图",
      canonicalUrl: "https://school-map.ncuos.com/",
    });
    expect(serialized).toContain("短途车不前往医学院");
    expect(serialized).toContain("cwcwx.ncu.edu.cn");
  });

  it("leaves unrelated Supabase blocks untouched", () => {
    const blocks: Block[] = [
      {
        id: "remote-heading",
        anchor: "b-remote-heading",
        type: "heading",
        level: 1,
        richText: [{ plainText: "普通章节", annotations: {} }],
      },
      {
        id: "remote-paragraph",
        anchor: "b-remote-paragraph",
        type: "paragraph",
        richText: [{ plainText: "来自 Supabase 的普通正文", annotations: {} }],
      },
    ];

    expect(adaptFreshmanBlocksToPrototype(blocks)).toEqual(blocks);
  });
});
