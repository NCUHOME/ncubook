// 核心业务领域：Supabase 线上数据库按页取数版本化仓储与 ContentRepository 接口声明 (M-3)
import { unstable_cache } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createFixtureRepository, publishedFixture } from "@/lib/content/fixture";
import type { Asset, Block, Page, SearchIndexEntry } from "@/lib/content/schema";
import type { Database } from "@/lib/database.types";
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
  assets?: Asset[];
};

export type SectionView = DocumentView;

export interface ContentRepository {
  getContentVersion(): Promise<string> | string;
  getDocument(slug: string): Promise<DocumentView | null>;
  getDocumentView(slug: string): Promise<DocumentView | null>;
  getSection(slug: string): Promise<SectionView | null>;
  getSectionView(slug: string): Promise<SectionView | null>;
  getPublishedSections(): Promise<Page[]>;
  getSectionTree(sectionSlug: string): Promise<PageTreeNode[]>;
  getSectionChildren(sectionSlug: string): Promise<Page[]>;
  getSectionForPage(pageId: string): Promise<Page | null>;
  getAsset(assetId: string): Promise<Asset | null>;
  getSearchIndex(): Promise<SearchIndexEntry[]>;
  getPageRoutes(): Promise<Record<string, string>>;
  resolvePageRoute(pageId: string): string;
}

export type LoadRepositoryOptions = {
  environment?: string;
  configured?: boolean;
};

export async function loadPublishedRepository(
  options: LoadRepositoryOptions = {},
): Promise<ContentRepository> {
  const environment = options.environment ?? process.env.PUBLISHED_CONTENT_ENV ?? process.env.VERCEL_ENV ?? "development";
  const configured = options.configured ?? hasSupabaseConfig();

  if (!configured) {
    if (environment === "production") throw new Error("Published content storage is not configured");
    return createFixtureRepository(publishedFixture);
  }

  const client = getSupabaseAdmin();
  if (!client) {
    if (environment === "production") throw new Error("Published content storage is not configured");
    return createFixtureRepository(publishedFixture);
  }

  const contentVersion = await readPublishedContentPointer();
  if (!contentVersion) {
    if (environment === "production") throw new Error("No published content version is available");
    return createFixtureRepository(publishedFixture);
  }

  return new SupabaseContentRepository(client, contentVersion);
}

export { loadPublishedRepository as getContentRepository };

export const readPublishedContentPointer = unstable_cache(
  async (): Promise<string | null> => {
    const client = getSupabaseAdmin();
    if (!client) return null;

    try {
      const pointerResult = await client
        .from("published_content_pointer")
        .select("content_version")
        .eq("singleton", true)
        .maybeSingle();
      if (pointerResult.error || !pointerResult.data) return null;
      return optionalString(pointerResult.data.content_version) ?? null;
    } catch (error) {
      console.error(JSON.stringify({
        event: "read_pointer_failed",
        error: error instanceof Error ? error.message : String(error),
      }));
      return null;
    }
  },
  ["published-content-pointer"],
  { revalidate: false, tags: ["published-content-pointer"] },
);

export class SupabaseContentRepository implements ContentRepository {
  private client: SupabaseClient<Database>;
  private version: string;

  constructor(client: SupabaseClient<Database>, version: string) {
    this.client = client;
    this.version = version;
  }

  getContentVersion(): string {
    return this.version;
  }

  async getDocument(slug: string): Promise<DocumentView | null> {
    return unstable_cache(
      async () => {
        const { data: pageRow, error: pageErr } = await this.client
          .from("published_pages")
          .select("*")
          .eq("content_version", this.version)
          .eq("slug", slug)
          .maybeSingle();

        if (pageErr) {
          console.error(JSON.stringify({ event: "get_document_page_error", slug, error: pageErr.message }));
          return null;
        }
        if (!pageRow) return null;
        const page = parsePageRow(pageRow);

        const [{ data: blockRows, error: blockErr }, { data: assetRows, error: assetErr }] = await Promise.all([
          this.client
            .from("published_blocks")
            .select("*")
            .eq("content_version", this.version)
            .eq("source_page_id", page.id)
            .order("ordinal")
            .limit(2000),
          this.client
            .from("published_assets")
            .select("*")
            .eq("content_version", this.version)
            .eq("source_page_id", page.id)
            .limit(500),
        ]);

        if (blockErr) {
          console.error(JSON.stringify({ event: "get_document_blocks_error", slug, error: blockErr.message }));
          return null;
        }
        if (assetErr) {
          console.error(JSON.stringify({ event: "get_document_assets_error", slug, error: assetErr.message }));
        }
        if ((blockRows?.length ?? 0) >= 2000) {
          throw new Error(
            `Page ${slug} reached the published_blocks cap of 2000 rows; refusing to serve truncated document`,
          );
        }

        const blocks = (blockRows ?? []).map((row) => decodePublishedBlock(row.block));
        const assets = (assetRows ?? []).map(parseAssetRow);
        return {
          page,
          blocks,
          description: firstPlainText(blocks),
          assets,
        };
      },
      ["doc-view", this.version, slug],
      { tags: [`published-content:${this.version}:${slug}`] },
    )();
  }

