import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidateTag } from "next/cache";
import { buildSearchIndex } from "@/lib/publishing/build-search-index";
import { mirrorNotionAssets, type AssetStorage } from "@/lib/publishing/mirror-assets";
import { createNotionClient, type NotionBlockNode, type NotionObject } from "@/lib/publishing/notion-client";
import { normalizeNotionBlocks } from "@/lib/publishing/normalize-blocks";
import { normalizeNotionPage } from "@/lib/publishing/normalize-page";
import { publishVersion, rollbackPublishedVersion, type PublicationStore } from "@/lib/publishing/publish-version";
import type { PublicationCommand } from "@/lib/publishing/publish-route";
import { createSupabasePublicationStore } from "@/lib/publishing/supabase-publication-store";
import { getSupabaseAdmin } from "@/lib/db/supabase";

export type SelectedNotionPage = { node: NotionBlockNode; parentPageId: string | null };

export function selectNotionPageNodes(
  tree: NotionBlockNode[],
  all: boolean,
  requestedPageIds: string[],
): SelectedNotionPage[] {
  const discovered: SelectedNotionPage[] = [];

  const visit = (nodes: NotionBlockNode[], parentPageId: string | null) => {
    for (const node of nodes) {
      const isPage = node.type === "child_page";
      if (isPage) discovered.push({ node, parentPageId });
      visit(node.children, isPage ? node.id : parentPageId);
    }
  };
  visit(tree, null);

  if (all) return discovered;
  const byId = new Map(discovered.map((item) => [item.node.id, item]));
  for (const pageId of requestedPageIds) {
    if (!byId.has(pageId)) throw new Error(`Requested page ${pageId} is outside the configured Notion root`);
  }

  const selectedIds = new Set(requestedPageIds);
  for (const pageId of requestedPageIds) {
    let current = byId.get(pageId);
    while (current?.parentPageId) {
      selectedIds.add(current.parentPageId);
      current = byId.get(current.parentPageId);
    }
  }
  return discovered.filter((item) => selectedIds.has(item.node.id));
}

export function stableSlugForNotionPage(page: NotionObject): string {
  const properties = asRecord(page.properties);
  for (const [name, propertyValue] of Object.entries(properties)) {
    if (name.toLocaleLowerCase("en-US") !== "slug") continue;
    const property = asRecord(propertyValue);
    if (property.type !== "rich_text" || !Array.isArray(property.rich_text)) continue;
    const slug = property.rich_text.map((item) => optionalString(asRecord(item).plain_text) ?? "").join("").trim();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error(`Notion page ${page.id} has an invalid slug`);
    return slug;
  }
  const compactId = page.id.replace(/[^a-zA-Z0-9]/g, "").toLocaleLowerCase("en-US");
  return `page-${compactId.slice(0, 16) || "unknown"}`;
}

