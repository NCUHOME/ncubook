import { readFile } from "node:fs/promises";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type RecordValue = Record<string, unknown>;
type Manifest = {
  referencePageCount: number;
  pages: Array<{ sourcePageId: string; parentPageId: string | null; targetSlug: string; title: string }>;
};

const quoteId = "2467d60a-0dda-809e-99c9-d5dfc89311bd";
const quoteFileIds = ["2467d60a-0dda-80f5-b9ab-f909b0443fe9", "2467d60a-0dda-803f-a040-f9ae759efb97"];
const args = process.argv.slice(2);
const expectedVersion = valueAfter("--expected-version");
const allowLegacyQuote = args.includes("--allow-legacy-quote");
if (!expectedVersion) fail("--expected-version is required");

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) fail("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");

const manifest = JSON.parse(await readFile(new URL("../../migration/manifest.json", import.meta.url), "utf8")) as Manifest;
const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const issues: string[] = [];

const pointerRows = await selectAll(client, "published_content_pointer", "*");
const pointerVersion = optionalString(pointerRows.find((row) => row.singleton === true)?.content_version);
if (pointerVersion !== expectedVersion) issues.push(`pointer expected ${expectedVersion}, received ${pointerVersion ?? "none"}`);

const [pages, blockRows, assets, searchEntries] = await Promise.all([
  selectAll(client, "published_pages", "*", expectedVersion),
  selectAll(client, "published_blocks", "*", expectedVersion),
  selectAll(client, "published_assets", "*", expectedVersion),
  selectAll(client, "published_search_entries", "*", expectedVersion),
]);

auditManifest(manifest, pages, issues);
const pageIds = new Set(pages.map((row) => canonicalId(requiredString(row.source_page_id, "page id"))));
const pageAnchors = new Map<string, Set<string>>();
const referencedAssets = new Set<string>();
const structure = new Map<string, { parentId: string | null; siblingIndex: number; type: string }>();

for (const row of blockRows) {
  const pageId = canonicalId(requiredString(row.source_page_id, "block page id"));
  const ordinal = finiteNumber(row.ordinal);
  walkBlock(asRecord(row.block), pageId, null, ordinal, pageAnchors, referencedAssets, pageIds, structure, issues);
}

for (const entry of searchEntries) {
  const pageId = canonicalId(requiredString(entry.source_page_id, "search page id"));
  const anchor = requiredString(entry.anchor, "search anchor");
  if (!pageAnchors.get(pageId)?.has(anchor)) issues.push(`search anchor missing: ${pageId}#${anchor}`);
}

const assetIds = new Set(assets.map((row) => requiredString(row.asset_id, "asset id")));
for (const assetId of referencedAssets) if (!assetIds.has(assetId)) issues.push(`referenced asset missing: ${assetId}`);
const allowedLegacyAssets = new Set(quoteFileIds.map((id) => `asset-${id}`));
for (const assetId of assetIds) {
  if (!referencedAssets.has(assetId) && !(allowLegacyQuote && allowedLegacyAssets.has(assetId))) {
    issues.push(`unreferenced asset: ${assetId}`);
  }
}

const quote = structure.get(canonicalId(quoteId));
const firstFile = structure.get(canonicalId(quoteFileIds[0]));
const secondFile = structure.get(canonicalId(quoteFileIds[1]));
if (!quote) issues.push(`quote block missing: ${quoteId}`);
if (!allowLegacyQuote) {
  if (firstFile?.parentId !== canonicalId(quoteId) || firstFile.siblingIndex !== 0) issues.push("first quote PDF is not child index 0");
  if (secondFile?.parentId !== canonicalId(quoteId) || secondFile.siblingIndex !== 1) issues.push("second quote PDF is not child index 1");
}

const unreachable = await mapLimited(assets, 8, async (asset) => {
  const publicUrl = requiredString(asset.public_url, "asset public URL");
  try {
    let response = await fetch(publicUrl, { method: "HEAD" });
    if (response.status === 405) response = await fetch(publicUrl, { headers: { range: "bytes=0-0" } });
    return response.ok ? null : `${requiredString(asset.asset_id, "asset id")}: HTTP ${response.status}`;
  } catch (error) {
    return `${requiredString(asset.asset_id, "asset id")}: ${error instanceof Error ? error.message : String(error)}`;
  }
});
for (const item of unreachable) if (item) issues.push(`asset unreachable: ${item}`);

const result = {
  expectedVersion,
  pointerVersion,
  counts: { pages: pages.length, storedBlocks: blockRows.length, assets: assets.length, searchEntries: searchEntries.length },
  quoteChildren: allowLegacyQuote ? "legacy-compatible" : quoteFileIds.map((id) => ({ id, ...structure.get(canonicalId(id)) })),
  issues,
};
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (issues.length > 0) process.exitCode = 1;

