// 核心业务领域：ContentRepository 只读仓储接口契约，统一定义文档视图、板块树、搜索索引与路由解析操作
import type { Asset, Block, Page, SearchIndexEntry } from "@/lib/content/schema";

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

export interface ContentRepository {
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
}

export function anchorFromSourceId(sourceId: string): string {
  return `b-${sourceId}`;
}