export async function runNotionPublicationCommand(command: PublicationCommand): Promise<Record<string, unknown>> {
  const supabase = getSupabaseAdmin();
  if (command.operation === "rollback") {
    if (!supabase) throw new Error("Supabase publication storage is not configured");
    const store = createSupabasePublicationStore(supabase);
    await rollbackPublishedVersion(store, command.version);
    return { ok: true, operation: "rollback", contentVersion: command.version };
  }

  const token = requiredEnvironment("NOTION_TOKEN");
  const rootPageId = requiredEnvironment("NOTION_ROOT_PAGE_ID");
  const notion = createNotionClient({ token });
  const rootTree = await notion.readBlockTree(rootPageId);
  const selected = selectNotionPageNodes(rootTree, command.all, command.pageIds);
  if (selected.length === 0) throw new Error("No publishable pages were found below the configured Notion root");

  const rawPages = new Map<string, NotionObject>();
  for (const item of selected) rawPages.set(item.node.id, await notion.retrievePage(item.node.id));

  const contentVersion = createContentVersion();
  const publishedAt = new Date().toISOString();
  const normalizedPages = new Map(selected.map((item) => {
    const rawPage = requireMapValue(rawPages, item.node.id);
    const normalized = normalizeNotionPage(rawPage, {
      contentVersion,
      slug: stableSlugForNotionPage(rawPage),
      lastPublishedAt: publishedAt,
      metadata: { sourceUrls: optionalString(rawPage.url) ? [String(rawPage.url)] : [] },
    });
    return [item.node.id, { ...normalized, parentId: item.parentPageId }] as const;
  }));

  const store = command.dryRun
    ? createDryRunStore()
    : createConfiguredStore(supabase);
  const storage = command.dryRun
    ? createDryRunAssetStorage()
    : createSupabaseAssetStorage(requireSupabase(supabase), requiredEnvironment("PUBLISHED_ASSETS_BUCKET"));
  let warningCount = 0;

  const result = await publishVersion({
    contentVersion,
    sourceRootId: rootPageId,
    sourcePageIds: selected.map((item) => item.node.id),
    store,
    async buildPage(sourcePageId) {
      const selectedPage = selected.find((item) => item.node.id === sourcePageId);
      if (!selectedPage) throw new Error(`Unable to find selected Notion page ${sourcePageId}`);
      const page = requireMapValue(normalizedPages, sourcePageId);
      const blocks = normalizeNotionBlocks(selectedPage.node.children, {
        onWarning: () => { warningCount += 1; },
      });
      const mirrored = await mirrorNotionAssets(selectedPage.node.children, {
        contentVersion,
        pageId: sourcePageId,
        download: downloadAsset,
        storage,
      });
      warningCount += mirrored.warnings.length;
      return {
        page,
        blocks,
        assets: mirrored.assets,
        searchEntries: buildSearchIndex(page, blocks, ancestorTitles(page.parentId, normalizedPages)),
      };
    },
    async readLastEditedTime(sourcePageId) {
      const latest = await notion.retrievePage(sourcePageId);
      return requiredString(latest.last_edited_time, `Notion page ${sourcePageId} last edited time`);
    },
  });

  if (!command.dryRun) {
    revalidateTag("published-content-pointer");
  }

  return {
    ok: true,
    operation: "publish",
    dryRun: command.dryRun,
    contentVersion,
    pages: result.pageCount ?? selected.length,
    warnings: warningCount,
    status: result.status,
  };
}

function ancestorTitles(pageId: string | null, pages: Map<string, ReturnType<typeof normalizeNotionPage>>): string[] {
  const titles: string[] = [];
  const seen = new Set<string>();
  let currentId = pageId;
  while (currentId) {
    if (seen.has(currentId)) throw new Error(`Notion page hierarchy contains a cycle at ${currentId}`);
    seen.add(currentId);
    const page = pages.get(currentId);
    if (!page) break;
    titles.unshift(page.title);
    currentId = page.parentId;
  }
  return titles;
}

async function downloadAsset(url: string): Promise<{ bytes: Uint8Array; mediaType: string }> {
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) throw new Error(`Unable to download Notion asset (${response.status})`);
  const mediaType = response.headers.get("content-type") ?? "application/octet-stream";
  return { bytes: new Uint8Array(await response.arrayBuffer()), mediaType };
}

function createSupabaseAssetStorage(client: SupabaseClient, bucketName: string): AssetStorage {
  const bucket = client.storage.from(bucketName);
  return {
    async upload({ path, bytes, mediaType }) {
      const result = await bucket.upload(path, bytes, { contentType: mediaType, upsert: false });
      if (result.error) throw new Error(`Unable to upload published asset: ${result.error.message}`);
      return bucket.getPublicUrl(path).data.publicUrl;
    },
  };
}

function createDryRunAssetStorage(): AssetStorage {
  return { upload: async ({ path }) => `https://dry-run.invalid/${path}` };
}

function createDryRunStore(): PublicationStore {
  return {
    getVersionStatus: async () => null,
    getCurrentVersion: async () => null,
    startVersion: async () => undefined,
    findPublishedVersionByChecksum: async () => null,
    commitVersion: async () => undefined,
    failVersion: async () => undefined,
    movePointer: async () => undefined,
  };
}

function createConfiguredStore(client: SupabaseClient | null): PublicationStore {
  return createSupabasePublicationStore(requireSupabase(client));
}

function requireSupabase(client: SupabaseClient | null): SupabaseClient {
  if (!client) throw new Error("Supabase publication storage is not configured");
  return client;
}

function createContentVersion(): string {
  return `content-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 17)}`;
}

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (!value?.trim()) throw new Error(`${name} is required`);
  return value;
}

function requireMapValue<T>(map: Map<string, T>, key: string): T {
  const value = map.get(key);
  if (!value) throw new Error(`Missing publication data for ${key}`);
  return value;
}

function requiredString(value: unknown, label: string): string {
  const result = optionalString(value);
  if (!result) throw new Error(`${label} is required`);
  return result;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}
