import type { Block, RichText, RichTextColor } from "@/lib/content/published-schema";
import type { NotionBlockNode } from "@/lib/publishing/notion-client";

const richTextColors = new Set<RichTextColor>(["default", "gray", "red", "orange", "yellow", "green", "blue", "purple", "pink"]);

export class UnsupportedNotionBlockError extends Error {
  constructor(public readonly blockId: string, public readonly blockType: string) {
    super(`Unsupported Notion block ${blockType} (${blockId})`);
    this.name = "UnsupportedNotionBlockError";
  }
}

type NormalizeBlocksOptions = {
  onWarning?: (warning: { blockId: string; code: "empty-embed" }) => void;
};

export function normalizeNotionBlocks(nodes: NotionBlockNode[], options: NormalizeBlocksOptions = {}): Block[] {
  const blocks: Block[] = [];
  for (let index = 0; index < nodes.length;) {
    const node = nodes[index];
    const type = blockType(node);
    if (type === "embed" && !hasText(payload(node, type).url)) {
      options.onWarning?.({ blockId: node.id, code: "empty-embed" });
      index += 1;
      continue;
    }
    if (type === "bulleted_list_item" || type === "numbered_list_item") {
      const listNodes: NotionBlockNode[] = [];
      while (index < nodes.length && blockType(nodes[index]) === type) {
        listNodes.push(nodes[index]);
        index += 1;
      }
      blocks.push({
        id: listNodes[0].id,
        anchor: anchor(listNodes[0].id),
        type: type === "bulleted_list_item" ? "bulleted-list" : "numbered-list",
        items: listNodes.map((item) => ({
          id: item.id,
          richText: richText(payload(item, type).rich_text),
          children: normalizeNotionBlocks(item.children, options),
        })),
      });
      continue;
    }
    blocks.push(normalizeSingle(node, type, options));
    index += 1;
  }
  return blocks;
}

function normalizeSingle(node: NotionBlockNode, type: string, options: NormalizeBlocksOptions): Block {
  const base = { id: node.id, anchor: anchor(node.id) };
  switch (type) {
    case "paragraph":
      return { ...base, type, richText: richText(payload(node, type).rich_text) };
    case "quote":
      return {
        ...base,
        type,
        richText: richText(payload(node, type).rich_text),
        children: normalizeNotionBlocks(node.children, options),
      };
    case "heading_1":
    case "heading_2":
    case "heading_3":
      return { ...base, type: "heading", level: Number(type.at(-1)) as 1 | 2 | 3, richText: richText(payload(node, type).rich_text) };
    case "callout": {
      const value = payload(node, type);
      return {
        ...base,
        type: "callout",
        tone: calloutTone(value.color),
        icon: calloutIcon(value.icon),
        richText: richText(value.rich_text),
        children: normalizeNotionBlocks(node.children, options),
      };
    }
    case "divider":
      return { ...base, type: "divider" };
    case "table": {
      const value = payload(node, type);
      return {
        ...base,
        type: "table",
        hasHeaderRow: value.has_column_header === true,
        rows: node.children.map((row) => {
          if (blockType(row) !== "table_row") throw new UnsupportedNotionBlockError(row.id, blockType(row));
          const cells = payload(row, "table_row").cells;
          if (!Array.isArray(cells)) throw new Error(`Notion table row ${row.id} is missing cells`);
          return { id: row.id, cells: cells.map(richText) };
        }),
      };
    }
    case "column_list":
      return {
        ...base,
        type: "columns",
        columns: node.children.map((column) => {
          if (blockType(column) !== "column") throw new UnsupportedNotionBlockError(column.id, blockType(column));
          return { id: column.id, blocks: normalizeNotionBlocks(column.children, options) };
        }),
      };
    case "image":
      return { ...base, type: "image", assetId: `asset-${node.id}`, caption: optionalRichText(payload(node, type).caption) };
    case "file": {
      const value = payload(node, type);
      return { ...base, type: "file", assetId: `asset-${node.id}`, name: typeof value.name === "string" && value.name.trim() ? value.name : "附件", caption: optionalRichText(value.caption) };
    }
    case "child_page": {
      const title = requiredString(payload(node, type).title, `Notion child page ${node.id} title`);
      return { ...base, type: "page-link", pageId: node.id, richText: plainRichText(title) };
    }
    case "link_to_page": {
      const value = payload(node, type);
      const pageId = requiredString(value.page_id, `Notion page link ${node.id} target`);
      return { ...base, type: "page-link", pageId, richText: plainRichText("查看页面") };
    }
    case "embed":
      return normalizeEmbed(node, payload(node, type));
    case "bookmark": {
      const value = payload(node, type);
      const url = requiredString(value.url, `Notion bookmark ${node.id} URL`);
      const caption = optionalRichText(value.caption);
      return { ...base, type: "paragraph", richText: [{ plainText: plainText(caption) || "在新页面打开", href: url, annotations: {} }] };
    }
    default:
      throw new UnsupportedNotionBlockError(node.id, type);
  }
}

