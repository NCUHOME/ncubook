import { createHash } from "node:crypto";
import type { Asset, Block, Page, SearchIndexEntry } from "@/lib/content/published-schema";

export type PagePublication = {
  page: Page;
  blocks: Block[];
  assets: Asset[];
  searchEntries: SearchIndexEntry[];
};

export type PublicationFailure = {
  contentVersion: string;
  sourcePageId?: string;
  sourceBlockId?: string;
  stage: "build" | "stale-check" | "validate" | "commit";
  reason: string;
};

export type PublicationCommit = {
  contentVersion: string;
  sourceRootId: string;
  checksum: string;
  expectedCurrentVersion: string | null;
  pages: PagePublication[];
};

export type PublicationStore = {
  getVersionStatus(contentVersion: string): Promise<"pending" | "published" | "failed" | null>;
  getCurrentVersion(): Promise<string | null>;
  startVersion(input: { contentVersion: string; sourceRootId: string }): Promise<void>;
  findPublishedVersionByChecksum(checksum: string): Promise<string | null>;
  commitVersion(input: PublicationCommit): Promise<void>;
  failVersion(failure: PublicationFailure): Promise<void>;
  movePointer(targetVersion: string, expectedCurrentVersion: string | null): Promise<void>;
};

type PublishVersionInput = {
  contentVersion: string;
  sourceRootId: string;
  sourcePageIds: string[];
  store: PublicationStore;
  buildPage(sourcePageId: string, contentVersion: string): Promise<PagePublication>;
  readLastEditedTime(sourcePageId: string): Promise<string>;
};

export type PublishVersionResult = {
  status: "published" | "already-published";
  contentVersion: string;
  checksum?: string;
  pageCount?: number;
};

export class PointerConflictError extends Error {
  constructor(
    public readonly expectedVersion: string | null,
    public readonly actualVersion: string | null,
  ) {
    super(`Published content pointer changed from ${expectedVersion ?? "empty"} to ${actualVersion ?? "empty"}`);
    this.name = "PointerConflictError";
  }
}

export async function publishVersion(input: PublishVersionInput): Promise<PublishVersionResult> {
  requireValue(input.contentVersion, "Content version");
  requireValue(input.sourceRootId, "Source root id");
  if (new Set(input.sourcePageIds).size !== input.sourcePageIds.length) {
    throw new Error("Source page ids must be unique");
  }

  if (await input.store.getVersionStatus(input.contentVersion) === "published") {
    return { status: "already-published", contentVersion: input.contentVersion };
  }

  const expectedCurrentVersion = await input.store.getCurrentVersion();
  await input.store.startVersion({ contentVersion: input.contentVersion, sourceRootId: input.sourceRootId });

  const pages: PagePublication[] = [];
  let sourcePageId: string | undefined;
  let stage: PublicationFailure["stage"] = "build";

  try {
    for (sourcePageId of input.sourcePageIds) {
      stage = "build";
      const result = await input.buildPage(sourcePageId, input.contentVersion);
      pages.push(result);

      stage = "stale-check";
      const latestEditedTime = await input.readLastEditedTime(sourcePageId);
      if (latestEditedTime !== result.page.lastEditedTime) {
        throw new Error(`Notion page ${sourcePageId} changed during publication`);
      }
    }

    sourcePageId = undefined;
    stage = "validate";
    validatePublication(input.contentVersion, input.sourceRootId, pages);
    const checksum = publicationChecksum(pages);

    const duplicateVersion = await input.store.findPublishedVersionByChecksum(checksum);
    if (duplicateVersion === input.contentVersion) {
      return { status: "already-published", contentVersion: input.contentVersion, checksum, pageCount: pages.length };
    }

    stage = "commit";
    await input.store.commitVersion({
      contentVersion: input.contentVersion,
      sourceRootId: input.sourceRootId,
      checksum,
      expectedCurrentVersion,
      pages,
    });
    return { status: "published", contentVersion: input.contentVersion, checksum, pageCount: pages.length };
  } catch (error) {
    const failure: PublicationFailure = {
      contentVersion: input.contentVersion,
      ...(sourcePageId ? { sourcePageId } : {}),
      ...sourceBlockId(error),
      stage,
      reason: errorMessage(error),
    };
    try {
      await input.store.failVersion(failure);
    } catch {
      // The original publication error is the actionable failure and must not be replaced.
    }
    throw error;
  }
}

