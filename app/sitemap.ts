// 搜索引擎 Sitemap 站点地图生成器 (/sitemap.xml)
import type { MetadataRoute } from "next";
import { loadPublishedRepository } from "@/lib/content/server";
import { getSiteUrl } from "@/lib/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const repository = await loadPublishedRepository();
  const routes = await repository.getPageRoutes();

  const entries: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}/`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${siteUrl}/search`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  for (const [, routePath] of Object.entries(routes)) {
    if (routePath.startsWith("/sections/")) {
      const slug = routePath.replace("/sections/", "");
      const view = await repository.getSectionView(slug);
      entries.push({
        url: `${siteUrl}${routePath}`,
        lastModified: view?.page.lastPublishedAt ? new Date(view.page.lastPublishedAt) : new Date(),
        changeFrequency: "daily",
        priority: 0.8,
      });
    } else if (routePath.startsWith("/docs/")) {
      const slug = routePath.replace("/docs/", "");
      const view = await repository.getDocumentView(slug);
      entries.push({
        url: `${siteUrl}${routePath}`,
        lastModified: view?.page.lastPublishedAt ? new Date(view.page.lastPublishedAt) : new Date(),
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  }

  return entries;
}
