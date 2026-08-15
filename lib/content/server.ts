// 核心业务领域：Supabase 线上数据库版本化仓储与 ContentRepository 依赖注入工厂 (S5 合并)
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createFixtureRepository, publishedFixture } from "@/lib/content/fixture";
import type { Asset, Block, Page, PublishedFixture, SearchIndexEntry } from "@/lib/content/schema";
import { getSupabaseAdmin, hasSupabaseConfig } from "@/lib/integrations/supabase";

export type PageTreeNode = {
  id: string;
  title: string;
  href: string;
  children: PageTreeNode[];
};

export type DocumentView = {
  page: Page;
  blocks: Block[];
  description: string;
};

export interface ContentRepository {
  getDocumentView(slug: string): DocumentView | null;
  getSectionView(slug: string): DocumentView | null;
  getPublishedSections(): Page[];
  getSectionTree(sectionSlug: string): PageTreeNode[];
  getSectionChildren(sectionSlug: string): Page[];
  getSectionForPage(pageId: string): Page | null;
  getAsset(assetId: string): Asset | null;
  getSearchIndex(): SearchIndexEntry[];
  getPageRoutes(): Record<string, string>;
  resolvePageRoute(pageId: string): string;
}

export type LoadRepositoryOptions = {
  environment?: string;
  configured?: boolean;
  loadPublishedFixture?: () => Promise<PublishedFixture | null>;
};

export const getContentRepository = cache(async function getContentRepository(
  options: LoadRepositoryOptions = {},
): Promise<ContentRepository> {
  const environment = options.environment ?? process.env.PUBLISHED_CONTENT_ENV ?? process.env.VERCEL_ENV ?? "development";
  const configured = options.configured ?? hasSupabaseConfig();

  if (!configured) {
    if (environment === "production") throw new Error("Published content storage is not configured");
    return createFixtureRepository(publishedFixture);
  }

  try {
    const fixture = await (options.loadPublishedFixture ?? fetchPublishedFixtureFromSupabase)();
    if (fixture) return createFixtureRepository(fixture);
    if (environment === "production") throw new Error("No published content version is available");
  } catch (error) {
    if (environment === "production") throw error;
  }

  return createFixtureRepository(publishedFixture);
});

export { getContentRepository as loadPublishedRepository };

