// 工具函数：全站已发布文章元数据反查器 (lib/content/metadata-resolver.ts)
// 用于管理后台数据大盘、用户反馈与配置编辑器快速将 page-id / slug 解析为真实中文标题与跳转路由

import { loadPublishedRepository } from "@/lib/content/server";

export type ArticleMetadata = {
  id: string;
  slug: string;
  title: string;
  sectionId?: string;
  sectionTitle?: string;
  routePath: string;
  notionUrl?: string;
};

export async function getArticleMetadataLookup(): Promise<{
  articles: ArticleMetadata[];
  lookup: Record<string, ArticleMetadata>;
}> {
  const articles: ArticleMetadata[] = [];
  const lookup: Record<string, ArticleMetadata> = {};

  try {
    const repo = await loadPublishedRepository();
    const sections = await repo.getPublishedSections();
    const routes = await repo.getPageRoutes();

    for (const sec of sections) {
      const secMeta: ArticleMetadata = {
        id: sec.id,
        slug: sec.slug,
        title: sec.title,
        sectionId: sec.id,
        sectionTitle: sec.title,
        routePath: routes[sec.id] || `/sections/${sec.slug}`,
        notionUrl: sec.metadata?.sourceUrls?.[0],
      };
      articles.push(secMeta);
      lookup[sec.id] = secMeta;
      lookup[sec.slug] = secMeta;
      lookup[secMeta.routePath] = secMeta;
      lookup[`/docs/${sec.slug}`] = secMeta;

      const children = await repo.getSectionChildren(sec.slug);
      for (const child of children) {
        const childMeta: ArticleMetadata = {
          id: child.id,
          slug: child.slug,
          title: child.title,
          sectionId: sec.id,
          sectionTitle: sec.title,
          routePath: routes[child.id] || `/docs/${child.slug}`,
          notionUrl: child.metadata?.sourceUrls?.[0],
        };
        articles.push(childMeta);
        lookup[child.id] = childMeta;
        lookup[child.slug] = childMeta;
        lookup[childMeta.routePath] = childMeta;
        lookup[`/docs/${child.slug}`] = childMeta;
      }
    }
  } catch {
    // 降级兜底
  }

  return { articles, lookup };
}
