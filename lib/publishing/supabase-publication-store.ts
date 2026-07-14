import type { SupabaseClient } from "@supabase/supabase-js";
import type { PublicationCommit, PublicationStore } from "@/lib/publishing/publish-version";

export function createSupabasePublicationStore(client: SupabaseClient): PublicationStore {
  return {
    async getVersionStatus(contentVersion) {
      const result = await client.from("content_versions").select("status").eq("id", contentVersion).maybeSingle();
      assertNoError(result.error, "read content version");
      const status = asRecord(result.data).status;
      return status === "pending" || status === "published" || status === "failed" ? status : null;
    },
    async getCurrentVersion() {
      const result = await client.from("published_content_pointer").select("content_version").eq("singleton", true).maybeSingle();
      assertNoError(result.error, "read published pointer");
      const version = asRecord(result.data).content_version;
      return typeof version === "string" ? version : null;
    },
    async startVersion({ contentVersion, sourceRootId }) {
      const result = await client.from("content_versions").insert({ id: contentVersion, source_root_id: sourceRootId, status: "pending" });
      assertNoError(result.error, "start content version");
    },
    async findPublishedVersionByChecksum(checksum) {
      const result = await client.from("content_versions").select("id").eq("status", "published").eq("checksum", checksum).maybeSingle();
      assertNoError(result.error, "find published checksum");
      const id = asRecord(result.data).id;
      return typeof id === "string" ? id : null;
    },
    async commitVersion(input) {
      const result = await client.rpc("commit_published_content_version", serializePublicationCommit(input));
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
        p_expected_current_version: expectedCurrentVersion,
      });
      assertNoError(result.error, "roll back published content version");
    },
  };
}

export function serializePublicationCommit(input: PublicationCommit) {
  return {
    p_content_version: input.contentVersion,
    p_expected_current_version: input.expectedCurrentVersion,
    p_checksum: input.checksum,
    p_pages: input.pages.map(({ page }) => ({
      sourcePageId: page.id,
      parentSourcePageId: page.parentId,
      title: page.title,
      slug: page.slug,
      lastEditedTime: page.lastEditedTime,
      lastPublishedAt: page.lastPublishedAt,
      metadata: page.metadata,
    })),
    p_blocks: input.pages.flatMap(({ page, blocks }) => blocks.map((block, ordinal) => ({
      sourcePageId: page.id,
      sourceBlockId: block.id,
      anchor: block.anchor,
      ordinal,
      blockType: block.type,
      block,
    }))),
    p_assets: input.pages.flatMap(({ page, assets }) => assets.map((asset) => ({
      sourcePageId: page.id,
      sourceBlockId: asset.sourceBlockId,
      assetId: asset.id,
      kind: asset.kind,
      publicUrl: asset.publicUrl,
      checksum: asset.checksum,
      alt: asset.alt ?? null,
    }))),
    p_search_entries: input.pages.flatMap(({ searchEntries }) => searchEntries.map((entry) => ({
      sourcePageId: entry.pageId,
      sourceBlockId: sourceIdFromAnchor(entry.anchor),
      pageTitle: entry.pageTitle,
      sectionPath: entry.sectionPath,
      anchor: entry.anchor,
      plainText: entry.plainText,
      blockType: entry.blockType,
      updatedAt: entry.updatedAt,
    }))),
  };
}

function sourceIdFromAnchor(anchor: string): string {
  if (!anchor.startsWith("b-") || anchor.length === 2) throw new Error(`Invalid published anchor: ${anchor}`);
  return anchor.slice(2);
}

function assertNoError(error: { message: string } | null, operation: string): void {
  if (error) throw new Error(`Unable to ${operation}: ${error.message}`);
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}