export async function fetchPublishedFixtureFromSupabase(): Promise<PublishedFixture | null> {
  if (!hasSupabaseConfig()) return null;
  const contentVersion = await readPublishedContentPointer();
  if (contentVersion) {
    try {
      const fixture = await unstable_cache(
        () => loadVersionFixture(contentVersion),
        ["published-content", contentVersion],
        { tags: [`published-content:${contentVersion}`] },
      )();
      if (fixture && fixture.pages.length > 0) return fixture;
    } catch (error) {
      console.error(JSON.stringify({
        event: "content_cache_load_failed",
        contentVersion,
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  }

  return findFallbackPublishedFixture();
}

async function findFallbackPublishedFixture(): Promise<PublishedFixture | null> {
  const client = getSupabaseAdmin();
  if (!client) return null;

  try {
    const { data: versions } = await client
      .from("content_versions")
      .select("id")
      .eq("status", "published")
      .order("started_at", { ascending: false })
      .limit(10);

    if (versions && versions.length > 0) {
      const candidates = await Promise.all(
        versions.map((row) => loadVersionFixture(row.id).catch((err) => {
          console.error(JSON.stringify({
            event: "fallback_candidate_load_failed",
            version: row.id,
            error: err instanceof Error ? err.message : String(err),
          }));
          return null;
        }))
      );
      for (const candidate of candidates) {
        if (candidate && candidate.pages.length > 0) return candidate;
      }
    }
  } catch (error) {
    console.error(JSON.stringify({
      event: "fallback_versions_query_failed",
      error: error instanceof Error ? error.message : String(error),
    }));
  }

  return null;
}

const readPublishedContentPointer = unstable_cache(
  async (): Promise<string | null> => {
    const client = getSupabaseAdmin();
    if (!client) return null;

    const pointerResult = await client
      .from("published_content_pointer")
      .select("content_version")
      .eq("singleton", true)
      .maybeSingle();
    if (pointerResult.error || !pointerResult.data) return null;
    return optionalString(pointerResult.data.content_version) ?? null;
  },
  ["published-content-pointer"],
  { revalidate: false, tags: ["published-content-pointer"] },
);

async function loadVersionFixture(contentVersion: string): Promise<PublishedFixture> {
  const client = getSupabaseAdmin();
  if (!client) throw new Error("Published content storage is not configured");

  const [pagesResult, blocksResult, assetsResult, searchResult] = await Promise.all([
    client.from("published_pages").select("*").eq("content_version", contentVersion).order("id").limit(1000),
    client.from("published_blocks").select("*").eq("content_version", contentVersion).order("source_page_id").order("ordinal").limit(10000),
    client.from("published_assets").select("*").eq("content_version", contentVersion).order("id").limit(2000),
    client.from("published_search_entries").select("*").eq("content_version", contentVersion).order("id").limit(10000),
  ]);

  for (const result of [pagesResult, blocksResult, assetsResult, searchResult]) {
    if (result.error) throw new Error(`Unable to read published content: ${result.error.message}`);
  }

  const rowCounts = [pagesResult, blocksResult, assetsResult, searchResult].map((result) => result.data?.length ?? 0);
  const rowLimits: Array<[string, number]> = [
    ["published_pages", 1000],
    ["published_blocks", 10000],
    ["published_assets", 2000],
    ["published_search_entries", 10000],
  ];
  rowLimits.forEach(([table, cap], index) => {
    if (rowCounts[index] === cap) {
      throw new Error(
        `Published content version ${contentVersion} reached the ${table} row cap of ${cap}; refusing to serve a silently truncated snapshot`,
      );
    }
  });

  const pages = (pagesResult.data ?? []).map(parsePageRow);
  const blocksByPageId: Record<string, Block[]> = {};
  for (const row of blocksResult.data ?? []) {
    const value = asRecord(row);
    const pageId = requiredString(value.source_page_id, "Published block page id");
    const block = decodePublishedBlock(value.block);
    (blocksByPageId[pageId] ??= []).push(block);
  }

  return {
    pages,
    blocksByPageId,
    assets: (assetsResult.data ?? []).map(parseAssetRow),
    searchIndex: (searchResult.data ?? []).map(parseSearchRow),
  };
}

export function decodePublishedBlock(input: unknown): Block {
  const value = asRecord(input);
  const type = requiredString(value.type, "Published block type");
  requiredString(value.id, "Published block id");
  requiredString(value.anchor, "Published block anchor");

  if (type === "quote") {
    const children = value.children === undefined ? [] : blockArray(value.children, "Published quote children");
    return { ...(value as Omit<Extract<Block, { type: "quote" }>, "children">), type, children };
  }
  if (type === "callout") {
    return { ...(value as Omit<Extract<Block, { type: "callout" }>, "children">), type, children: blockArray(value.children, "Published callout children") };
  }
  if (type === "bulleted-list" || type === "numbered-list") {
    if (!Array.isArray(value.items)) throw new Error("Published list items must be an array");
    return {
      ...(value as Omit<Extract<Block, { type: "bulleted-list" | "numbered-list" }>, "items">),
      type,
      items: value.items.map((item) => {
        const record = asRecord(item);
        return {
          ...(record as Omit<Extract<Block, { type: "bulleted-list" | "numbered-list" }>["items"][number], "children">),
          children: blockArray(record.children, "Published list item children"),
        };
      }),
    };
  }
  if (type === "columns") {
    if (!Array.isArray(value.columns)) throw new Error("Published columns must be an array");
    return {
      ...(value as Omit<Extract<Block, { type: "columns" }>, "columns">),
      type,
      columns: value.columns.map((column) => {
        const record = asRecord(column);
        return {
          ...(record as Omit<Extract<Block, { type: "columns" }>["columns"][number], "blocks">),
          blocks: blockArray(record.blocks, "Published column blocks"),
        };
      }),
    };
  }

  if (["paragraph", "heading", "divider", "table", "image", "file", "embed", "page-link"].includes(type)) {
    return value as Block;
  }
  throw new Error(`Unsupported published block type: ${type}`);
}

function blockArray(value: unknown, label: string): Block[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  return value.map(decodePublishedBlock);
}

function parsePageRow(row: unknown): Page {
  const value = asRecord(row);
  const metadata = asRecord(value.metadata);
  const riskLevel = requiredString(metadata.riskLevel, "Published page risk level");
  if (!isPageRiskLevel(riskLevel)) throw new Error(`Invalid published page risk level: ${riskLevel}`);
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

function isPageRiskLevel(value: string): value is Page["metadata"]["riskLevel"] {
  return value === "normal" || value === "needs-verification" || value === "sensitive";
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
    ? (value as Record<string, unknown>)
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

function isSearchBlockType(value: string): value is SearchIndexEntry["blockType"] {
  return value === "paragraph" || value === "heading" || value === "quote" || value === "callout" || value === "table" || value === "page-link";
}

export type VersionRecord = {
  version: string;
  status: "published" | "pending" | "failed";
  createdAt: string;
  isCurrent: boolean;
};

export async function getLivePublishedContentPointer(): Promise<string | null> {
  const client = getSupabaseAdmin();
  if (!client) return null;

  try {
    const pointerResult = await client
      .from("published_content_pointer")
      .select("content_version")
      .eq("singleton", true)
      .maybeSingle();
    if (pointerResult.error) {
      console.error(JSON.stringify({ event: "live_pointer_query_error", error: pointerResult.error.message }));
      return null;
    }
    return optionalString(pointerResult.data?.content_version) ?? null;
  } catch (error) {
    console.error(JSON.stringify({
      event: "live_pointer_query_failed",
      error: error instanceof Error ? error.message : String(error),
    }));
    return null;
  }
}

export async function fetchContentVersionsFromSupabase(): Promise<VersionRecord[]> {
  if (!hasSupabaseConfig()) return [];
  const client = getSupabaseAdmin();
  if (!client) return [];

  try {
    const currentPointer = await getLivePublishedContentPointer();
    const { data, error } = await client
      .from("content_versions")
      .select("id, status, started_at, published_at")
      .order("started_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error(JSON.stringify({ event: "fetch_content_versions_query_error", error: error.message }));
      return [];
    }
    if (!data || data.length === 0) return [];

    return data.map((row) => ({
      version: row.id,
      status: row.status === "failed" ? "failed" : row.status === "pending" ? "pending" : "published",
      createdAt: row.published_at || row.started_at || "",
      isCurrent: row.id === currentPointer,
    }));
  } catch (error) {
    console.error(JSON.stringify({
      event: "fetch_content_versions_failed",
      error: error instanceof Error ? error.message : String(error),
    }));
    return [];
  }
}
