import type { Block, BlockPresentation, RichText } from "@/lib/content/schema";

type ParagraphBlock = Extract<Block, { type: "paragraph" }>;
type CalloutBlock = Extract<Block, { type: "callout" }>;
type ListBlock = Extract<Block, { type: "numbered-list" | "bulleted-list" }>;

function plainRichText(value: RichText): string {
  return value.map((part) => part.plainText).join("");
}

function blockText(block: Block): string {
  if ("richText" in block) return plainRichText(block.richText).trim();
  if (block.type === "numbered-list" || block.type === "bulleted-list") {
    return block.items.map((item) => plainRichText(item.richText)).join("\n").trim();
  }
  return "";
}

function normalized(value: string): string {
  return value.replace(/\s+/g, "").replace(/[：:！!（）()]/g, "").toLowerCase();
}

function containsText(block: Block, value: string): boolean {
  return normalized(blockText(block)).includes(normalized(value));
}

function withPresentation<T extends Block>(block: T, presentation: BlockPresentation): T {
  return { ...block, presentation };
}

function isImagePlaceholder(block: Block): block is CalloutBlock {
  return block.type === "callout" && /图片占位|原始图片|聊天记录截图|校历图|地图|巴士/.test(blockText(block));
}

function isMedia(block: Block): boolean {
  return block.type === "image" || isImagePlaceholder(block);
}

function decoratePlaceholder(block: Block, presentation: BlockPresentation, caption?: string): Block {
  return isImagePlaceholder(block)
    ? { ...withPresentation(block, presentation), ...(caption ? { icon: caption } : {}) }
    : block;
}

function mediaGrid(blocks: Block[], presentation: BlockPresentation): Extract<Block, { type: "columns" }> {
  const first = blocks[0]!;
  return {
    id: first.id,
    anchor: first.anchor,
    type: "columns",
    presentation: "media-grid",
    columns: blocks.map((block) => ({
      id: `column-${block.id}`,
      blocks: [decoratePlaceholder(block, presentation)],
    })),
  };
}

function sliceRichText(value: RichText, from: number, to = Number.POSITIVE_INFINITY): RichText {
  const result: RichText = [];
  let offset = 0;

  for (const part of value) {
    const partStart = offset;
    const partEnd = offset + part.plainText.length;
    offset = partEnd;
    if (partEnd <= from || partStart >= to) continue;

    const start = Math.max(0, from - partStart);
    const end = Math.min(part.plainText.length, to - partStart);
    const plainText = part.plainText.slice(start, end);
    if (plainText) result.push({ ...part, plainText });
  }

  return result;
}

function trimRichText(value: RichText): RichText {
  const plain = plainRichText(value);
  const start = plain.search(/\S/);
  if (start < 0) return [];
  const trailing = plain.match(/\s*$/)?.[0].length ?? 0;
  return sliceRichText(value, start, plain.length - trailing);
}

function timelineCells(value: RichText): RichText[] {
  const plain = plainRichText(value);
  const firstLineEnd = plain.indexOf("\n");
  const timeMatch = plain.match(/^(八月(?:上旬|中旬|下旬)|\d+(?:\.\d+)*(?:[—–-](?:\d+(?:\.\d+)*|开学前))?)/);
  const timeEnd = firstLineEnd >= 0 ? firstLineEnd : (timeMatch?.[0].length ?? 0);

  if (timeEnd === 0) return [[], trimRichText(value), []];

  const time = trimRichText(sliceRichText(value, 0, timeEnd));
  const contentStart = firstLineEnd >= 0 ? firstLineEnd + 1 : timeEnd;
  const remainder = trimRichText(sliceRichText(value, contentStart));
  const remainderPlain = plainRichText(remainder);
  const detailStart = Math.max(remainderPlain.lastIndexOf("【"), remainderPlain.lastIndexOf("["));
  const detailEnd = Math.max(remainderPlain.lastIndexOf("】"), remainderPlain.lastIndexOf("]"));

  if (detailStart < 0 || detailEnd <= detailStart) return [time, remainder, []];

  return [
    time,
    trimRichText(sliceRichText(remainder, 0, detailStart)),
    trimRichText(sliceRichText(remainder, detailStart + 1, detailEnd)),
  ];
}

