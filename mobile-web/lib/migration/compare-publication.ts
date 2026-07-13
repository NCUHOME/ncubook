import type { Block } from "@/lib/content/published-schema";

type PageSnapshot = { pageId: string; blocks: Block[]; assetIds: string[] };
type ParityIssue = { code: "lost-text" | "heading-or-order-changed" | "structure-changed" | "missing-anchor" | "missing-asset"; detail: string };

export function comparePagePublication(source: PageSnapshot, target: PageSnapshot): { pageId: string; ok: boolean; issues: ParityIssue[] } {
  if (source.pageId !== target.pageId) throw new Error("Cannot compare different source pages");
  const issues: ParityIssue[] = [];
  const sourceText = textSequence(source.blocks);
  const targetText = textSequence(target.blocks);
  for (const value of sourceText) if (!targetText.includes(value)) issues.push({ code: "lost-text", detail: value });

  const sourceOrder = blockOrder(source.blocks);
  const targetOrder = blockOrder(target.blocks);
  if (sourceOrder.join("|") !== targetOrder.join("|")) issues.push({ code: "heading-or-order-changed", detail: "Published block order differs from the normalized source" });

  const sourceStructure = structureCounts(source.blocks);
  const targetStructure = structureCounts(target.blocks);
  if (JSON.stringify(sourceStructure) !== JSON.stringify(targetStructure)) issues.push({ code: "structure-changed", detail: "List, table, image, file, column, or link counts differ" });

  const targetAnchors = new Set(anchors(target.blocks));
  for (const anchor of anchors(source.blocks)) if (!targetAnchors.has(anchor)) issues.push({ code: "missing-anchor", detail: anchor });
  const targetAssets = new Set(target.assetIds);
  for (const assetId of source.assetIds) if (!targetAssets.has(assetId)) issues.push({ code: "missing-asset", detail: assetId });
  return { pageId: source.pageId, ok: issues.length === 0, issues };
}

function textSequence(blocks: Block[]): string[] {
  const result: string[] = [];
  walk(blocks, (block) => {
    if ("richText" in block) result.push(block.richText.map((item) => item.plainText).join(""));
    if ((block.type === "image" || block.type === "file") && block.caption) result.push(block.caption.map((item) => item.plainText).join(""));
    if (block.type === "table") for (const row of block.rows) result.push(row.cells.flat().map((item) => item.plainText).join(""));
    if (block.type === "bulleted-list" || block.type === "numbered-list") for (const item of block.items) result.push(item.richText.map((part) => part.plainText).join(""));
  });
  return result.filter(Boolean);
}

function blockOrder(blocks: Block[]): string[] {
  const result: string[] = [];
  walk(blocks, (block) => result.push(block.id));
  return result;
}

function anchors(blocks: Block[]): string[] {
  const result: string[] = [];
  walk(blocks, (block) => {
    result.push(block.anchor);
    if (block.type === "table") for (const row of block.rows) result.push(`b-${row.id}`);
    if (block.type === "bulleted-list" || block.type === "numbered-list") for (const item of block.items) result.push(`b-${item.id}`);
  });
  return result;
}

function structureCounts(blocks: Block[]): Record<string, number> {
  const result: Record<string, number> = {};
  walk(blocks, (block) => { result[block.type] = (result[block.type] ?? 0) + 1; });
  return result;
}

function walk(blocks: Block[], visit: (block: Block) => void): void {
  for (const block of blocks) {
    visit(block);
    if (block.type === "columns") for (const column of block.columns) walk(column.blocks, visit);
    if (block.type === "bulleted-list" || block.type === "numbered-list") for (const item of block.items) walk(item.children, visit);
  }
}
