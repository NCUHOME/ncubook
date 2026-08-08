// 视图：关键词全文搜索结果页，渲染搜索专属 AppHeader 顶栏与交互式搜索体验容器 SearchExperience
import type { SearchResult } from "@/lib/search/search-blocks";
import { AppHeader } from "@/src/components/nav/header";
import { SearchExperience } from "@/src/components/search/box";

export function SearchPageView({ query, results }: { query: string; results: SearchResult[] }) {
  return (
    <>
      <AppHeader title="搜索文档" backHref="/" />
      <main className="px-s5 pb-s7 pt-s5">
        <SearchExperience initialQuery={query} initialResults={results} />
      </main>
    </>
  );
}

export const SearchView = SearchPageView;
