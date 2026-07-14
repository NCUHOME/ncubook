import type { SearchResult } from "@/lib/search/search-blocks";
import { AppHeader } from "@/src/components/navigation/AppHeader";
import { SearchForm } from "@/src/components/search/SearchForm";
import { SearchResultItem } from "@/src/components/search/SearchResultItem";

export function SearchPageView({ query, results }: { query: string; results: SearchResult[] }) {
  return (
    <>
      <AppHeader title="搜索文档" backHref="/" />
      <main className="px-s5 pb-s7 pt-s5">
        <SearchForm defaultValue={query} />
        {!query ? <section className="py-s7"><h1 className="font-display text-heading leading-heading font-semibold">输入一个关键词</h1><p className="mt-s3 font-body text-body leading-body text-muted">结果会显示匹配的文档、原文段落与具体位置。</p></section> : null}
        {query ? <p className="py-s5 text-caption text-muted">找到 {results.length} 个匹配段落</p> : null}
        {results.map((result) => <SearchResultItem key={`${result.href}-${result.anchor}`} result={result} query={query} />)}
        {query && results.length === 0 ? <p className="border-y border-line py-s5 font-body text-label leading-body text-muted">没有找到匹配段落。可以尝试更短或更具体的关键词。</p> : null}
      </main>
    </>
  );
}
