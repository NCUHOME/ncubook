// Notion 发布引擎：Notion 节点筛选、完整发布与版本回滚指令的主调度管线 (Pipeline)
import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidateTag } from "next/cache";
import { buildSearchIndex } from "@/lib/publishing/index";
import { mirrorNotionAssets, type AssetStorage } from "@/lib/publishing/assets";
import { createNotionClient, batchMap, type NotionBlockNode, type NotionObject } from "@/lib/publishing/client";
import { normalizeNotionBlocks } from "@/lib/publishing/blocks";
import { normalizeNotionPage } from "@/lib/publishing/page";
import { publishVersion, rollbackPublishedVersion, type PublicationStore } from "@/lib/publishing/version";
import type { PublicationCommand } from "@/lib/publishing/route";
import { createSupabasePublicationStore } from "@/lib/publishing/store";
import { getSupabaseAdmin } from "@/lib/integrations/supabase";

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

export async function runNotionPublicationCommand(
  command: PublicationCommand,
  onProgress?: (message: string) => void,
): Promise<Record<string, unknown>> {
  const supabase = getSupabaseAdmin();
  if (command.operation === "rollback") {
    if (!supabase) throw new Error("Supabase publication storage is not configured");
    onProgress?.(`↺ 正在回滚线上版本指针至 targetVersion: ${command.version}...`);
    const store = createSupabasePublicationStore(supabase);
    await rollbackPublishedVersion(store, command.version);
    onProgress?.(`✅ 版本回滚成功！当前线上生效指针已切换至: ${command.version}`);
    return { ok: true, operation: "rollback", contentVersion: command.version };
  }

  onProgress?.("🔍 [阶段 1/5] 正在检索 Notion 根节点元数据与 Block 结构树...");
  const token = requiredEnvironment("NOTION_TOKEN");
  const rootPageId = requiredEnvironment("NOTION_ROOT_PAGE_ID");
  const notion = createNotionClient({ token });
  const rootTree = await notion.readBlockTree(rootPageId);
  const selected = selectNotionPageNodes(rootTree, command.all, command.pageIds);
  if (selected.length === 0) throw new Error("No publishable pages were found below the configured Notion root");
  onProgress?.(`🌳 [阶段 2/5] 节点检索完成，已选择 ${selected.length} 篇校园文档待发布`);

  const rawPages = new Map<string, NotionObject>();
  await batchMap(selected, 3, async (item) => {
    rawPages.set(item.node.id, await notion.retrievePage(item.node.id));
  });
  onProgress?.(`📄 [阶段 3/5] 已成功获取并验证 ${selected.length} 篇文档的属性与最后修改时间`);

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
  let builtPageCount = 0;

  onProgress?.("🖼️ [阶段 4/5] 正在并发解析富文本 Block、构建全文检索索引并镜像上传图片至 Supabase Storage...");
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
      builtPageCount += 1;
      if (builtPageCount % 5 === 0 || builtPageCount === selected.length) {
        onProgress?.(`⏳ 已完成 ${builtPageCount}/${selected.length} 篇文档的富文本构建与媒体镜像处理...`);
      }
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

  onProgress?.("💾 [阶段 5/5] 正在执行 Supabase 数据库 RPC 原子事务提交与版本指针切换...");
  if (!command.dryRun) {
    try {
      revalidateTag("published-content-pointer");
    } catch {
      // 在 CLI 直连模式下缺失 Next.js Request Context 时忽略 revalidateTag 错误
    }
  }

  onProgress?.(`🎉 发发版全量完成！新版本号: ${contentVersion} (总计 ${result.pageCount ?? selected.length} 篇文档，${warningCount} 个提示告警)`);

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
  for (let attempt = 0; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, { redirect: "follow" });
      if (!response.ok) throw new Error(`Unable to download Notion asset (${response.status})`);
      const mediaType = response.headers.get("content-type") ?? "application/octet-stream";
      return { bytes: new Uint8Array(await response.arrayBuffer()), mediaType };
    } catch (err) {
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Unable to download Notion asset after retries");
}

function createSupabaseAssetStorage(client: SupabaseClient, bucketName: string): AssetStorage {
  const bucket = client.storage.from(bucketName);
  return {
    async upload({ path, bytes, mediaType }) {
      for (let attempt = 0; attempt <= 3; attempt += 1) {
        const result = await bucket.upload(path, bytes, { contentType: mediaType, upsert: true });
        if (!result.error) {
          return bucket.getPublicUrl(path).data.publicUrl;
        }
        if (attempt < 3) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
          continue;
        }
        throw new Error(`Unable to upload published asset: ${result.error.message}`);
      }
      throw new Error("Unable to upload published asset after retries");
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
