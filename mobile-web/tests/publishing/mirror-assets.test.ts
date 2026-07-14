import { describe, expect, it, vi } from "vitest";
import { mirrorNotionAssets, AssetMirrorError, type AssetStorage } from "@/lib/publishing/mirror-assets";
import type { NotionBlockNode, NotionObject } from "@/lib/publishing/notion-client";

function node(value: NotionObject): NotionBlockNode {
  return { ...value, children: [] };
}

const rich = (plainText: string) => [{ plain_text: plainText, annotations: { color: "default" } }];

describe("Notion asset mirroring", () => {
  it("deduplicates by checksum and never publishes expiring Notion URLs", async () => {
    const bytes = new TextEncoder().encode("same-image");
    const download = vi.fn(async () => ({ bytes, mediaType: "image/png" }));
    const upload = vi.fn(async ({ path }: { path: string }) => `https://assets.example.edu/${path}`);
    const storage: AssetStorage = { upload };

    const result = await mirrorNotionAssets([
      node({ id: "image-one", type: "image", image: { caption: rich("校园路线图"), file: { url: "https://prod-files-secure.s3.us-west-2.amazonaws.com/signed-one" } } }),
      node({ id: "image-two", type: "image", image: { caption: [], file: { url: "https://prod-files-secure.s3.us-west-2.amazonaws.com/signed-two" } } }),
    ], {
      contentVersion: "content-v1",
      pageId: "page-transport",
      download,
      storage,
    });

    expect(download).toHaveBeenCalledTimes(2);
    expect(upload).toHaveBeenCalledTimes(1);
    expect(result.assets).toHaveLength(2);
    expect(result.assets[0]).toMatchObject({ id: "asset-image-one", sourceBlockId: "image-one", kind: "image", alt: "校园路线图" });
    expect(result.assets[0].publicUrl).toBe(result.assets[1].publicUrl);
    expect(result.assets.every((asset) => !asset.publicUrl.includes("prod-files-secure"))).toBe(true);
    expect(result.warnings).toContainEqual({ blockId: "image-two", code: "missing-alt", message: "Image is missing alt text" });
  });

  it("rejects unsafe media types and files over the configured limit", async () => {
    const storage: AssetStorage = { upload: vi.fn(async () => "https://assets.example.edu/file") };
    const file = node({ id: "file-one", type: "file", file: { name: "unsafe.html", caption: [], file: { url: "https://notion.example/unsafe" } } });

    await expect(mirrorNotionAssets([file], {
      contentVersion: "v1",
      pageId: "page-1",
      storage,
      download: async () => ({ bytes: new TextEncoder().encode("<script>"), mediaType: "text/html" }),
    })).rejects.toEqual(new AssetMirrorError("file-one", "unsupported-media-type"));

    await expect(mirrorNotionAssets([file], {
      contentVersion: "v1",
      pageId: "page-1",
      storage,
      maxBytes: 4,
      download: async () => ({ bytes: new Uint8Array(5), mediaType: "application/pdf" }),
    })).rejects.toEqual(new AssetMirrorError("file-one", "file-too-large"));
  });

  it("mirrors zip attachments without treating them as executable content", async () => {
    const upload = vi.fn(async ({ path }: { path: string }) => `https://assets.example.edu/${path}`);
    const file = node({ id: "zip-one", type: "file", file: { name: "学院实施细则.zip", caption: [], file: { url: "https://notion.example/rules" } } });

    const result = await mirrorNotionAssets([file], {
      contentVersion: "v1",
      pageId: "page-1",
      storage: { upload },
      download: async () => ({ bytes: new Uint8Array([1, 2, 3]), mediaType: "application/zip" }),
    });

    expect(result.assets).toHaveLength(1);
    expect(upload).toHaveBeenCalledWith(expect.objectContaining({ path: expect.stringContaining("学院实施细则.zip"), mediaType: "application/zip" }));
  });

  it("preserves legacy Word attachments with their original filename", async () => {
    const upload = vi.fn(async ({ path }: { path: string }) => `https://assets.example.edu/${path}`);
    const file = node({ id: "word-one", type: "file", file: { name: "校园长跑评分标准.doc", caption: [], file: { url: "https://notion.example/rules" } } });

    await mirrorNotionAssets([file], {
      contentVersion: "v1",
      pageId: "page-1",
      storage: { upload },
      download: async () => ({ bytes: new Uint8Array([1, 2, 3]), mediaType: "application/msword" }),
    });

    expect(upload).toHaveBeenCalledWith(expect.objectContaining({ path: expect.stringContaining("校园长跑评分标准.doc"), mediaType: "application/msword" }));
  });

  it("mirrors assets nested inside columns and lists", async () => {
    const nestedImage = node({ id: "nested-image", type: "image", image: { caption: rich("宿舍照片"), external: { url: "https://example.edu/dorm.png" } } });
    const tree: NotionBlockNode[] = [{ id: "column", type: "column", has_children: true, children: [nestedImage] }];
    const upload = vi.fn(async () => "https://assets.example.edu/nested.png");

    const result = await mirrorNotionAssets(tree, {
      contentVersion: "v1",
      pageId: "page-1",
      storage: { upload },
      download: async () => ({ bytes: new Uint8Array([1, 2, 3]), mediaType: "image/png" }),
    });

    expect(result.assets).toHaveLength(1);
    expect(result.assets[0].id).toBe("asset-nested-image");
  });
});
