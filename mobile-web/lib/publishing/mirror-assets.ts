import { createHash } from "node:crypto";
import type { Asset } from "@/lib/content/published-schema";
import type { NotionBlockNode } from "@/lib/publishing/notion-client";

const DEFAULT_MAX_BYTES = 20 * 1024 * 1024;

const allowedMediaTypes = new Map<string, string>([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
  ["image/svg+xml", "svg"],
  ["application/pdf", "pdf"],
  ["text/plain", "txt"],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx"],
  ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx"],
  ["application/vnd.openxmlformats-officedocument.presentationml.presentation", "pptx"],
]);

export type AssetStorage = {
  upload(input: { path: string; bytes: Uint8Array; mediaType: string }): Promise<string>;
};

export type AssetMirrorFailureReason =
  | "missing-source-url"
  | "unsupported-media-type"
  | "file-too-large";

export class AssetMirrorError extends Error {
  constructor(
    public readonly blockId: string,
    public readonly reason: AssetMirrorFailureReason,
  ) {
    super(`Unable to mirror Notion asset ${blockId}: ${reason}`);
    this.name = "AssetMirrorError";
  }
}

type MirrorOptions = {
  contentVersion: string;
  pageId: string;
  download(url: string): Promise<{ bytes: Uint8Array; mediaType: string }>;
  storage: AssetStorage;
  maxBytes?: number;
};

type AssetWarning = {
  blockId: string;
  code: "missing-alt";
  message: string;
};

export async function mirrorNotionAssets(
  tree: NotionBlockNode[],
  options: MirrorOptions,
): Promise<{ assets: Asset[]; warnings: AssetWarning[] }> {
  const assets: Asset[] = [];
  const warnings: AssetWarning[] = [];
  const publicUrlsByChecksum = new Map<string, string>();

  for (const node of flatten(tree)) {
    if (node.type !== "image" && node.type !== "file") continue;

    const kind = node.type;
    const value = asRecord(node[kind]);
    const sourceUrl = assetSourceUrl(value);
    if (!sourceUrl) throw new AssetMirrorError(node.id, "missing-source-url");

    const downloaded = await options.download(sourceUrl);
    const extension = allowedMediaTypes.get(normalizeMediaType(downloaded.mediaType));
    if (!extension) throw new AssetMirrorError(node.id, "unsupported-media-type");
    if (downloaded.bytes.byteLength > (options.maxBytes ?? DEFAULT_MAX_BYTES)) {
      throw new AssetMirrorError(node.id, "file-too-large");
    }

    const checksum = createHash("sha256").update(downloaded.bytes).digest("hex");
    let publicUrl = publicUrlsByChecksum.get(checksum);
    if (!publicUrl) {
      const preferredName = typeof value.name === "string" ? value.name : `${kind}.${extension}`;
      const path = [
        safePathPart(options.contentVersion),
        safePathPart(options.pageId),
        checksum,
        safeFileName(preferredName, extension),
      ].join("/");
      publicUrl = await options.storage.upload({
        path,
        bytes: downloaded.bytes,
        mediaType: normalizeMediaType(downloaded.mediaType),
      });
      publicUrlsByChecksum.set(checksum, publicUrl);
    }

    const alt = kind === "image" ? captionText(value.caption) : undefined;
    if (kind === "image" && !alt) {
      warnings.push({ blockId: node.id, code: "missing-alt", message: "Image is missing alt text" });
    }

    assets.push({
      id: `asset-${node.id}`,
      sourceBlockId: node.id,
      contentVersion: options.contentVersion,
      kind,
      publicUrl,
      checksum,
      ...(alt ? { alt } : {}),
    });
  }

  return { assets, warnings };
}

function* flatten(nodes: NotionBlockNode[]): Generator<NotionBlockNode> {
  for (const node of nodes) {
    yield node;
    yield* flatten(node.children);
  }
}

function assetSourceUrl(value: Record<string, unknown>): string | undefined {
  for (const sourceType of ["file", "external"] as const) {
    const source = asRecord(value[sourceType]);
    if (typeof source.url === "string" && source.url.trim()) return source.url;
  }
  return undefined;
}

function captionText(value: unknown): string | undefined {
  if (!Array.isArray(value)) return undefined;
  const text = value
    .map((item) => {
      const richText = asRecord(item);
      return typeof richText.plain_text === "string" ? richText.plain_text : "";
    })
    .join("")
    .trim();
  return text || undefined;
}

function normalizeMediaType(value: string): string {
  return value.split(";", 1)[0].trim().toLowerCase();
}

function safePathPart(value: string): string {
  const safe = value.trim().replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  return safe || "unknown";
}

function safeFileName(value: string, extension: string): string {
  const withoutPath = value.split(/[\\/]/).at(-1) ?? "asset";
  const safe = withoutPath.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  const fallback = `asset.${extension}`;
  if (!safe) return fallback;
  return safe.includes(".") ? safe : `${safe}.${extension}`;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}
