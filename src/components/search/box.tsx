// 组件：交互式关键词搜索容器，支持前端 5ms 零延迟打字即搜 (Instant Search as you type) 与 API 降级
"use client";

import { Search, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { SearchResult } from "@/lib/content/search";
import type { CompactSearchItem } from "@/app/api/search/index/route";
import { SearchResultItem } from "@/src/components/search/item";

type SearchResponse = { query?: string; results?: SearchResult[] };

export function SearchExperience({
  initialQuery,
  initialResults,
}: {
  initialQuery: string;
  initialResults: SearchResult[];
}) {
  const [value, setValue] = useState(initialQuery);
  const [submittedQuery, setSubmittedQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>(initialResults);
  const [pending, setPending] = useState(false);

  const requestRef = useRef(0);
  const indexRef = useRef<CompactSearchItem[] | null>(null);
  const loadingIndexRef = useRef(false);
  const valueRef = useRef(value);
  valueRef.current = value;

  function syncUrl(query: string) {
    const url = query ? `/search?q=${encodeURIComponent(query)}` : "/search";
    window.history.replaceState(window.history.state, "", url);
  }

  // 1. 静默预加载轻量级全量搜索索引 JSON (~30KB)
  useEffect(() => {
    if (indexRef.current || loadingIndexRef.current) return;
    loadingIndexRef.current = true;

    fetch("/api/search/index")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data)) {
          indexRef.current = data as CompactSearchItem[];
          if (valueRef.current.trim()) {
            filterLocalIndex(valueRef.current.trim(), data as CompactSearchItem[]);
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        loadingIndexRef.current = false;
      });
  }, []);

  // 2. 客户端 5ms 零延迟纯内存分词与检索匹配引擎
  function filterLocalIndex(query: string, items: CompactSearchItem[]) {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      setResults([]);
      setPending(false);
      return;
    }

    const matches: SearchResult[] = [];
    for (const item of items) {
      if (item.e.toLowerCase().includes(needle) || item.t.toLowerCase().includes(needle)) {
        matches.push({
          pageTitle: item.t,
          sectionPath: item.p,
          excerpt: item.e,
          anchor: item.a,
          href: item.h,
        });
        if (matches.length >= 50) break;
      }
    }

    setResults(matches);
    setPending(false);
  }

  // 3. Fallback 后台 API 检索
  async function runSearchApi(query: string) {
    const requestId = ++requestRef.current;
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

  // 4. 输入框实时打字响应事件 (Instant Search)
  function handleInputChange(text: string) {
    setValue(text);
    const query = text.trim();
    setSubmittedQuery(query);
    syncUrl(query);

    if (!query) {
      setResults([]);
      setPending(false);
      return;
    }

    if (indexRef.current) {
      filterLocalIndex(query, indexRef.current);
    } else {
      void runSearchApi(query);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = value.trim();
    setSubmittedQuery(query);
    syncUrl(query);

    if (indexRef.current) {
      filterLocalIndex(query, indexRef.current);
    } else {
      void runSearchApi(query);
    }
  }

  function handleClear() {
    setValue("");
    setSubmittedQuery("");
    syncUrl("");
    setResults([]);
    setPending(false);
  }

  return (
    <>
      <form action="/search" method="get" onSubmit={handleSubmit}>
        <label htmlFor="keyword-search" className="sr-only">
          关键词
        </label>
        <div className="flex min-h-tap items-center gap-s3 border-b border-ink">
          <Search className="size-icon text-muted" strokeWidth={1.9} />
          <input
            id="keyword-search"
            name="q"
            value={value}
            onChange={(event) => handleInputChange(event.target.value)}
            autoFocus
            className="min-w-0 flex-1 bg-transparent font-body text-body outline-none placeholder:text-muted"
            placeholder="搜索文档和段落"
            autoComplete="off"
          />
          {submittedQuery ? (
            <button
              type="button"
              onClick={handleClear}
              className="focus-ring tap-target grid place-items-center rounded-round"
              aria-label="清除关键词"
            >
              <X className="size-icon-small" />
            </button>
          ) : null}
        </div>
      </form>
      {!submittedQuery ? (
        <section className="py-s7">
          <h1 className="font-display text-heading leading-heading font-semibold">输入一个关键词</h1>
          <p className="mt-s3 font-body text-body leading-body text-muted">
            结果会显示匹配的文档、原文段落与具体位置。
          </p>
        </section>
      ) : null}
      {submittedQuery ? (
        <p className="py-s5 text-caption text-muted">
          {pending ? "搜索中…" : `找到 ${results.length} 个匹配段落`}
        </p>
      ) : null}
      {results.map((result) => (
        <SearchResultItem key={`${result.href}-${result.anchor}`} result={result} query={submittedQuery} />
      ))}
      {submittedQuery && !pending && results.length === 0 ? (
        <p className="border-y border-line py-s5 font-body text-label leading-body text-muted">
          没有找到匹配段落。可以尝试更短或更具体的关键词。
        </p>
      ) : null}
    </>
  );
}