  getDocumentView = (slug: string): Promise<DocumentView | null> => this.getDocument(slug);

  async getSection(slug: string): Promise<SectionView | null> {
    const view = await this.getDocument(slug);
    if (!view || view.page.parentId !== null) return null;
    return view;
  }

  getSectionView = (slug: string): Promise<SectionView | null> => this.getSection(slug);

  async getPublishedSections(): Promise<Page[]> {
    return unstable_cache(
      async () => {
        const { data, error } = await this.client
          .from("published_pages")
          .select("*")
          .eq("content_version", this.version)
          .is("parent_source_page_id", null)
          .order("id")
          .limit(100);

        if (error) {
          console.error(JSON.stringify({ event: "get_sections_error", error: error.message }));
          return [];
        }
        return (data ?? []).map(parsePageRow);
      },
      ["published-sections", this.version],
      { tags: [`published-content:${this.version}:sections`] },
    )();
  }

  async getSectionTree(sectionSlug: string): Promise<PageTreeNode[]> {
    return unstable_cache(
      async () => {
        const { data: sectionRow } = await this.client
          .from("published_pages")
          .select("source_page_id, tree_path")
          .eq("content_version", this.version)
          .eq("slug", sectionSlug)
          .is("parent_source_page_id", null)
          .maybeSingle();

        if (!sectionRow) return [];
        if (Array.isArray(sectionRow.tree_path) && sectionRow.tree_path.length > 0) {
          return sectionRow.tree_path as unknown as PageTreeNode[];
        }

        // 回退动态建树
        const { data: pages } = await this.client
          .from("published_pages")
          .select("source_page_id, parent_source_page_id, title, slug, route_path")
          .eq("content_version", this.version)
          .limit(1000);

        if (!pages) return [];
        const pageList = pages.map((p) => ({
          id: p.source_page_id,
          parentId: p.parent_source_page_id,
          title: p.title,
          slug: p.slug,
          href: p.route_path || (p.parent_source_page_id ? `/docs/${p.slug}` : `/sections/${p.slug}`),
        }));

        const buildTree = (parentId: string): PageTreeNode[] =>
          pageList
            .filter((p) => p.parentId === parentId)
            .map((p) => ({
              id: p.id,
              title: p.title,
              href: p.href,
              children: buildTree(p.id),
            }));

        return buildTree(sectionRow.source_page_id);
      },
      ["section-tree", this.version, sectionSlug],
      { tags: [`published-content:${this.version}:tree:${sectionSlug}`] },
    )();
  }

  async getSectionChildren(sectionSlug: string): Promise<Page[]> {
    return unstable_cache(
      async () => {
        const { data: section } = await this.client
          .from("published_pages")
          .select("source_page_id")
          .eq("content_version", this.version)
          .eq("slug", sectionSlug)
          .is("parent_source_page_id", null)
          .maybeSingle();

        if (!section) return [];
        const { data: children, error } = await this.client
          .from("published_pages")
          .select("*")
          .eq("content_version", this.version)
          .eq("parent_source_page_id", section.source_page_id)
          .order("id")
          .limit(100);

        if (error) return [];
        return (children ?? []).map(parsePageRow);
      },
      ["section-children", this.version, sectionSlug],
      { tags: [`published-content:${this.version}:children:${sectionSlug}`] },
    )();
  }

  async getSectionForPage(pageId: string): Promise<Page | null> {
    return unstable_cache(
      async () => {
        let currentId: string | null = pageId;
        while (currentId) {
          const { data: p } = await this.client
            .from("published_pages")
            .select("*")
            .eq("content_version", this.version)
            .eq("source_page_id", currentId)
            .maybeSingle();

          if (!p) return null;
          if (!p.parent_source_page_id) return parsePageRow(p);
          currentId = p.parent_source_page_id;
        }
        return null;
      },
      ["section-for-page", this.version, pageId],
      { tags: [`published-content:${this.version}:page-section:${pageId}`] },
    )();
  }

