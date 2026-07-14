import { publishedFixture } from "@/lib/content/published-fixtures";
import type { Asset, Block, Page, PublishedFixture, SearchIndexEntry } from "@/lib/content/published-schema";

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

export type PublishedRepository = {
  getDocumentView(slug: string): DocumentView | null;
  getSectionView(slug: string): DocumentView | null;
  getPublishedSections(): Page[];
  getSectionTree(sectionSlug: string): PageTreeNode[];
  getSectionChildren(sectionSlug: string): Page[];
  getSectionForPage(pageId: string): Page | null;
  getAsset(assetId: string): Asset | null;
  getSearchIndex(): SearchIndexEntry[];
  getPageRoutes(): Record<string, string>;
  resolvePageRoute(pageId: string): string;
};

export function anchorFromSourceId(sourceId: string): string {
  return `b-${sourceId}`;
}

export function createPublishedRepository(fixture: PublishedFixture): PublishedRepository {
  const resolvePageRoute = (pageId: string): string => {
    const page = fixture.pages.find((candidate) => candidate.id === pageId);
    if (!page) throw new Error(`Unknown published page: ${pageId}`);
    return page.parentId === null ? `/sections/${page.slug}` : `/docs/${page.slug}`;
  };

  const childrenOf = (parentId: string): PageTreeNode[] => fixture.pages
    .filter((page) => page.parentId === parentId && page.status === "published")
    .map((page) => ({ id: page.id, title: page.title, href: resolvePageRoute(page.id), children: childrenOf(page.id) }));

  const getDocumentView = (slug: string): DocumentView | null => {
    const page = fixture.pages.find((candidate) => candidate.slug === slug && candidate.status === "published");
    if (!page) return null;
    const blocks = fixture.blocksByPageId[page.id] ?? [];
    return { page, blocks, description: firstPlainText(blocks) };
  };

  return {
    getDocumentView,
    getSectionView(slug) {
      const view = getDocumentView(slug);
      return view?.page.parentId === null ? view : null;
    },
    getPublishedSections() {
      return fixture.pages.filter((page) => page.parentId === null && page.status === "published");
    },
    getSectionTree(sectionSlug) {
      const section = fixture.pages.find((page) => page.slug === sectionSlug && page.parentId === null);
      return section ? childrenOf(section.id) : [];
    },
    getSectionChildren(sectionSlug) {
      const section = fixture.pages.find((page) => page.slug === sectionSlug && page.parentId === null);
      return section ? fixture.pages.filter((page) => page.parentId === section.id && page.status === "published") : [];
    },
    getSectionForPage(pageId) {
      let page = fixture.pages.find((candidate) => candidate.id === pageId) ?? null;
      while (page?.parentId) page = fixture.pages.find((candidate) => candidate.id === page?.parentId) ?? null;
      return page?.parentId === null ? page : null;
    },
    getAsset(assetId) {
      return fixture.assets.find((asset) => asset.id === assetId) ?? null;
    },
    getSearchIndex() {
      return [...fixture.searchIndex];
    },
    getPageRoutes() {
      return Object.fromEntries(fixture.pages.map((page) => [page.id, resolvePageRoute(page.id)]));
    },
    resolvePageRoute,
  };
}

const fixtureRepository = createPublishedRepository(publishedFixture);

export const getDocumentView = fixtureRepository.getDocumentView;
export const getSectionView = fixtureRepository.getSectionView;
export const getPublishedSections = fixtureRepository.getPublishedSections;
export const getSectionTree = fixtureRepository.getSectionTree;
export const getSectionChildren = fixtureRepository.getSectionChildren;
export const getSectionForPage = fixtureRepository.getSectionForPage;
export const getAsset = fixtureRepository.getAsset;
export const getSearchIndex = fixtureRepository.getSearchIndex;
export const getPageRoutes = fixtureRepository.getPageRoutes;
export const resolvePageRoute = fixtureRepository.resolvePageRoute;

function firstPlainText(blocks: Block[]): string {
  for (const block of blocks) {
    if ("richText" in block) return block.richText.map((item) => item.plainText).join("");
  }
  return "";
}
