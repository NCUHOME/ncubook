import type { Block, Page, RichText, SearchIndexEntry } from "@/lib/content/published-schema";

type SearchableBlockType = SearchIndexEntry["blockType"];

export function buildSearchIndex(
  page: Page,
  blocks: Block[],
  ancestorPath: string[],
): SearchIndexEntry[] {
  const entries: SearchIndexEntry[] = [];
  const headings: Array<string | undefined> = [];

  const addEntry = (
    sourceId: string,
    anchor: string,
    plainText: string,
    blockType: SearchableBlockType,
  ) => {
    if (!plainText.trim()) return;
    entries.push({
      id: `${page.contentVersion}-${sourceId}`,
      schemaVersion: 1,
      contentVersion: page.contentVersion,
      pageId: page.id,
      pageTitle: page.title,
      sectionPath: [...ancestorPath, ...headings.filter((heading): heading is string => Boolean(heading))],
      anchor,
      plainText,
      blockType,
      updatedAt: page.lastEditedTime,
    });
  };

  const visit = (sourceBlocks: Block[]) => {
    for (const block of sourceBlocks) {
      switch (block.type) {
        case "paragraph":
        case "quote":
        case "page-link":
          addEntry(block.id, block.anchor, richText(block.richText), block.type);
          break;
        case "callout":
          addEntry(block.id, block.anchor, richText(block.richText), "callout");
          visit(block.children);
          break;
        case "heading": {
          const title = richText(block.richText);
          addEntry(block.id, block.anchor, title, "heading");
          headings.length = block.level;
          headings[block.level - 1] = title;
          break;
        }
        case "bulleted-list":
        case "numbered-list":
          for (const item of block.items) {
            addEntry(item.id, anchorFromSourceId(item.id), richText(item.richText), "paragraph");
            visit(item.children);
          }
          break;
        case "table":
          for (const row of block.rows) {
            addEntry(
              row.id,
              anchorFromSourceId(row.id),
              row.cells.map(richText).filter(Boolean).join(" "),
              "table",
            );
          }
          break;
        case "columns":
          for (const column of block.columns) visit(column.blocks);
          break;
        case "image":
          if (block.caption) addEntry(block.id, block.anchor, richText(block.caption), "paragraph");
          break;
        case "file":
          if (block.caption) addEntry(block.id, block.anchor, richText(block.caption), "paragraph");
          break;
        case "embed":
        case "divider":
          break;
        default:
          assertNever(block);
      }
    }
  };

  visit(blocks);
  return entries;
}

function richText(value: RichText): string {
  return value.map((part) => part.plainText).join("");
}

function anchorFromSourceId(sourceId: string): string {
  return `b-${sourceId}`;
}

function assertNever(value: never): never {
  throw new Error(`Unsupported published block: ${JSON.stringify(value)}`);
}
