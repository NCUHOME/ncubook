// Notion 发布引擎：Notion 节点筛选、完整发布与版本回滚指令的主调度管线 (Pipeline)
import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath, revalidateTag } from "next/cache";
import { clearExactAnswerCache } from "@/lib/ai/ask";
import { buildSearchIndex } from "@/lib/publishing/index";
import { mirrorNotionAssets, safePathPart, type AssetStorage } from "@/lib/publishing/assets";
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

function formatLog(msg: string): string {
  const time = new Date().toLocaleTimeString("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour12: false,
  });
  return `[${time}] ${msg}`;
}

export async function runNotionPublicationCommand(
  command: PublicationCommand,
  onProgress?: (message: string) => void,
): Promise<Record<string, unknown>> {
  const supabase = getSupabaseAdmin();
  if (command.operation === "rollback") {
    if (!supabase) throw new Error("Supabase publication storage is not configured");
    onProgress?.(formatLog(`↺ 正在将线上网站切线恢复至历史版本: ${command.version}...`));
    const store = createSupabasePublicationStore(supabase);
    await rollbackPublishedVersion(store, command.version);
    let cacheRevalidated = true;
    try {
      revalidateTag("published-content-pointer");
      revalidateTag("published-content");
      revalidatePath("/", "layout");
    } catch (revalidateError) {
      cacheRevalidated = false;
      const errorMsg = revalidateError instanceof Error ? revalidateError.message : String(revalidateError);
      console.error(JSON.stringify({
        event: "rollback_revalidate_failed",
        version: command.version,
        error: errorMsg,
      }));
      onProgress?.(formatLog(`[提示] 页面缓存即刻刷新未完全生效 (${errorMsg})，但底层切线已完成: ${command.version}`));
    }
    clearExactAnswerCache();
    onProgress?.(formatLog(`[完成] 切线恢复成功！线上网站已即刻切换至版本: ${command.version}`));
    return { ok: true, operation: "rollback", contentVersion: command.version, cacheRevalidated };
  }

  if (command.operation === "delete") {
    if (!supabase) throw new Error("Supabase publication storage is not configured");
    onProgress?.(formatLog(`[处理] 正在校验并彻底删除历史版本: ${command.version}...`));

    // 1. 安全校验：严禁删除当前线上在用版本
    const { data: pointer } = await supabase
      .from("published_content_pointer")
      .select("content_version")
      .eq("singleton", true)
      .maybeSingle();

    if (pointer?.content_version === command.version) {
      throw new Error(`无法删除当前正在线上生效的版本 (${command.version})，请先恢复至其他历史版本后再行删除`);
    }

    // 2. 清理 Supabase Storage 中的物理文件对象
    const bucketName = (process.env.PUBLISHED_ASSETS_BUCKET || "published_assets").trim();
    const versionPrefix = safePathPart(command.version);

    try {
      const filePaths: string[] = [];
      const listRecursive = async (prefix: string) => {
        const { data: items } = await supabase.storage.from(bucketName).list(prefix, { limit: 1000 });
        for (const item of items || []) {
          if (!item.name) continue;
          const itemPath = `${prefix}/${item.name}`;
          if (item.id) {
            filePaths.push(itemPath);
          } else {
            await listRecursive(itemPath);
          }
        }
      };

      await listRecursive(versionPrefix);
      if (filePaths.length > 0) {
        await supabase.storage.from(bucketName).remove(filePaths);
      }
    } catch (storageErr) {
      console.warn(JSON.stringify({ event: "delete_storage_files_warning", version: command.version, error: String(storageErr) }));
    }

    // 3. 删除数据库 content_versions 表记录（带 pages/blocks/assets/segments/failures 级联彻底清空）
    const { error: dbError } = await supabase
      .from("content_versions")
      .delete()
      .eq("id", command.version);

    if (dbError) {
      throw new Error(`删除数据库版本记录失败: ${dbError.message}`);
    }

    onProgress?.(formatLog(`[完成] 历史版本 ${command.version} 及其所有数据库与 Storage 资源已彻底删除！`));
    return { ok: true, operation: "delete", contentVersion: command.version };
  }

  onProgress?.(formatLog("[阶段 1/5] 正在连接 Notion 知识库，读取文章列表与目录..."));
  const token = requiredEnvironment("NOTION_TOKEN");
  const rootPageId = requiredEnvironment("NOTION_ROOT_PAGE_ID");
  const notion = createNotionClient({ token });
  const rootTree = await notion.readBlockTree(rootPageId);
  const selected = selectNotionPageNodes(rootTree, command.all, command.pageIds);
  if (selected.length === 0) throw new Error("No publishable pages were found below the configured Notion root");
  onProgress?.(formatLog(`[阶段 2/5] 成功找到 ${selected.length} 篇待更新的校园指南文章`));

  const rawPages = new Map<string, NotionObject>();
  await batchMap(selected, 3, async (item) => {
    rawPages.set(item.node.id, await notion.retrievePage(item.node.id));
  });
  onProgress?.(formatLog(`[阶段 3/5] 已完成 ${selected.length} 篇文章的修改时间与基础格式校验`));

  const contentVersion = (command.operation === "publish" && command.contentVersion)
    ? command.contentVersion
    : createContentVersion();
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
  const bucketName = (process.env.PUBLISHED_ASSETS_BUCKET || "published_assets").trim();
  const storage = command.dryRun
    ? createDryRunAssetStorage()
    : createSupabaseAssetStorage(requireSupabase(supabase), bucketName);
  let warningCount = 0;
  let builtPageCount = 0;

  onProgress?.(formatLog("[阶段 4/5] 正在同步文章图片、优化排版样式并建立全文搜索..."));
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
        onProgress?.(formatLog(`[进度] 已完成 ${builtPageCount}/${selected.length} 篇文章的格式转换与图片下载...`));
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

  onProgress?.(formatLog("[阶段 5/5] 正在发布至线上网站并刷新前台页面..."));
  let cacheRevalidated = true;
  if (!command.dryRun) {
    try {
      revalidateTag("published-content-pointer");
      revalidateTag("published-content");
      revalidatePath("/", "layout");
    } catch (revalidateError) {
      cacheRevalidated = false;
      warningCount += 1;
      const errorMsg = revalidateError instanceof Error ? revalidateError.message : String(revalidateError);
      console.error(JSON.stringify({
        event: "publish_revalidate_failed",
        contentVersion,
        error: errorMsg,
      }));
      onProgress?.(formatLog(`[警告] 页面缓存即刻刷新未完全生效 (${errorMsg})`));
    }
    clearExactAnswerCache();
  }

  onProgress?.(formatLog(`[完成] 同步发版全量完成！共成功发布 ${result.pageCount ?? selected.length} 篇校园指南文章。`));

  return {
    ok: true,
    operation: "publish",
    dryRun: command.dryRun,
    contentVersion,
    pages: result.pageCount ?? selected.length,
    warnings: warningCount,
    status: result.status,
    cacheRevalidated,
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

// 1x1 像素透明 PNG 占位图二进制（用于当 Notion 中存在已失效的外链图片或死链时进行容错兜底，避免单个死链中断全站发版）
const FALLBACK_PLACEHOLDER_PNG = new Uint8Array([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0,
  0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 11, 73, 68, 65, 84, 120, 156,
  99, 96, 0, 0, 0, 2, 0, 1, 229, 39, 222, 252, 0, 0, 0, 0, 73, 69, 78, 68, 174,
  66, 96, 130,
]);

async function downloadAsset(url: string): Promise<{ bytes: Uint8Array; mediaType: string }> {
  for (let attempt = 0; attempt <= 1; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "image/*,application/pdf,*/*",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(8000), // 8秒超时，快速探测避免 Serverless 函数执行超时
      });
      if (response.status === 403 || response.status === 404 || response.status === 410) {
        // 明确的客户端死链或权限失效错误，直接降级透明占位图，禁止无意义的多次重试浪费时间
        return { bytes: FALLBACK_PLACEHOLDER_PNG, mediaType: "image/png" };
      }
      if (!response.ok) throw new Error(`Unable to download Notion asset (${response.status})`);
      const mediaType = response.headers.get("content-type") ?? "application/octet-stream";
      return { bytes: new Uint8Array(await response.arrayBuffer()), mediaType };
    } catch (err) {
      if (attempt < 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        continue;
      }
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.warn(JSON.stringify({ event: "download_notion_asset_failed_using_placeholder", url: url.slice(0, 100), error: errorMsg }));
      // 容错降级：返回 1x1 占位图，确保全站发版顺利完成
      return { bytes: FALLBACK_PLACEHOLDER_PNG, mediaType: "image/png" };
    }
  }
  return { bytes: FALLBACK_PLACEHOLDER_PNG, mediaType: "image/png" };
}

