// 核心业务领域：静态 Fixture 假数据仓储策略实现 (FixtureContentRepository)，用于单测与本地开发脱网渲染
import { publishedFixture } from "@/lib/content/fixtures";
import type { Asset, Block, Page, PublishedFixture, SearchIndexEntry } from "@/lib/content/schema";
import type { ContentRepository, DocumentView, PageTreeNode } from "@/lib/content/repository";

export class FixtureContentRepository implements ContentRepository {
  private fixture: PublishedFixture;

  constructor(fixture: PublishedFixture = publishedFixture) {
    this.fixture = fixture;
  }

  resolvePageRoute = (pageId: string): string => {
    const page = this.fixture.pages.find((candidate) => candidate.id === pageId);
    if (!page) throw new Error(`Unknown published page: ${pageId}`);
    return page.parentId === null ? `/sections/${page.slug}` : `/docs/${page.slug}`;
  };

  private childrenOf = (parentId: string): PageTreeNode[] =>
    this.fixture.pages
      .filter((page) => page.parentId === parentId && page.status === "published")
      .map((page) => ({
        id: page.id,
        title: page.title,
        href: this.resolvePageRoute(page.id),
        children: this.childrenOf(page.id),
      }));

  getDocumentView = (slug: string): DocumentView | null => {
    const page = this.fixture.pages.find((candidate) => candidate.slug === slug && candidate.status === "published");
    if (!page) return null;
    const blocks = this.fixture.blocksByPageId[page.id] ?? [];
    return { page, blocks, description: firstPlainText(blocks) };
  };

  getSectionView = (slug: string): DocumentView | null => {
    const view = this.getDocumentView(slug);
    return view?.page.parentId === null ? view : null;
  };

  getPublishedSections = (): Page[] => {
    return this.fixture.pages.filter((page) => page.parentId === null && page.status === "published");
  };

  getSectionTree = (sectionSlug: string): PageTreeNode[] => {
    const section = this.fixture.pages.find((page) => page.slug === sectionSlug && page.parentId === null);
    return section ? this.childrenOf(section.id) : [];
  };

  getSectionChildren = (sectionSlug: string): Page[] => {
    const section = this.fixture.pages.find((page) => page.slug === sectionSlug && page.parentId === null);
    return section ? this.fixture.pages.filter((page) => page.parentId === section.id && page.status === "published") : [];
  };

  getSectionForPage = (pageId: string): Page | null => {
    let page = this.fixture.pages.find((candidate) => candidate.id === pageId) ?? null;
    while (page?.parentId) page = this.fixture.pages.find((candidate) => candidate.id === page?.parentId) ?? null;
    return page?.parentId === null ? page : null;
  };

  getAsset = (assetId: string): Asset | null => {
    return this.fixture.assets.find((asset) => asset.id === assetId) ?? null;
  };

  getSearchIndex = (): SearchIndexEntry[] => {
    return [...this.fixture.searchIndex];
  };

  getPageRoutes = (): Record<string, string> => {
    return Object.fromEntries(this.fixture.pages.map((page) => [page.id, this.resolvePageRoute(page.id)]));
  };
}

function firstPlainText(blocks: Block[]): string {
  for (const block of blocks) {
    if ("richText" in block) return block.richText.map((item) => item.plainText).join("");
  }
  return "";
}

export function createFixtureRepository(fixture?: PublishedFixture): ContentRepository {
  return new FixtureContentRepository(fixture);
}
