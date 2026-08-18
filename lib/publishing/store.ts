// Notion 发布引擎：Supabase 发布存储事务接入层 (M-5 分块暂存与短事务切线)
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/database.types";
import type { ChunkPublication, PublicationStore } from "@/lib/publishing/version";
import { assertServerOnly } from "@/lib/integrations/server-only";

assertServerOnly("Supabase Publication Store");

export function createSupabasePublicationStore(client: SupabaseClient<Database>): PublicationStore {
  return {
    async getVersionStatus(contentVersion) {
      const result = await client.from("content_versions").select("status").eq("id", contentVersion).maybeSingle();
      assertNoError(result.error, "read content version");
      const status = asRecord(result.data).status;
      return status === "pending" || status === "staging" || status === "published" || status === "failed" ? status : null;
    },
    async getCurrentVersion() {
      const result = await client.from("published_content_pointer").select("content_version").eq("singleton", true).maybeSingle();
      assertNoError(result.error, "read published pointer");
      const version = asRecord(result.data).content_version;
      return typeof version === "string" ? version : null;
    },
    async startVersion({ contentVersion, sourceRootId }) {
      const result = await client.from("content_versions").insert({
        id: contentVersion,
        schema_version: 2,
        source_root_id: sourceRootId,
        status: "pending",
      });
      assertNoError(result.error, "start content version");
    },
    async findPublishedVersionByChecksum(checksum) {
      const result = await client.from("content_versions").select("id").eq("status", "published").eq("checksum", checksum).maybeSingle();
      assertNoError(result.error, "find published checksum");
      const id = asRecord(result.data).id;
      return typeof id === "string" ? id : null;
    },
    async stageChunk(contentVersion, chunk) {
      const serialized = serializePublicationChunk(chunk);
      const result = await client.rpc("stage_published_chunk", {
        p_content_version: contentVersion,
        p_pages: serialized.pages as unknown as Json,
        p_blocks: serialized.blocks as unknown as Json,
        p_assets: serialized.assets as unknown as Json,
        p_segments: serialized.segments as unknown as Json,
      });
      assertNoError(result.error, "stage published chunk");
    },
    async commitVersion(input) {
      const result = await client.rpc("commit_published_content_version", {
        p_content_version: input.contentVersion,
        p_expected_current_version: input.expectedCurrentVersion ?? null,
        p_checksum: input.checksum,
        p_summary: (input.summary ?? {}) as unknown as Json,
      });
      assertNoError(result.error, "commit published content version");
    },
    async failVersion(failure) {
      const result = await client.rpc("fail_published_content_version", {
        p_content_version: failure.contentVersion,
        p_source_page_id: failure.sourcePageId ?? null,
        p_source_block_id: failure.sourceBlockId ?? null,
        p_stage: failure.stage,
        p_reason: failure.reason,
      });
      assertNoError(result.error, "record publication failure");
    },
    async movePointer(targetVersion, expectedCurrentVersion) {
      const result = await client.rpc("rollback_published_content_version", {
        p_target_version: targetVersion,
        p_expected_current_version: expectedCurrentVersion ?? null,
      });
      assertNoError(result.error, "roll back published content version");
    },
  };
}

export function serializePublicationChunk(chunk: ChunkPublication) {
  return {
    pages: chunk.pages.map((page) => ({
      sourcePageId: page.id,
      parentSourcePageId: page.parentId,
      title: page.title,
      slug: page.slug,
      routePath: page.parentId ? `/docs/${page.slug}` : `/sections/${page.slug}`,
      treePath: [],
      school: "ncu",
      riskLevel: page.metadata.riskLevel,
      sourceUrls: page.metadata.sourceUrls,
      lastEditedTime: page.lastEditedTime,
      lastPublishedAt: page.lastPublishedAt,
      metadata: page.metadata,
    })),
    blocks: chunk.blocks.map((block, ordinal) => ({
      sourcePageId: (block as unknown as { sourcePageId?: string }).sourcePageId ?? (chunk.pages[0]?.id ?? ""),
      sourceBlockId: block.id,
      anchor: block.anchor,
      ordinal,
      blockType: block.type,
      block,
    })),
    assets: chunk.assets.map((asset) => ({
      sourcePageId: (asset as unknown as { sourcePageId?: string }).sourcePageId ?? (chunk.pages[0]?.id ?? ""),
      sourceBlockId: asset.sourceBlockId,
      assetId: asset.id,
      kind: asset.kind,
      publicUrl: asset.publicUrl,
      checksum: asset.checksum,
      alt: asset.alt ?? null,
    })),
    segments: chunk.searchEntries.map((entry) => ({
      sourcePageId: entry.pageId,
      sourceBlockId: sourceIdFromAnchor(entry.anchor),
      pageTitle: entry.pageTitle,
      sectionPath: entry.sectionPath,
      anchor: entry.anchor,
      plainText: entry.plainText,
      blockType: entry.blockType,
    })),
  };
}

function sourceIdFromAnchor(anchor: string): string {
  return anchor.replace(/^b-/, "");
}

function assertNoError(error: { message: string } | null, operation: string) {
  if (error) throw new Error(`Failed to ${operation}: ${error.message}`);
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