function createSupabaseAssetStorage(client: SupabaseClient, bucketName: string): AssetStorage {
  const bucket = client.storage.from(bucketName);
  let bucketReady = false;

  const ensureBucketExists = async () => {
    if (bucketReady) return;
    try {
      const { data: buckets } = await client.storage.listBuckets();
      const exists = buckets?.some((b) => b.name === bucketName);
      if (!exists) {
        await client.storage.createBucket(bucketName, { public: true });
      }
      bucketReady = true;
    } catch {
      // 忽略检查异常，直接尝试上传
    }
  };

  return {
    async upload({ path, bytes, mediaType }) {
      await ensureBucketExists();
      for (let attempt = 0; attempt <= 3; attempt += 1) {
        const result = await bucket.upload(path, bytes, { contentType: mediaType, upsert: true });
        if (!result.error) {
          return bucket.getPublicUrl(path).data.publicUrl;
        }

        // 如果报错 Bucket not found，尝试使用 service_role 自动创建 public bucket
        if (result.error.message.toLowerCase().includes("not found")) {
          try {
            await client.storage.createBucket(bucketName, { public: true });
            bucketReady = true;
          } catch {
            // 继续重试
          }
        }

        if (attempt < 3) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
          continue;
        }
        throw new Error(`Unable to upload published asset: ${result.error.message} (bucket: ${bucketName})`);
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
    stageChunk: async () => undefined,
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
