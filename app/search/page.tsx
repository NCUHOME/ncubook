// 关键词搜索页面路由：服务端获取 url ?q= 查询参数，动态生成 Metadata，并直接渲染 SearchExperience
import type { Metadata } from "next";
import { loadPublishedRepository } from "@/lib/content/server";
import { searchGroupedEntries, type GroupedSearchResult } from "@/lib/content/search";
import { SearchExperience } from "@/src/components/search/box";
import { AppHeader } from "@/src/components/primitives/header";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}): Promise<Metadata> {
  const { q = "" } = await searchParams;
  const query = q.trim();
  const title = query ? `"${query}" 的搜索结果 - 此间` : "关键词搜索 - 此间";

  return {
    title,
    description: "南昌大学校园知识全文关键词搜索与定位",
  };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim();

  let results: GroupedSearchResult[] = [];
  if (query.length > 0) {
    try {
      const repository = await loadPublishedRepository();
      const searchIndex = await repository.getSearchIndex();
      results = searchGroupedEntries(query, searchIndex, repository.resolvePageRoute);
    } catch {
      results = [];
    }
  }

  return (
    <>
      <AppHeader title="搜索文档" backHref="/" hideSearchAction />
      <main className="px-s5 pb-s7 pt-s5">
        <SearchExperience initialQuery={query} initialResults={results} />
      </main>
    </>
  );
}
