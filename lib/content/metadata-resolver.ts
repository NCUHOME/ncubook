// 工具函数：全站已发布文章元数据反查器 (lib/content/metadata-resolver.ts)
// 用于管理后台数据大盘、用户反馈与配置编辑器快速将 page-id / slug / 截断UUID 解析为真实中文标题与跳转路由

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

const HOME_META: ArticleMetadata = {
  id: "home",
  slug: "",
  title: "首页",
  sectionTitle: "首页",
  routePath: "/",
};

export async function getArticleMetadataLookup(): Promise<{
  articles: ArticleMetadata[];
  lookup: Record<string, ArticleMetadata>;
}> {
  const articles: ArticleMetadata[] = [];
  const lookup: Record<string, ArticleMetadata> = {};

  lookup["/"] = HOME_META;
  lookup["home"] = HOME_META;
  lookup["首页"] = HOME_META;

  try {
    const repo = await loadPublishedRepository();
    const sections = await repo.getPublishedSections();
    const routes = await repo.getPageRoutes();

    const registerItem = (meta: ArticleMetadata) => {
      articles.push(meta);

      const keys = [
        meta.id,
        meta.slug,
        meta.routePath,
        `/docs/${meta.slug}`,
        `/sections/${meta.slug}`,
        meta.title,
      ];

      // 提取无连字符纯 Hex UUID 及截断 16 位版本
      const cleanId = meta.id.replace(/^page-/, "").replace(/-/g, "").toLowerCase();
      if (cleanId.length >= 16) {
        const short16 = cleanId.slice(0, 16);
        keys.push(
          cleanId,
          short16,
          `page-${cleanId}`,
          `page-${short16}`,
          `/docs/page-${short16}`,
          `/sections/page-${short16}`,
          `/docs/page-${cleanId}`,
          `/sections/page-${cleanId}`,
        );
      }

      for (const k of keys) {
        if (k) lookup[k.toLowerCase()] = meta;
      }
    };

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
      registerItem(secMeta);

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
        registerItem(childMeta);
      }
    }
  } catch {
    // 降级兜底
  }

  return { articles, lookup };
}

/**
 * 模糊智能解析任意路径、pageId、截断 ID 或 Slug 对应的文章元数据
 */
export function resolveArticleMeta(
  lookup: Record<string, ArticleMetadata>,
  rawKey?: string | null,
): ArticleMetadata | undefined {
  if (!rawKey) return undefined;
  const key = rawKey.trim();
  if (key === "/" || key === "" || key.toLowerCase() === "home") return HOME_META;

  const direct = lookup[key.toLowerCase()];
  if (direct) return direct;

  const clean = key
    .replace(/^\/docs\//, "")
    .replace(/^\/sections\//, "")
    .replace(/^page-/, "")
    .replace(/-/g, "")
    .toLowerCase();

  if (lookup[clean]) return lookup[clean];

  // 16 位截断模糊匹配
  if (clean.length >= 8) {
    const foundKey = Object.keys(lookup).find((k) => k.startsWith(clean) || clean.startsWith(k));
    if (foundKey && lookup[foundKey]) return lookup[foundKey];
  }

  return undefined;
}