export async function rollbackPublishedVersion(store: PublicationStore, targetVersion: string): Promise<void> {
  if (await store.getVersionStatus(targetVersion) !== "published") {
    throw new Error(`Content version ${targetVersion} is not published`);
  }
  const currentVersion = await store.getCurrentVersion();
  if (currentVersion === targetVersion) return;
  await store.movePointer(targetVersion, currentVersion);
}

function validatePublication(contentVersion: string, sourceRootId: string, pages: PagePublication[]): void {
  if (pages.length === 0) throw new Error("Publication must contain at least one page");
  const pageIds = new Set(pages.map(({ page }) => page.id));
  if (pageIds.size !== pages.length) throw new Error("Publication contains duplicate pages");

  for (const bundle of pages) {
    const { page, blocks, assets, searchEntries } = bundle;
    if (page.contentVersion !== contentVersion) throw new Error(`Page ${page.id} belongs to another content version`);
    if (page.parentId && page.parentId !== sourceRootId && !pageIds.has(page.parentId)) {
      throw new Error(`Page ${page.id} references missing parent page ${page.parentId}`);
    }

    const anchors = collectAnchors(blocks);
    const assetIds = new Set(assets.map((asset) => asset.id));
    if (assetIds.size !== assets.length) throw new Error(`Page ${page.id} contains duplicate assets`);

    walkBlocks(blocks, (block) => {
      if (block.type === "page-link" && !pageIds.has(block.pageId)) {
        throw new Error(`Block ${block.id} references missing page ${block.pageId}`);
      }
      if ((block.type === "image" || block.type === "file") && !assetIds.has(block.assetId)) {
        throw new Error(`Block ${block.id} references missing asset ${block.assetId}`);
      }
    });

    for (const asset of assets) {
      if (asset.contentVersion !== contentVersion) throw new Error(`Asset ${asset.id} belongs to another content version`);
    }
    for (const entry of searchEntries) {
      if (entry.contentVersion !== contentVersion || entry.pageId !== page.id) {
        throw new Error(`Search entry ${entry.id} belongs to another page or content version`);
      }
      if (!anchors.has(entry.anchor)) throw new Error(`Search entry ${entry.id} references missing anchor ${entry.anchor}`);
    }
  }
}

function collectAnchors(blocks: Block[]): Set<string> {
  const anchors = new Set<string>();
  walkBlocks(blocks, (block) => {
    anchors.add(block.anchor);
    if (block.type === "table") for (const row of block.rows) anchors.add(anchorFromSourceId(row.id));
    if (block.type === "bulleted-list" || block.type === "numbered-list") {
      for (const item of block.items) anchors.add(anchorFromSourceId(item.id));
    }
  });
  return anchors;
}

function walkBlocks(blocks: Block[], visit: (block: Block) => void): void {
  for (const block of blocks) {
    visit(block);
    if (block.type === "columns") {
      for (const column of block.columns) walkBlocks(column.blocks, visit);
    }
    if (block.type === "bulleted-list" || block.type === "numbered-list") {
      for (const item of block.items) walkBlocks(item.children, visit);
    }
    if (block.type === "callout") walkBlocks(block.children, visit);
  }
}

function publicationChecksum(pages: PagePublication[]): string {
  const stablePages = [...pages]
    .sort((left, right) => left.page.id.localeCompare(right.page.id))
    .map((bundle) => ({
      page: bundle.page,
      blocks: bundle.blocks,
      assets: [...bundle.assets].sort((left, right) => left.id.localeCompare(right.id)),
      searchEntries: [...bundle.searchEntries].sort((left, right) => left.id.localeCompare(right.id)),
    }));
  return createHash("sha256").update(JSON.stringify(stablePages)).digest("hex");
}

function sourceBlockId(error: unknown): { sourceBlockId?: string } {
  if (typeof error !== "object" || error === null || !("blockId" in error)) return {};
  const blockId = error.blockId;
  return typeof blockId === "string" ? { sourceBlockId: blockId } : {};
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function anchorFromSourceId(sourceId: string): string {
  return `b-${sourceId}`;
}

function requireValue(value: string, label: string): void {
  if (!value.trim()) throw new Error(`${label} is required`);
}