function registrationTimeline(block: ListBlock): Extract<Block, { type: "table" }> {
  return {
    id: block.id,
    anchor: block.anchor,
    type: "table",
    presentation: "registration-timeline",
    hasHeaderRow: false,
    rows: block.items.map((item) => ({ id: item.id, cells: timelineCells(item.richText) })),
  };
}

function joinRichText(blocks: ParagraphBlock[], separator = "\n"): RichText {
  const result: RichText = [];
  blocks.forEach((block, index) => {
    if (index > 0) result.push({ plainText: separator, annotations: {} });
    result.push(...block.richText);
  });
  return result;
}

function mergedParagraph(blocks: ParagraphBlock[], fallback: ParagraphBlock): ParagraphBlock {
  const source = blocks[0] ?? fallback;
  return { ...source, richText: blocks.length > 0 ? joinRichText(blocks) : fallback.richText };
}

function isArrow(block: ParagraphBlock): boolean {
  return /^[⬇↓↧\s]+$/.test(blockText(block));
}

function routeLayout(source: Block[], start: number): { blocks: Block[]; nextIndex: number } | null {
  const shortIndex = source.findIndex((block, index) => index > start && containsText(block, "天健→白帆"));
  if (shortIndex < 0) return null;

  const endIndex = source.findIndex(
    (block, index) => index > shortIndex && block.type === "heading" && containsText(block, "青桔单车"),
  );
  if (endIndex < 0) return null;

  const longTitle = source[start];
  const shortTitle = source[shortIndex];
  if (longTitle?.type !== "paragraph" || shortTitle?.type !== "paragraph") return null;

  const longRange = source.slice(start + 1, shortIndex);
  const shortRange = source.slice(shortIndex + 1, endIndex);
  const longStops = longRange.filter((block): block is ParagraphBlock => block.type === "paragraph" && !isArrow(block));
  const shortText = shortRange.filter((block): block is ParagraphBlock => block.type === "paragraph" && !isArrow(block));
  const noteIndex = shortText.findIndex((block) => containsText(block, "宝宝巴士"));
  const shortStops = noteIndex >= 0 ? shortText.slice(0, noteIndex) : shortText;
  const shortNote = noteIndex >= 0 ? shortText[noteIndex] : undefined;

  const routeColumns: Extract<Block, { type: "columns" }> = {
    id: longTitle.id,
    anchor: longTitle.anchor,
    type: "columns",
    presentation: "route-columns",
    columns: [
      {
        id: `route-long-${longTitle.id}`,
        blocks: [longTitle, mergedParagraph(longStops, longTitle)],
      },
      {
        id: `route-short-${shortTitle.id}`,
        blocks: [shortTitle, mergedParagraph(shortStops, shortTitle), ...(shortNote ? [shortNote] : [])],
      },
    ],
  };

  const media = [...longRange, ...shortRange].filter(isMedia);
  return {
    blocks: [routeColumns, ...(media.length > 0 ? [mediaGrid(media, "placeholder-shuttle")] : [])],
    nextIndex: endIndex,
  };
}

function linkedUrl(block: ParagraphBlock, host: string): string | null {
  for (const part of block.richText) {
    if (!part.href) continue;
    try {
      const url = new URL(part.href);
      if (url.hostname === host) return url.toString();
    } catch {
      // Invalid links remain normal rich text and are handled by the existing renderer.
    }
  }
  return null;
}

function isSalesScriptTable(block: Block): block is Extract<Block, { type: "table" }> {
  if (block.type !== "table" || block.rows.length === 0) return false;
  const headers = block.rows[0]!.cells.map(plainRichText).map(normalized);
  return headers.some((cell) => cell.includes("话术")) && headers.some((cell) => cell.includes("实际上"));
}

