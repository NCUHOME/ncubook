import { publishedFixture } from "@/lib/content/published-fixtures";
import type { Asset, Block, Page, SearchIndexEntry } from "@/lib/content/published-schema";

export type PageTreeNode = {
  id: string;
  title: string;
  href: string;
  children: PageTreeNode[];
};

export type DocumentView = {
  page: Page;
  blocks: Block[];
  description: string;
};

export function anchorFromSourceId(sourceId: string): string {
  return `b-${sourceId}`;
}

export function getDocumentView(slug: string): DocumentView | null {
  const page = publishedFixture.pages.find((candidate) => candidate.slug === slug && candidate.status === "published");
  if (!page) return null;
  const blocks = publishedFixture.blocksByPageId[page.id] ?? [];
  return { page, blocks, description: firstPlainText(blocks) };
}

export function getSectionView(slug: string): DocumentView | null {
  const view = getDocumentView(slug);
  return view?.page.parentId === null ? view : null;
}

export function getSectionTree(sectionSlug: string): PageTreeNode[] {
  const section = publishedFixture.pages.find((page) => page.slug === sectionSlug && page.parentId === null);
  if (!section) return [];
  return childrenOf(section.id);
}

export function getSectionChildren(sectionSlug: string): Page[] {
  const section = publishedFixture.pages.find((page) => page.slug === sectionSlug && page.parentId === null);
  if (!section) return [];
  return publishedFixture.pages.filter((page) => page.parentId === section.id && page.status === "published");
}

export function getSectionForPage(pageId: string): Page | null {
  let page = publishedFixture.pages.find((candidate) => candidate.id === pageId) ?? null;
  while (page?.parentId) {
    page = publishedFixture.pages.find((candidate) => candidate.id === page?.parentId) ?? null;
  }
  return page?.parentId === null ? page : null;
}

export function getAsset(assetId: string): Asset | null {
  return publishedFixture.assets.find((asset) => asset.id === assetId) ?? null;
}

export function getSearchIndex(): SearchIndexEntry[] {
  return [...publishedFixture.searchIndex];
}

export function resolvePageRoute(pageId: string): string {
  const page = publishedFixture.pages.find((candidate) => candidate.id === pageId);
  if (!page) throw new Error(`Unknown published page: ${pageId}`);
  return page.parentId === null ? `/sections/${page.slug}` : `/docs/${page.slug}`;
}

function childrenOf(parentId: string): PageTreeNode[] {
  return publishedFixture.pages
    .filter((page) => page.parentId === parentId && page.status === "published")
    .map((page) => ({ id: page.id, title: page.title, href: resolvePageRoute(page.id), children: childrenOf(page.id) }));
}

function firstPlainText(blocks: Block[]): string {
  for (const block of blocks) {
    if ("richText" in block) return block.richText.map((item) => item.plainText).join("");
  }
  return "";
}
