// 核心业务领域：文章 Block 粒度关键词全文检索与结果锚点生成引擎
import type { SearchIndexEntry } from "@/lib/content/schema";

export type SearchResult = {
  pageTitle: string;
  sectionPath: string[];
  excerpt: string;
  anchor: string;
  href: string;
};

export function searchEntries(
  query: string,
  entries: SearchIndexEntry[],
  resolvePageRoute: (pageId: string) => string,
): SearchResult[] {
  const needle = query.trim().toLocaleLowerCase("zh-CN");
  if (!needle) return [];

  return entries
    .filter((entry) => entry.plainText.toLocaleLowerCase("zh-CN").includes(needle))
    .map((entry) => ({
      pageTitle: entry.pageTitle,
      sectionPath: [...entry.sectionPath],
      excerpt: entry.plainText,
      anchor: entry.anchor,
      href: `${resolvePageRoute(entry.pageId)}#${entry.anchor}`,
    }));
}
