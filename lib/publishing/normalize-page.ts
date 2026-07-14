import type { Page } from "@/lib/content/published-schema";

type NormalizePageOptions = {
  contentVersion: string;
  slug: string;
  lastPublishedAt: string;
  metadata?: Partial<Page["metadata"]>;
};

export function normalizeNotionPage(value: unknown, options: NormalizePageOptions): Page {
  const page = asRecord(value, "Notion page");
  const id = requiredString(page.id, "Notion page id");
  const title = extractTitle(page.properties);
  const lastEditedTime = requiredString(page.last_edited_time, "Notion last_edited_time");
  if (!options.contentVersion.trim()) throw new Error("Content version is required");
  if (!options.slug.trim() || options.slug.includes("/")) throw new Error("Published page slug is invalid");

  return {
    id,
    schemaVersion: 1,
    contentVersion: options.contentVersion,
    parentId: extractParentId(page.parent),
    title,
    slug: options.slug,
    status: "published",
    lastEditedTime,
    lastPublishedAt: options.lastPublishedAt,
    metadata: {
      school: "ncu",
      campus: options.metadata?.campus ?? [],
      audiences: options.metadata?.audiences ?? [],
      topics: options.metadata?.topics ?? [],
      sourceUrls: options.metadata?.sourceUrls ?? [],
      riskLevel: options.metadata?.riskLevel ?? "normal",
    },
  };
}

function extractTitle(value: unknown): string {
  const properties = asRecord(value, "Notion page properties");
  for (const property of Object.values(properties)) {
    if (!isRecord(property) || property.type !== "title" || !Array.isArray(property.title)) continue;
    const title = property.title.map((item) => isRecord(item) && typeof item.plain_text === "string" ? item.plain_text : "").join("").trim();
    if (title) return title;
  }
  throw new Error("Notion page title is required");
}

function extractParentId(value: unknown): string | null {
  if (!isRecord(value)) return null;
  if (value.type === "page_id" && typeof value.page_id === "string") return value.page_id;
  return null;
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required`);
  return value;
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`${label} must be an object`);
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
