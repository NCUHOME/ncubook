import type { SearchResult } from "@/lib/search/search-blocks";
import { AppHeader } from "@/src/components/navigation/AppHeader";
import { SearchExperience } from "@/src/components/search/SearchExperience";

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
