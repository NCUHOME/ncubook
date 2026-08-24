// 组件：交互式关键词搜索容器，支持前端 5ms 零延迟打字即搜 (Instant Search as you type) 与文档级聚合展示
"use client";

import { Search } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { cleanHeadingPunctuation, extractSnippet, type GroupedSearchResult, type SearchSnippet } from "@/lib/content/search";
import type { CompactSearchItem } from "@/app/api/search/index/route";
import Link from "next/link";

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
      const existing = pageMap.get(item.pid);
      let group = existing;
      if (!group) {
        const firstSection = item.p[0];
        const topSection = firstSection ? [firstSection] : ["综合指南"];
        group = {
          pageId: item.pid,
          pageTitle: item.t,
          sectionPath: topSection,
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
            headingPath: item.p.slice(1).map(cleanHeadingPunctuation),
            text: extractSnippet(item.e, needle),
            isHeading,
          });
        }
      }

      if (isTitleMatch || matchingSnippets.length > 0) {
        const finalScore = Math.max(titleScore, maxContentScore) + Math.min(matchingSnippets.length * 2, 10);
        const totalMatches = matchingSnippets.length + (isTitleMatch ? 1 : 0);

        groupedList.push({
          pageId: group.pageId,
          pageTitle: group.pageTitle,
          sectionPath: group.sectionPath,
          href: group.route,
          isTitleMatch,
          score: finalScore,
          snippets: matchingSnippets,
          totalMatches,
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

  return (
    <>
      <form action="/search" method="get" onSubmit={handleSubmit}>
        <label htmlFor="keyword-search" className="sr-only">
          关键词
        </label>
        <div className="flex min-h-header items-center gap-control rounded-medium border border-line-mid px-s3">
          <Search className="size-icon-small text-muted" strokeWidth={1.7} />
          <input
            id="keyword-search"
            name="q"
            value={value}
            onChange={(event) => handleInputChange(event.target.value)}
            autoFocus
            className="min-w-0 flex-1 bg-transparent font-sans text-body text-ink outline-none placeholder:text-muted"
            placeholder="关键词"
            autoComplete="off"
          />
        </div>
      </form>

      {!submittedQuery ? (
        <section className="pt-s7">
          <h1 className="font-display text-search-heading font-semibold leading-heading">输入一个关键词</h1>
          <p className="mt-control font-body text-label leading-relaxed text-ink-sub">
            结果会按文档聚合，显示匹配的章节、原文段落与精确位置。试试「出行」「绩点」「校园卡」。
          </p>
        </section>
      ) : null}

      {submittedQuery && (pending || results.length > 0) ? (
        <section className="pt-footer">
          <p className="mb-s1 font-sans text-caption text-muted">
            {pending ? "搜索中…" : `「${submittedQuery}」· ${results.length} 篇匹配`}
          </p>
          {!pending && results.map((result) => (
            <Link
              key={result.pageId}
              href={result.href}
              className="focus-ring border-soft flex items-baseline gap-control border-t py-s3 text-ink"
            >
              <span className="min-w-0 flex-1 text-body font-semibold text-ink">{result.pageTitle}</span>
              <span className="shrink-0 font-sans text-caption text-muted">{result.sectionPath[0]}</span>
            </Link>
          ))}
        </section>
      ) : null}

      {submittedQuery && !pending && results.length === 0 ? (
        <div className="pt-s7">
          <p className="font-body text-body leading-relaxed text-ink-sub">
            手册里还没有和「{submittedQuery}」相关的内容。
          </p>
          <p className="mt-control font-body text-label leading-relaxed text-muted">
            知道答案的话，欢迎通过首页「完善手册」投稿。
          </p>
        </div>
      ) : null}
    </>
  );
}
