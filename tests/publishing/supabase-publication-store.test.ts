import { describe, expect, it } from "vitest";
import type { RichText } from "@/lib/content/published-schema";
import type { PublicationCommit } from "@/lib/publishing/publish-version";
import { serializePublicationCommit } from "@/lib/publishing/supabase-publication-store";

const text = (plainText: string): RichText => [{ plainText, annotations: {} }];

describe("Supabase publication transaction payload", () => {
  it("flattens page bundles without losing source IDs, order, or original text", () => {
    const commit: PublicationCommit = {
      contentVersion: "v2",
      sourceRootId: "root",
      checksum: "checksum",
      expectedCurrentVersion: "v1",
      pages: [{
        page: {
          id: "page-one", schemaVersion: 1, contentVersion: "v2", parentId: null, title: "交通", slug: "transport",
          status: "published", lastEditedTime: "2026-07-13T10:00:00.000Z", lastPublishedAt: "2026-07-13T11:00:00.000Z",
          metadata: { school: "ncu", sourceUrls: [], riskLevel: "normal" },
        },
        blocks: [
          { id: "heading", anchor: "b-heading", type: "heading", level: 2, richText: text("路线") },
          { id: "body", anchor: "b-body", type: "paragraph", richText: text("原始正文") },
        ],
        assets: [{ id: "asset-image", sourceBlockId: "image", contentVersion: "v2", kind: "image", publicUrl: "https://assets/image", checksum: "asset-checksum", alt: "路线图" }],
        searchEntries: [{ id: "v2-body", schemaVersion: 1, contentVersion: "v2", pageId: "page-one", pageTitle: "交通", sectionPath: ["校园生活", "路线"], anchor: "b-body", plainText: "原始正文", blockType: "paragraph", updatedAt: "2026-07-13T10:00:00.000Z" }],
      }],
    };

    const payload = serializePublicationCommit(commit);

    expect(payload.p_pages).toEqual([expect.objectContaining({ sourcePageId: "page-one", title: "交通" })]);
    expect(payload.p_blocks).toEqual([
      expect.objectContaining({ sourcePageId: "page-one", sourceBlockId: "heading", ordinal: 0 }),
      expect.objectContaining({ sourcePageId: "page-one", sourceBlockId: "body", ordinal: 1 }),
    ]);
    expect(payload.p_assets).toEqual([expect.objectContaining({ sourcePageId: "page-one", assetId: "asset-image" })]);
    expect(payload.p_search_entries).toEqual([expect.objectContaining({ sourceBlockId: "body", plainText: "原始正文", sectionPath: ["校园生活", "路线"] })]);
  });
});
