// 核心业务领域：知识库 Repository 数据查询访问层，管理文档视图、板块树导航与 Asset 映射
import { publishedFixture } from "@/lib/content/fixtures";
import { createFixtureRepository } from "@/lib/content/fixture-repo";
import type { ContentRepository } from "@/lib/content/repository";

export type { ContentRepository, ContentRepository as PublishedRepository, DocumentView, PageTreeNode } from "@/lib/content/repository";
export { anchorFromSourceId } from "@/lib/content/repository";
export { createFixtureRepository, createFixtureRepository as createPublishedRepository } from "@/lib/content/fixture-repo";

const fixtureRepository: ContentRepository = createFixtureRepository(publishedFixture);

export const getDocumentView = fixtureRepository.getDocumentView.bind(fixtureRepository);
export const getSectionView = fixtureRepository.getSectionView.bind(fixtureRepository);
export const getPublishedSections = fixtureRepository.getPublishedSections.bind(fixtureRepository);
export const getSectionTree = fixtureRepository.getSectionTree.bind(fixtureRepository);
export const getSectionChildren = fixtureRepository.getSectionChildren.bind(fixtureRepository);
export const getSectionForPage = fixtureRepository.getSectionForPage.bind(fixtureRepository);
export const getAsset = fixtureRepository.getAsset.bind(fixtureRepository);
export const getSearchIndex = fixtureRepository.getSearchIndex.bind(fixtureRepository);
export const getPageRoutes = fixtureRepository.getPageRoutes.bind(fixtureRepository);
export const resolvePageRoute = fixtureRepository.resolvePageRoute.bind(fixtureRepository);