  async getAsset(assetId: string): Promise<Asset | null> {
    const { data, error } = await this.client
      .from("published_assets")
      .select("*")
      .eq("content_version", this.version)
      .eq("asset_id", assetId)
      .maybeSingle();

    if (error || !data) return null;
    return parseAssetRow(data);
  }

  async getSearchIndex(): Promise<SearchIndexEntry[]> {
    return unstable_cache(
      async () => {
        const { data, error } = await this.client
          .from("published_search_segments")
          .select("*")
          .eq("content_version", this.version)
          .order("id")
          .limit(10000);

        if (error) {
          console.error(JSON.stringify({ event: "get_search_index_error", error: error.message }));
          return [];
        }
        return (data ?? []).map(parseSearchRow);
      },
      ["search-index", this.version],
      { tags: [`published-content:${this.version}:search-index`] },
    )();
  }

  async getPageRoutes(): Promise<Record<string, string>> {
    return unstable_cache(
      async () => {
        const { data, error } = await this.client
          .from("published_pages")
          .select("source_page_id, parent_source_page_id, slug, route_path")
          .eq("content_version", this.version)
          .limit(1000);

        if (error || !data) return {};
        const routes: Record<string, string> = {};
        for (const row of data) {
          routes[row.source_page_id] =
            row.route_path || (row.parent_source_page_id ? `/docs/${row.slug}` : `/sections/${row.slug}`);
        }
        return routes;
      },
      ["page-routes", this.version],
      { tags: [`published-content:${this.version}:routes`] },
    )();
  }

  resolvePageRoute(pageId: string): string {
    return `/docs/${pageId}`;
  }
}

export function decodePublishedBlock(input: unknown): Block {
  const value = asRecord(input);
  const type = requiredString(value.type, "Published block type");
  requiredString(value.id, "Published block id");
  requiredString(value.anchor, "Published block anchor");

  if (type === "quote") {
    return {
      ...(value as Omit<Extract<Block, { type: "quote" }>, "children">),
      type,
      children: blockArray(value.children ?? [], "Published quote children"),
    };
  }
  if (type === "callout") {
    return {
      ...(value as Omit<Extract<Block, { type: "callout" }>, "children">),
      type,
      children: blockArray(value.children ?? [], "Published callout children"),
    };
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
          children: blockArray(record.children ?? [], "Published list item children"),
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
          blocks: blockArray(record.blocks ?? [], "Published column blocks"),
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
  const rawRisk = value.risk_level ?? metadata.riskLevel;
  const riskLevel = typeof rawRisk === "string" && (rawRisk === "normal" || rawRisk === "needs-verification" || rawRisk === "sensitive")
    ? rawRisk
    : "normal";

  return {
    id: requiredString(value.source_page_id, "Published page id"),
    schemaVersion: 1,
    contentVersion: requiredString(value.content_version, "Published page content version"),
    parentId: optionalString(value.parent_source_page_id) ?? null,
    title: requiredString(value.title, "Published page title"),
    slug: requiredString(value.slug, "Published page slug"),
    status: "published",
    lastEditedTime: requiredString(value.last_edited_time, "Published page edited time"),
    lastPublishedAt: requiredString(value.last_published_at, "Published page publication time"),
    metadata: {
      school: "ncu",
      campus: stringArray(metadata.campus),
      audiences: stringArray(metadata.audiences),
      topics: stringArray(metadata.topics),
      sourceUrls: stringArray(value.source_urls ?? metadata.sourceUrls),
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
    updatedAt: requiredString(value.created_at ?? value.updated_at ?? new Date().toISOString(), "Published search updated time"),
  };
}

function firstPlainText(blocks: Block[]): string {
  for (const block of blocks) {
    if ("richText" in block) return block.richText.map((item) => item.plainText).join("");
  }
  return "";
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
  return (
    value === "paragraph" ||
    value === "heading" ||
    value === "quote" ||
    value === "callout" ||
    value === "table" ||
    value === "page-link"
  );
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
      status: row.status === "failed" ? "failed" : row.status === "pending" || row.status === "staging" ? "pending" : "published",
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
