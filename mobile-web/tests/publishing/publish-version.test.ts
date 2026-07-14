import { describe, expect, it, vi } from "vitest";
import type { Asset, Block, Page, RichText, SearchIndexEntry } from "@/lib/content/published-schema";
import {
  PointerConflictError,
  publishVersion,
  rollbackPublishedVersion,
  type PagePublication,
  type PublicationFailure,
  type PublicationStore,
} from "@/lib/publishing/publish-version";
import { AssetMirrorError } from "@/lib/publishing/mirror-assets";

function text(value: string): RichText {
  return [{ plainText: value, annotations: {} }];
}

function page(id: string, parentId: string | null = null, edited = "2026-07-13T10:00:00.000Z"): Page {
  return {
    id, schemaVersion: 1, contentVersion: "v2", parentId, title: id, slug: id, status: "published",
    lastEditedTime: edited, lastPublishedAt: "2026-07-13T12:00:00.000Z",
    metadata: { school: "ncu", sourceUrls: [], riskLevel: "normal" },
  };
}

function publication(id: string, parentId: string | null = null): PagePublication {
  const sourcePage = page(id, parentId);
  const blocks: Block[] = [{ id: `${id}-body`, anchor: `b-${id}-body`, type: "paragraph", richText: text("原文") }];
  const searchEntries: SearchIndexEntry[] = [{
    id: `v2-${id}-body`, schemaVersion: 1, contentVersion: "v2", pageId: id, pageTitle: id,
    sectionPath: [], anchor: `b-${id}-body`, plainText: "原文", blockType: "paragraph", updatedAt: sourcePage.lastEditedTime,
  }];
  return { page: sourcePage, blocks, assets: [], searchEntries };
}

function memoryStore(current: string | null = "v1") {
  const failures: PublicationFailure[] = [];
  const published = new Set(current ? [current] : []);
  let pointer = current;
  const commits: string[] = [];
  const store: PublicationStore = {
    getVersionStatus: vi.fn(async (id) => published.has(id) ? "published" : null),
    getCurrentVersion: vi.fn(async () => pointer),
    startVersion: vi.fn(async () => undefined),
    findPublishedVersionByChecksum: vi.fn(async () => null),
    commitVersion: vi.fn(async (input) => {
      if (pointer !== input.expectedCurrentVersion) throw new PointerConflictError(input.expectedCurrentVersion, pointer);
      commits.push(input.contentVersion);
      published.add(input.contentVersion);
      pointer = input.contentVersion;
    }),
    failVersion: vi.fn(async (failure) => { failures.push(failure); }),
    movePointer: vi.fn(async (target, expected) => {
      if (!published.has(target)) throw new Error("Target version is not published");
      if (pointer !== expected) throw new PointerConflictError(expected, pointer);
      pointer = target;
    }),
  };
  return { store, failures, commits, current: () => pointer, published };
}

const baseInput = (store: PublicationStore) => ({
  contentVersion: "v2",
  sourceRootId: "root",
  sourcePageIds: ["section", "article"],
  store,
  buildPage: async (id: string) => publication(id, id === "article" ? "section" : null),
  readLastEditedTime: async (_id: string) => "2026-07-13T10:00:00.000Z",
});

