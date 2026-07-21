"use client";

import { Search, X } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import type { SearchResult } from "@/lib/search/search-blocks";
import { SearchResultItem } from "@/src/components/search/SearchResultItem";

type SearchResponse = { query?: string; results?: SearchResult[] };

export function SearchExperience({ initialQuery, initialResults }: { initialQuery: string; initialResults: SearchResult[] }) {
  const [value, setValue] = useState(initialQuery);
  const [submittedQuery, setSubmittedQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>(initialResults);
  const [pending, setPending] = useState(false);
  const requestRef = useRef(0);

  function syncUrl(query: string) {
    const url = query ? `/search?q=${encodeURIComponent(query)}` : "/search";
    window.history.replaceState(window.history.state, "", url);
  }

  async function runSearch(query: string) {
    const requestId = ++requestRef.current;
    setSubmittedQuery(query);
    syncUrl(query);
    if (!query) {
      setResults([]);
      setPending(false);
      return;
    }
    setPending(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error(`Search request failed: ${response.status}`);
      const payload = (await response.json()) as SearchResponse;
      if (requestRef.current === requestId) setResults(Array.isArray(payload.results) ? payload.results : []);
    } catch {
      if (requestRef.current === requestId) setResults([]);
    } finally {
      if (requestRef.current === requestId) setPending(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runSearch(value.trim());
  }

  function handleClear() {
    setValue("");
    void runSearch("");
  }

  return (
    <>
      <form action="/search" method="get" onSubmit={handleSubmit}>
        <label htmlFor="keyword-search" className="sr-only">关键词</label>
        <div className="flex min-h-tap items-center gap-s3 border-b border-ink">
          <Search className="size-icon text-muted" strokeWidth={1.9} />
          <input id="keyword-search" name="q" value={value} onChange={(event) => setValue(event.target.value)} className="min-w-0 flex-1 bg-transparent font-body text-body outline-none placeholder:text-muted" placeholder="搜索文档和段落" autoComplete="off" />
          {submittedQuery ? <button type="button" onClick={handleClear} className="focus-ring tap-target grid place-items-center rounded-round" aria-label="清除关键词"><X className="size-icon-small" /></button> : null}
        </div>
      </form>
      {!submittedQuery ? <section className="py-s7"><h1 className="font-display text-heading leading-heading font-semibold">输入一个关键词</h1><p className="mt-s3 font-body text-body leading-body text-muted">结果会显示匹配的文档、原文段落与具体位置。</p></section> : null}
      {submittedQuery ? <p className="py-s5 text-caption text-muted">{pending ? "搜索中…" : `找到 ${results.length} 个匹配段落`}</p> : null}
      {results.map((result) => <SearchResultItem key={`${result.href}-${result.anchor}`} result={result} query={submittedQuery} />)}
      {submittedQuery && !pending && results.length === 0 ? <p className="border-y border-line py-s5 font-body text-label leading-body text-muted">没有找到匹配段落。可以尝试更短或更具体的关键词。</p> : null}
    </>
  );
}