/**
 * Decorates Notion/Supabase blocks for the approved freshman-guide prototype.
 * Matching is semantic on purpose: production block IDs are Notion UUIDs,
 * while the local fixture uses deterministic preview IDs.
 */
export function adaptFreshmanBlocksToPrototype(source: Block[]): Block[] {
  const result: Block[] = [];
  let section = "";
  let subsection = "";

  for (let index = 0; index < source.length; index += 1) {
    const block = source[index]!;

    if (block.type === "heading") {
      const title = blockText(block);
      if (block.level === 1) {
        section = title;
        subsection = "";
      } else {
        subsection = title;
      }
      result.push(block);
      continue;
    }

    if (block.type === "paragraph" && normalized(blockText(block)) === normalized("常见话术")) {
      result.push(withPresentation(block, "emphasis-label"));
      continue;
    }

    if (isSalesScriptTable(block)) {
      result.push(withPresentation(block, "sales-script-table"));
      continue;
    }

    if (section.includes("预防诈骗") && isMedia(block)) {
      const media: Block[] = [];
      let cursor = index;
      while (cursor < source.length && isMedia(source[cursor]!)) {
        media.push(source[cursor]!);
        cursor += 1;
      }
      if (media.length >= 2) {
        result.push(mediaGrid(media, "placeholder-chat"));
        index = cursor - 1;
      } else {
        result.push(block);
      }
      continue;
    }

    if (subsection.includes("报到流程") && block.type === "numbered-list") {
      result.push(registrationTimeline(block));
      continue;
    }

    if (section.includes("校历")) {
      if (isMedia(block)) {
        result.push(decoratePlaceholder(block, "placeholder-calendar"));
        continue;
      }
      if (block.type === "paragraph" && /^\[?内容占位\]?$/.test(blockText(block))) continue;
    }

    if (section.includes("校园地图")) {
      if (block.type === "embed" && block.provider === "school-map") {
        result.push(withPresentation(block, "map-card"));
        continue;
      }

      if (block.type === "paragraph") {
        const mapUrl = linkedUrl(block, "school-map.ncuos.com");
        if (mapUrl) {
          const caption = source[index + 1];
          const hasCaption = caption?.type === "paragraph" && containsText(caption, "南大家园校园地图");
          result.push({
            id: block.id,
            anchor: block.anchor,
            type: "embed",
            provider: "school-map",
            canonicalUrl: mapUrl,
            title: hasCaption ? blockText(caption) : blockText(block) || "南大家园校园地图",
            presentation: "map-card",
          });
          if (hasCaption) index += 1;
          continue;
        }
      }

      if (isMedia(block)) {
        const presentation = subsection.includes("北部")
          ? "placeholder-map-north"
          : subsection.includes("南部") || subsection.includes("医学部")
            ? "placeholder-map-south"
            : "placeholder-map";
        result.push(decoratePlaceholder(block, presentation, subsection));
        continue;
      }
    }

    if (subsection.includes("环游车")) {
      if (isMedia(block)) {
        const media: Block[] = [];
        let cursor = index;
        while (cursor < source.length && isMedia(source[cursor]!)) {
          media.push(source[cursor]!);
          cursor += 1;
        }
        result.push(media.length >= 2 ? mediaGrid(media, "placeholder-shuttle") : decoratePlaceholder(block, "placeholder-shuttle"));
        index = cursor - 1;
        continue;
      }

      if (block.type === "paragraph" && containsText(block, "运行时间")) {
        const next = source[index + 1];
        if (next?.type === "paragraph" && containsText(next, "收费")) {
          result.push({
            id: block.id,
            anchor: block.anchor,
            type: "callout",
            tone: "info",
            richText: joinRichText([block, next]),
            children: [],
          });
          index += 1;
          continue;
        }
      }

      if (block.type === "paragraph" && containsText(block, "天健→医学院")) {
        const route = routeLayout(source, index);
        if (route) {
          result.push(...route.blocks);
          index = route.nextIndex - 1;
          continue;
        }
      }
    }

    result.push(block);
  }

  return result;
}
