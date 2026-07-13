import { unstable_cache } from "next/cache";
import { publishedFixture } from "@/lib/content/published-fixtures";
import { createPublishedRepository, type PublishedRepository } from "@/lib/content/published-repository";
import type { Asset, Block, Page, PublishedFixture, SearchIndexEntry } from "@/lib/content/published-schema";
import { getSupabaseAdmin, hasSupabaseConfig } from "@/lib/db/supabase";

type LoadPublishedRepositoryOptions = {
  environment?: string;
  configured?: boolean;
  loadPublishedFixture?: () => Promise<PublishedFixture | null>;
};

export async function loadPublishedRepository(
  options: LoadPublishedRepositoryOptions = {},
): Promise<PublishedRepository> {
  const environment = options.environment ?? process.env.PUBLISHED_CONTENT_ENV ?? process.env.VERCEL_ENV ?? "development";
  const configured = options.configured ?? hasSupabaseConfig();

  if (!configured) {
    if (environment === "production") throw new Error("Published content storage is not configured");
    return createPublishedRepository(publishedFixture);
  }

  try {
    const fixture = await (options.loadPublishedFixture ?? loadCurrentPublishedFixture)();
    if (fixture) return createPublishedRepository(fixture);
    if (environment === "production") throw new Error("No published content version is available");
  } catch (error) {
    if (environment === "production") throw error;
  }

  return createPublishedRepository(publishedFixture);
}

async function loadCurrentPublishedFixture(): Promise<PublishedFixture | null> {
  const client = getSupabaseAdmin();
  if (!client) return null;

  const pointerResult = await client
    .from("published_content_pointer")
    .select("content_version")
    .eq("singleton", true)
    .maybeSingle();
  if (pointerResult.error) throw new Error(`Unable to read published content pointer: ${pointerResult.error.message}`);
  const pointer = asRecord(pointerResult.data);
  const contentVersion = optionalString(pointer.content_version);
  if (!contentVersion) return null;

  return unstable_cache(
    () => loadVersionFixture(contentVersion),
    ["published-content", contentVersion],
    { tags: [`published-content:${contentVersion}`] },
  )();
}

async function loadVersionFixture(contentVersion: string): Promise<PublishedFixture> {
  const client = getSupabaseAdmin();
  if (!client) throw new Error("Published content storage is not configured");

  const [pagesResult, blocksResult, assetsResult, searchResult] = await Promise.all([
    client.from("published_pages").select("*").eq("content_version", contentVersion).order("id"),
    client.from("published_blocks").select("*").eq("content_version", contentVersion).order("source_page_id").order("ordinal"),
    client.from("published_assets").select("*").eq("content_version", contentVersion).order("id"),
    client.from("published_search_entries").select("*").eq("content_version", contentVersion).order("id"),
  ]);

  for (const result of [pagesResult, blocksResult, assetsResult, searchResult]) {
    if (result.error) throw new Error(`Unable to read published content: ${result.error.message}`);
  }

  const pages = (pagesResult.data ?? []).map(parsePageRow);
  const blocksByPageId: Record<string, Block[]> = {};
  for (const row of blocksResult.data ?? []) {
    const value = asRecord(row);
    const pageId = requiredString(value.source_page_id, "Published block page id");
    const block = asRecord(value.block) as Block;
    (blocksByPageId[pageId] ??= []).push(block);
  }

  return {
    pages,
    blocksByPageId,
    assets: (assetsResult.data ?? []).map(parseAssetRow),
    searchIndex: (searchResult.data ?? []).map(parseSearchRow),
  };
}

function parsePageRow(row: unknown): Page {
  const value = asRecord(row);
  const metadata = asRecord(value.metadata);
  const riskLevel = requiredString(metadata.riskLevel, "Published page risk level");
  if (!isRiskLevel(riskLevel)) throw new Error(`Invalid published page risk level: ${riskLevel}`);
  return {
    id: requiredString(value.source_page_id, "Published page id"),
    schemaVersion: 1,
    contentVersion: requiredString(value.content_version, "Published page content version"),
    parentId: optionalString(value.parent_source_page_id) ?? null,
    title: requiredString(value.title, "Published page title"),
    slug: requiredString(value.slug, "Published page slug"),
    status: value.status === "failed" ? "failed" : "published",
    lastEditedTime: requiredString(value.last_edited_time, "Published page edited time"),
    lastPublishedAt: requiredString(value.last_published_at, "Published page publication time"),
    metadata: {
      school: "ncu",
      campus: stringArray(metadata.campus),
      audiences: stringArray(metadata.audiences),
      topics: stringArray(metadata.topics),
      sourceUrls: stringArray(metadata.sourceUrls),
      riskLevel,
    },
  };
}

function parseAssetRow(row: unknown): Asset {
  const value = asRecord(row);
  const kind = requiredString(value.kind, "Published asset kind");
  if (kind !== "image" && kind !== "file") throw new Error(`Invalid published asset kind: ${kind}`);
  const alt = optionalString(value.alt);
  return {
    id: requiredString(value.asset_id, "Published asset id"),
    sourceBlockId: requiredString(value.source_block_id, "Published asset block id"),
    contentVersion: requiredString(value.content_version, "Published asset content version"),
    kind,
    publicUrl: requiredString(value.public_url, "Published asset URL"),
    checksum: requiredString(value.checksum, "Published asset checksum"),
    ...(alt ? { alt } : {}),
  };
}

function parseSearchRow(row: unknown): SearchIndexEntry {
  const value = asRecord(row);
  const blockType = requiredString(value.block_type, "Published search block type");
  if (!isSearchBlockType(blockType)) throw new Error(`Invalid published search block type: ${blockType}`);
  const contentVersion = requiredString(value.content_version, "Published search content version");
  const sourceBlockId = requiredString(value.source_block_id, "Published search block id");
  return {
    id: `${contentVersion}-${sourceBlockId}`,
    schemaVersion: 1,
    contentVersion,
    pageId: requiredString(value.source_page_id, "Published search page id"),
    pageTitle: requiredString(value.page_title, "Published search page title"),
    sectionPath: stringArray(value.section_path),
    anchor: requiredString(value.anchor, "Published search anchor"),
    plainText: requiredString(value.plain_text, "Published search text"),
    blockType,
    updatedAt: requiredString(value.updated_at, "Published search updated time"),
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function requiredString(value: unknown, label: string): string {
  const result = optionalString(value);
  if (!result) throw new Error(`${label} is required`);
  return result;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function isRiskLevel(value: string): value is Page["metadata"]["riskLevel"] {
  return value === "normal" || value === "needs-verification" || value === "sensitive";
}

function isSearchBlockType(value: string): value is SearchIndexEntry["blockType"] {
  return value === "paragraph" || value === "heading" || value === "quote" || value === "callout" || value === "table" || value === "page-link";
}
