// 组件：全屏即搜即显抽屉 (SearchOverlay)，支持快捷 Chips 过滤、实时分词与高亮跳转
"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Search, X } from "lucide-react";
import Link from "next/link";
import { trackEvent } from "@/lib/analytics/client";

const DEFAULT_CHIPS = ["校内出行", "防诈指南", "保卫电话", "GPA 绩点", "通识选课", "转专业"];

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
            setResults(res.items);
            trackEvent("search_query", { query: trimmed, resultCount: res.items.length, source: "overlay" });
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

  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) return text;
    const parts = text.split(new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === highlight.toLowerCase() ? (
        <mark key={i} className="rounded-small bg-brand-subtle text-brand font-semibold px-s1">
          {part}
        </mark>
      ) : (
        part
      ),
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="全屏搜索手册"
      className="fixed inset-0 z-search flex flex-col bg-surface animate-in fade-in slide-in-from-right duration-fast"
    >
      {/* 顶部搜索框栏 */}
      <div className="flex min-h-tap items-center gap-s2 border-b border-line px-s3 py-s2">
        <button
          type="button"
          onClick={onClose}
          className="focus-ring tap-target grid place-items-center rounded-round text-ink hover:bg-surface-subtle"
          aria-label="关闭搜索"
        >
          <ArrowLeft className="size-icon" strokeWidth={1.9} />
        </button>

        <div className="relative flex-1 flex items-center">
          <Search className="absolute left-s3 size-icon-small text-muted pointer-events-none" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索手册（如：出行、绩点、报修...）"
            className="focus-ring w-full h-10 rounded-medium border border-line bg-surface-subtle pl-s6 pr-s6 text-body text-ink placeholder:text-muted"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-s2 tap-target grid place-items-center rounded-round text-muted hover:text-ink"
              aria-label="清空输入"
            >
              <X className="size-icon-small" />
            </button>
          )}
        </div>
      </div>

      {/* 快捷搜索 Chips 标签行 */}
      <div className="flex items-center gap-s2 overflow-x-auto border-b border-line bg-surface-subtle px-s4 py-s2 no-scrollbar">
        {DEFAULT_CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => setQuery(chip)}
            className="focus-ring shrink-0 rounded-pill border border-line bg-surface px-s3 py-1 text-caption text-ink hover:border-brand hover:text-brand transition-colors"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* 搜索结果列表区 */}
      <div className="flex-1 overflow-y-auto px-s5 py-s4">
        {loading && <p className="text-caption text-muted py-s3 text-center">正在极速检索校园指南...</p>}

        {!loading && !query.trim() && (
          <p className="text-caption text-muted py-s3 text-center">输入关键词实时检索校园指南文章与具体段落...</p>
        )}

        {!loading && query.trim() && results.length === 0 && (
          <div className="py-s7 text-center">
            <p className="text-body text-muted">未找到与「{query}」相关的篇目或段落</p>
            <p className="mt-s2 text-caption text-muted">试试换个关键词，或向右下角小家园直接提问</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="space-y-s4">
            <p className="text-caption text-muted">
              「{query}」· 找到 {results.length} 条匹配结果
            </p>
            <div className="divide-y divide-line border-t border-line">
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
                  className="focus-ring block py-s3 hover:bg-surface-subtle transition-colors"
                >
                  <div className="text-body font-semibold text-ink">
                    {highlightText(item.pageTitle, query)}
                  </div>
                  {item.snippet && (
                    <p className="mt-s1 text-caption leading-ui text-muted line-clamp-2">
                      {highlightText(item.snippet, query)}
                    </p>
                  )}
                  {item.sectionPath && (
                    <span className="mt-s1 inline-block text-caption text-brand">
                      {item.sectionPath} · 点击阅读 ↗
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
