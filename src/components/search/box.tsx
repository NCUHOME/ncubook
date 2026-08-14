// 组件：交互式关键词搜索容器，支持前端 5ms 零延迟打字即搜 (Instant Search as you type) 与文档级聚合展示
"use client";

import { Search, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { extractSnippet, type GroupedSearchResult, type SearchSnippet } from "@/lib/content/search";
import type { CompactSearchItem } from "@/app/api/search/index/route";
import { SearchResultItem } from "@/src/components/search/item";

type SearchResponse = { query?: string; results?: GroupedSearchResult[] };

export function SearchExperience({
  initialQuery,
  initialResults,
}: {
  initialQuery: string;
  initialResults: GroupedSearchResult[];
}) {
  const [value, setValue] = useState(initialQuery);
  const [submittedQuery, setSubmittedQuery] = useState(initialQuery);
  const [results, setResults] = useState<GroupedSearchResult[]>(initialResults);
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

  // 2. 客户端 5ms 零延迟纯内存分词与文档级聚合匹配引擎
  function filterLocalIndex(query: string, items: CompactSearchItem[]) {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      setResults([]);
      setPending(false);
      return;
    }

    // 按 pageId 分组
    const pageMap = new Map<
      string,
      {
        pageId: string;
        pageTitle: string;
        sectionPath: string[];
        route: string;
        items: CompactSearchItem[];
      }
    >();

    for (const item of items) {
      let group = pageMap.get(item.pid);
      if (!group) {
        group = {
          pageId: item.pid,
          pageTitle: item.t,
          sectionPath: item.p.length > 0 ? [item.p[0]] : [],
          route: item.r,
          items: [],
        };
        pageMap.set(item.pid, group);
      }
      group.items.push(item);
    }

    const groupedList: GroupedSearchResult[] = [];

    for (const group of pageMap.values()) {
      const pageTitleLower = group.pageTitle.toLowerCase();
      const isExactTitle = pageTitleLower === needle;
      const isPrefixTitle = pageTitleLower.startsWith(needle);
      const isTitleMatch = pageTitleLower.includes(needle);

      let titleScore = 0;
      if (isExactTitle) titleScore = 120;
      else if (isPrefixTitle) titleScore = 90;
      else if (isTitleMatch) titleScore = 60;

      const matchingSnippets: SearchSnippet[] = [];
      let maxContentScore = 0;

      for (const item of group.items) {
        const textLower = item.e.toLowerCase();
        if (textLower.includes(needle)) {
          const isHeading = item.b === "heading";
          const contentScore = isHeading ? 45 : 20;
          if (contentScore > maxContentScore) maxContentScore = contentScore;

          matchingSnippets.push({
            anchor: item.a,
            headingPath: item.p.slice(1),
            text: extractSnippet(item.e, needle),
            isHeading,
          });
        }
      }

      if (isTitleMatch || matchingSnippets.length > 0) {
        const finalScore = Math.max(titleScore, maxContentScore) + Math.min(matchingSnippets.length * 2, 10);
        groupedList.push({
          pageId: group.pageId,
          pageTitle: group.pageTitle,
          sectionPath: group.sectionPath,
          href: group.route,
          isTitleMatch,
          score: finalScore,
          snippets: matchingSnippets,
          totalMatches: matchingSnippets.length + (isTitleMatch ? 1 : 0),
        });
      }
    }

    groupedList.sort((a, b) => b.score - a.score);
    setResults(groupedList.slice(0, 30));
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

  const totalMatchesCount = results.reduce((acc, curr) => acc + curr.totalMatches, 0);

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
            结果会按文档聚合显示匹配的章节、原文段落与精确位置。
          </p>
        </section>
      ) : null}

      {submittedQuery ? (
        <p className="py-s5 text-caption text-muted">
          {pending
            ? "搜索中…"
            : results.length === 0
            ? "未找到相关文档"
            : `找到 ${results.length} 篇相关文档（共 ${totalMatchesCount} 处匹配）`}
        </p>
      ) : null}

      {results.map((result) => (
        <SearchResultItem key={result.pageId} result={result} query={submittedQuery} />
      ))}

      {submittedQuery && !pending && results.length === 0 ? (
        <p className="border-y border-line py-s5 font-body text-label leading-body text-muted">
          没有找到匹配内容。可以尝试更短或更具体的关键词。
        </p>
      ) : null}
    </>
  );
}
