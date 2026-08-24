// 组件：全屏即搜即显抽屉 (SearchOverlay)，支持快捷 Chips 过滤、实时分词与高亮跳转
"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import Link from "next/link";
import { trackEvent } from "@/lib/analytics/client";

type SearchItem = {
  pageId: string;
  pageTitle: string;
  sectionPath?: string;
  routePath: string;
  anchor?: string;
  plainText: string;
  snippet?: string;
};

export function SearchOverlay({
  initialQuery = "",
  onClose,
}: {
  initialQuery?: string;
  onClose: () => void;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(trimmed)}`)
        .then((res) => res.json())
        .then((res) => {
          if (Array.isArray(res.items)) {
            const unique = Array.from(new Map<SearchItem["pageId"], SearchItem>(res.items.map((item: SearchItem) => [item.pageId, item])).values());
            setResults(unique);
            trackEvent("search_query", { query: trimmed, resultCount: unique.length, source: "overlay" });
          } else {
            setResults([]);
            trackEvent("search_query", { query: trimmed, resultCount: 0, source: "overlay" });
          }
        })
        .catch(() => {
          setResults([]);
          trackEvent("search_query", { query: trimmed, resultCount: 0, source: "overlay" });
        })
        .finally(() => setLoading(false));
    }, 180);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="全屏搜索手册"
      className="fixed inset-y-0 left-1/2 z-search flex w-full max-w-shell -translate-x-1/2 flex-col bg-surface font-body animate-in fade-in slide-in-from-right duration-fast"
    >
      <div className="flex min-h-header items-center gap-s1 border-b border-line pl-s2 pr-s3 font-sans">
        <button
          type="button"
          onClick={onClose}
          className="focus-ring h-header-action w-header-action grid place-items-center text-ink"
          aria-label="关闭搜索"
        >
          <ArrowLeft className="size-icon" strokeWidth={1.7} />
        </button>
        <strong className="text-body font-semibold text-ink">搜索文档</strong>
      </div>

      <div className="px-s5 pt-hero">
        <div className="flex min-h-header items-center gap-control rounded-medium border border-line-mid px-s3 font-sans">
          <Search className="size-icon-small shrink-0 text-muted" strokeWidth={1.7} />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="关键词"
            className="min-w-0 flex-1 bg-transparent text-body text-ink outline-none placeholder:text-muted"
          />
        </div>
      </div>

      {/* 搜索结果列表区 */}
      <div className="flex-1 overflow-y-auto px-s5">
        {loading && <p className="text-caption text-muted py-s3 text-center">正在极速检索校园指南...</p>}

        {!loading && !query.trim() && (
          <div className="pt-s7">
            <h1 className="text-search-heading font-semibold leading-heading text-ink">输入一个关键词</h1>
            <p className="mt-control text-label leading-body text-ink-sub">结果会按文档聚合，显示匹配的章节、原文段落与精确位置。试试「出行」「绩点」「校园卡」。</p>
          </div>
        )}

        {!loading && query.trim() && results.length === 0 && (
          <div className="pt-s7">
            <p className="text-body leading-relaxed text-ink-sub">手册里还没有和「{query}」相关的内容。</p>
            <p className="mt-control text-label leading-relaxed text-muted">知道答案的话，欢迎通过首页「完善手册」投稿。</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="pt-footer">
            <p className="pb-s1 font-sans text-caption text-muted">
              「{query}」· {results.length} 篇匹配
            </p>
            <div>
              {results.map((item, idx) => (
                <Link
                  key={`${item.pageId}-${item.anchor || idx}`}
                  href={`${item.routePath}${item.anchor ? `#${item.anchor}` : ""}`}
                  onClick={() => {
                    trackEvent("search_result_click", {
                      query,
                      clickedSlug: item.pageId,
                      clickedTitle: item.pageTitle,
                      rankIndex: idx + 1,
                    });
                    onClose();
                  }}
                  className="focus-ring flex items-baseline gap-control border-t border-line py-s3 text-ink"
                >
                  <div className="min-w-0 flex-1 text-body font-semibold text-ink">
                    {item.pageTitle}
                  </div>
                  {item.sectionPath && (
                    <span className="shrink-0 font-sans text-caption text-muted">
                      {item.sectionPath}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