function walkBlock(
  block: RecordValue,
  pageId: string,
  parentId: string | null,
  siblingIndex: number,
  pageAnchors: Map<string, Set<string>>,
  referencedAssets: Set<string>,
  pageIds: Set<string>,
  structure: Map<string, { parentId: string | null; siblingIndex: number; type: string }>,
  issues: string[],
): void {
  const id = canonicalId(requiredString(block.id, "block id"));
  const type = requiredString(block.type, "block type");
  structure.set(id, { parentId, siblingIndex, type });
  const anchors = pageAnchors.get(pageId) ?? new Set<string>();
  anchors.add(requiredString(block.anchor, "block anchor"));
  pageAnchors.set(pageId, anchors);
  if (type === "image" || type === "file") referencedAssets.add(requiredString(block.assetId, "block asset id"));
  if (type === "page-link" && !pageIds.has(canonicalId(requiredString(block.pageId, "linked page id")))) {
    issues.push(`page link target missing: ${block.pageId}`);
  }
  const children = type === "quote" || type === "callout" ? array(block.children) : [];
  children.forEach((child, index) => walkBlock(asRecord(child), pageId, id, index, pageAnchors, referencedAssets, pageIds, structure, issues));
  if (type === "bulleted-list" || type === "numbered-list") {
    array(block.items).forEach((itemValue, itemIndex) => {
      const item = asRecord(itemValue);
      const rawItemId = requiredString(item.id, "list item id");
      const itemId = canonicalId(rawItemId);
      anchors.add(`b-${rawItemId}`);
      array(item.children).forEach((child, index) => walkBlock(asRecord(child), pageId, itemId, index, pageAnchors, referencedAssets, pageIds, structure, issues));
      structure.set(itemId, { parentId: id, siblingIndex: itemIndex, type: "list-item" });
    });
  }
  if (type === "columns") {
    array(block.columns).forEach((columnValue, columnIndex) => {
      const column = asRecord(columnValue);
      const columnId = canonicalId(requiredString(column.id, "column id"));
      array(column.blocks).forEach((child, index) => walkBlock(asRecord(child), pageId, columnId, index, pageAnchors, referencedAssets, pageIds, structure, issues));
      structure.set(columnId, { parentId: id, siblingIndex: columnIndex, type: "column" });
    });
  }
  if (type === "table") {
    array(block.rows).forEach((row) => anchors.add(`b-${requiredString(asRecord(row).id, "table row id")}`));
  }
}

function auditManifest(manifest: Manifest, rows: RecordValue[], issues: string[]): void {
  if (rows.length !== manifest.referencePageCount) issues.push(`manifest page count expected ${manifest.referencePageCount}, received ${rows.length}`);
  const byId = new Map(rows.map((row) => [canonicalId(requiredString(row.source_page_id, "page id")), row]));
  for (const expected of manifest.pages) {
    const row = byId.get(canonicalId(expected.sourcePageId));
    if (!row) { issues.push(`manifest page missing: ${expected.sourcePageId}`); continue; }
    const actualParent = optionalString(row.parent_source_page_id);
    if ((actualParent ? canonicalId(actualParent) : null) !== (expected.parentPageId ? canonicalId(expected.parentPageId) : null)) issues.push(`page parent mismatch: ${expected.sourcePageId}`);
    if (row.title !== expected.title) issues.push(`page title mismatch: ${expected.sourcePageId}`);
    if (row.slug !== expected.targetSlug) issues.push(`page slug mismatch: ${expected.sourcePageId}`);
  }
}

async function selectAll(client: SupabaseClient, table: string, columns: string, contentVersion?: string): Promise<RecordValue[]> {
  const rows: RecordValue[] = [];
  for (let from = 0; ; from += 1000) {
    let query = client.from(table).select(columns).range(from, from + 999);
    if (contentVersion) query = query.eq("content_version", contentVersion);
    const result = await query;
    if (result.error) fail(`Unable to read ${table}: ${result.error.message}`);
    const page = (result.data ?? []) as unknown as RecordValue[];
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}

async function mapLimited<T, R>(items: T[], limit: number, mapper: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await mapper(items[index]);
    }
  }));
  return results;
}

function valueAfter(flag: string): string | undefined { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : undefined; }
function canonicalId(value: string): string { return value.replaceAll("-", "").toLowerCase(); }
function asRecord(value: unknown): RecordValue { return typeof value === "object" && value !== null && !Array.isArray(value) ? value as RecordValue : {}; }
function array(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function optionalString(value: unknown): string | undefined { return typeof value === "string" && value.trim() ? value : undefined; }
function requiredString(value: unknown, label: string): string { const result = optionalString(value); if (!result) fail(`${label} is required`); return result; }
function finiteNumber(value: unknown): number { return typeof value === "number" && Number.isFinite(value) ? value : 0; }
function fail(reason: string): never { throw new Error(reason); }
