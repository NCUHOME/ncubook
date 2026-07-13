import type { Block, PublishedFixture } from "@/lib/content/published-schema";

type AuditIssue = { code: "temporary-notion-url" | "unreachable-asset" | "missing-page-target" | "missing-asset-record"; detail: string };

export async function auditPublishedFixture(
  fixture: PublishedFixture,
  probe: (url: string) => Promise<{ ok: boolean; status: number }>,
): Promise<{ ok: boolean; issues: AuditIssue[] }> {
  const issues: AuditIssue[] = [];
  const pageIds = new Set(fixture.pages.map((page) => page.id));
  const assets = new Map(fixture.assets.map((asset) => [asset.id, asset]));

  for (const asset of fixture.assets) {
    if (/prod-files-secure|notion\.site\/image|amazonaws\.com\/signed/i.test(asset.publicUrl)) {
      issues.push({ code: "temporary-notion-url", detail: asset.id });
    }
    const result = await probe(asset.publicUrl);
    if (!result.ok) issues.push({ code: "unreachable-asset", detail: `${asset.id} (${result.status})` });
  }

  for (const blocks of Object.values(fixture.blocksByPageId)) {
    walk(blocks, (block) => {
      if (block.type === "page-link" && !pageIds.has(block.pageId)) issues.push({ code: "missing-page-target", detail: block.pageId });
      if ((block.type === "image" || block.type === "file") && !assets.has(block.assetId)) issues.push({ code: "missing-asset-record", detail: block.assetId });
    });
  }

  return { ok: issues.length === 0, issues };
}

function walk(blocks: Block[], visit: (block: Block) => void): void {
  for (const block of blocks) {
    visit(block);
    if (block.type === "columns") for (const column of block.columns) walk(column.blocks, visit);
    if (block.type === "bulleted-list" || block.type === "numbered-list") for (const item of block.items) walk(item.children, visit);
  }
}