function normalizeEmbed(node: NotionBlockNode, value: Record<string, unknown>): Block {
  const url = requiredString(value.url, `Notion embed ${node.id} URL`);
  const caption = optionalRichText(value.caption);
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Notion embed ${node.id} has an invalid URL`);
  }
  if (parsed.protocol === "https:" && parsed.hostname === "school-map.ncuos.com") {
    return { id: node.id, anchor: anchor(node.id), type: "embed", provider: "school-map", canonicalUrl: url, title: plainText(caption) || "校园地图" };
  }
  return { id: node.id, anchor: anchor(node.id), type: "paragraph", richText: [{ plainText: plainText(caption) || "在新页面打开", href: url, annotations: {} }] };
}

function richText(value: unknown): RichText {
  if (!Array.isArray(value)) throw new Error("Notion rich_text must be an array");
  return value.map((item) => {
    const source = asRecord(item, "Notion rich text item");
    const mention = isRecord(source.mention) && source.mention.type === "page" && isRecord(source.mention.page) && typeof source.mention.page.id === "string"
      ? source.mention.page.id
      : undefined;
    const annotations = isRecord(source.annotations) ? source.annotations : {};
    const result: RichText[number] = {
      plainText: typeof source.plain_text === "string" ? source.plain_text : "",
      annotations: {
        ...(annotations.bold === true ? { bold: true } : {}),
        ...(annotations.italic === true ? { italic: true } : {}),
        ...(annotations.underline === true ? { underline: true } : {}),
        ...(annotations.strikethrough === true ? { strikethrough: true } : {}),
        ...(annotations.code === true ? { code: true } : {}),
        color: notionColor(annotations.color),
      },
    };
    if (mention) result.pageId = mention;
    else if (typeof source.href === "string" && source.href) result.href = source.href;
    return result;
  });
}

function optionalRichText(value: unknown): RichText | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined;
  return richText(value);
}

function plainRichText(value: string): RichText {
  return [{ plainText: value, annotations: {} }];
}

function plainText(value: RichText | undefined): string {
  return value?.map((item) => item.plainText).join("").trim() ?? "";
}

function notionColor(value: unknown): RichTextColor {
  if (typeof value !== "string") return "default";
  const color = value.replace(/_background$/, "") as RichTextColor;
  return richTextColors.has(color) ? color : "default";
}

function calloutTone(value: unknown): "info" | "warning" | "risk" {
  const color = notionColor(value);
  if (color === "red") return "risk";
  if (color === "orange" || color === "yellow") return "warning";
  return "info";
}

function calloutIcon(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined;
  if (value.type === "emoji" && typeof value.emoji === "string") return value.emoji;
  return undefined;
}

function blockType(node: NotionBlockNode): string {
  return requiredString(node.type, `Notion block ${node.id} type`);
}

function payload(node: NotionBlockNode, type: string): Record<string, unknown> {
  return asRecord(node[type], `Notion block ${node.id} ${type} payload`);
}

function anchor(id: string): string {
  return `b-${id}`;
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required`);
  return value;
}

function hasText(value: unknown): value is string {
  return typeof value === "string" && Boolean(value.trim());
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`${label} must be an object`);
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