describe("atomic content publication", () => {
  it("promotes a complete validated version in one store commit", async () => {
    const state = memoryStore();

    const result = await publishVersion(baseInput(state.store));

    expect(result.status).toBe("published");
    expect(state.commits).toEqual(["v2"]);
    expect(state.current()).toBe("v2");
    expect(state.store.commitVersion).toHaveBeenCalledWith(expect.objectContaining({ expectedCurrentVersion: "v1", pages: expect.arrayContaining([expect.objectContaining({ page: expect.objectContaining({ id: "article" }) })]) }));
  });

  it("records a page failure and leaves both an existing and empty pointer unchanged", async () => {
    for (const initialPointer of ["v1", null]) {
      const state = memoryStore(initialPointer);
      const input = baseInput(state.store);
      input.buildPage = async (id) => {
        if (id === "article") throw new Error("unsupported block");
        return publication(id);
      };

      await expect(publishVersion(input)).rejects.toThrow("unsupported block");
      expect(state.current()).toBe(initialPointer);
      expect(state.commits).toEqual([]);
      expect(state.failures).toContainEqual(expect.objectContaining({ contentVersion: "v2", sourcePageId: "article", stage: "build", reason: "unsupported block" }));
    }
  });

  it("records the source block when asset mirroring fails", async () => {
    const state = memoryStore();
    const input = baseInput(state.store);
    input.buildPage = async (id) => {
      if (id === "article") throw new AssetMirrorError("image-one", "unsupported-media-type");
      return publication(id);
    };

    await expect(publishVersion(input)).rejects.toThrow("unsupported-media-type");
    expect(state.failures[0]).toMatchObject({ sourcePageId: "article", sourceBlockId: "image-one", stage: "build" });
    expect(state.current()).toBe("v1");
  });

  it("rejects a page edited during publication before committing", async () => {
    const state = memoryStore();
    const input = baseInput(state.store);
    input.readLastEditedTime = async (id) => id === "article" ? "2026-07-13T11:00:00.000Z" : "2026-07-13T10:00:00.000Z";

    await expect(publishVersion(input)).rejects.toThrow("changed during publication");
    expect(state.current()).toBe("v1");
    expect(state.commits).toEqual([]);
  });

  it("is idempotent when the requested version is already published", async () => {
    const state = memoryStore("v2");
    const input = baseInput(state.store);
    input.buildPage = vi.fn(async (id) => publication(id));

    const result = await publishVersion(input);

    expect(result).toMatchObject({ status: "already-published", contentVersion: "v2" });
    expect(input.buildPage).not.toHaveBeenCalled();
    expect(state.commits).toEqual([]);
  });

  it("does not promote invalid internal links or search anchors", async () => {
    const state = memoryStore();
    const input = baseInput(state.store);
    input.buildPage = async (id) => {
      const value = publication(id, id === "article" ? "section" : null);
      if (id === "article") value.blocks.push({ id: "bad-link", anchor: "b-bad-link", type: "page-link", pageId: "missing", richText: text("缺失页面") });
      return value;
    };

    await expect(publishVersion(input)).rejects.toThrow("missing page");
    expect(state.commits).toEqual([]);
  });

  it("rejects asset ids duplicated across pages before committing", async () => {
    const state = memoryStore();
    const input = baseInput(state.store);
    const sharedAsset: Asset = {
      id: "asset-shared",
      sourceBlockId: "shared",
      contentVersion: "v2",
      kind: "image",
      publicUrl: "https://assets.example.edu/shared.png",
      checksum: "checksum",
    };
    input.buildPage = async (id) => {
      const value = publication(id, id === "article" ? "section" : null);
      value.blocks.push({ id: "shared", anchor: "b-shared", type: "image", assetId: "asset-shared" });
      value.assets = [sharedAsset];
      return value;
    };

    await expect(publishVersion(input)).rejects.toThrow("duplicate asset id asset-shared across pages");
    expect(state.commits).toEqual([]);
  });

  it("rejects mirrored assets that have no rendered block", async () => {
    const state = memoryStore();
    const input = baseInput(state.store);
    input.buildPage = async (id) => ({
      ...publication(id, id === "article" ? "section" : null),
      assets: id === "article" ? [{
        id: "asset-hidden",
        sourceBlockId: "hidden",
        contentVersion: "v2",
        kind: "file",
        publicUrl: "https://assets.example.edu/hidden.pdf",
        checksum: "checksum",
      }] : [],
    });

    await expect(publishVersion(input)).rejects.toThrow("asset asset-hidden has no rendered block");
    expect(state.commits).toEqual([]);
  });

  it("validates search anchors rendered inside nested callout content", async () => {
    const state = memoryStore();
    const input = baseInput(state.store);
    input.buildPage = async (id) => {
      const value = publication(id, id === "article" ? "section" : null);
      if (id === "article") {
        value.blocks.push({
          id: "notice",
          anchor: "b-notice",
          type: "callout",
          tone: "info",
          richText: text("公告"),
          children: [{ id: "nested-line", anchor: "b-nested-line", type: "paragraph", richText: text("嵌套原文") }],
        });
        value.searchEntries.push({
          id: "v2-nested-line", schemaVersion: 1, contentVersion: "v2", pageId: "article", pageTitle: "article",
          sectionPath: [], anchor: "b-nested-line", plainText: "嵌套原文", blockType: "paragraph", updatedAt: value.page.lastEditedTime,
        });
      }
      return value;
    };

    await expect(publishVersion(input)).resolves.toMatchObject({ status: "published" });
    expect(state.current()).toBe("v2");
  });

  it("validates assets rendered inside quote children", async () => {
    const state = memoryStore();
    const input = baseInput(state.store);
    input.buildPage = async (id) => {
      const value = publication(id, id === "article" ? "section" : null);
      if (id === "article") {
        value.blocks.push({
          id: "quote", anchor: "b-quote", type: "quote", richText: text("附件"),
          children: [{ id: "quote-file", anchor: "b-quote-file", type: "file", assetId: "asset-quote-file", name: "资料.pdf" }],
        });
        value.assets.push({ id: "asset-quote-file", sourceBlockId: "quote-file", contentVersion: "v2", kind: "file", publicUrl: "https://assets.example.edu/file.pdf", checksum: "file" });
      }
      return value;
    };

    await expect(publishVersion(input)).resolves.toMatchObject({ status: "published" });
  });

  it("rolls the pointer back only to a published version", async () => {
    const state = memoryStore("v2");
    state.published.add("v1");

    await rollbackPublishedVersion(state.store, "v1");

    expect(state.current()).toBe("v1");
    await expect(rollbackPublishedVersion(state.store, "draft-v3")).rejects.toThrow("not published");
    expect(state.current()).toBe("v1");
  });
});
