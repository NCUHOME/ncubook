// 组件：文档级聚合搜索结果条目卡片 (Grouped Search Result Item)，采用 iOS 分组轻底色 (Grouped Inset Surface) 方案
"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, ChevronRight, ChevronUp } from "lucide-react";
import type { GroupedSearchResult } from "@/lib/content/search";

export function SearchResultItem({ result, query }: { result: GroupedSearchResult; query: string }) {
  const [expanded, setExpanded] = useState(false);
  const visibleSnippets = expanded ? result.snippets : result.snippets.slice(0, 2);
  const hiddenCount = result.snippets.length - 2;

  return (
    <article className="border-b border-line py-s5">
      {/* 顶部板块面包屑 */}
      {result.sectionPath.length > 0 ? (
        <p className="text-caption leading-ui text-muted">{result.sectionPath.join(" / ")}</p>
      ) : null}

      {/* 文档主标题 */}
      <h2 className="mt-s1 text-body-large leading-heading font-semibold text-ink">
        <Link href={result.href} className="focus-ring hover:underline">
          <HighlightedText text={result.pageTitle} query={query} />
        </Link>
      </h2>

      {/* 场景 A：纯标题命中的文档直达轻底色大卡片（无生硬子断片） */}
      {result.snippets.length === 0 ? (
        <Link
          href={result.href}
          className="focus-ring tap-target group mt-s3 flex items-center justify-between rounded-medium bg-surface-subtle p-s4 transition-colors hover:bg-surface-muted active:bg-surface-muted"
        >
          <div className="min-w-0 flex-1">
            <span className="rounded-round bg-action-subtle px-s2 py-0.5 text-caption font-medium text-ink">
              页面直达
            </span>
            <p className="mt-s2 font-body text-label leading-body text-ink">
              阅读《<HighlightedText text={result.pageTitle} query={query} />》完整章节与通讯录内容
            </p>
          </div>
          <ChevronRight className="size-icon-small text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-ink flex-shrink-0" />
        </Link>
      ) : null}

      {/* 场景 B：正文/章节有精准匹配片段（iOS 分组轻底色容器，无沉重外框） */}
      {result.snippets.length > 0 ? (
        <div className="mt-s3">
          <div className="overflow-hidden rounded-medium bg-surface-subtle divide-y divide-line">
            {visibleSnippets.map((snippet, index) => {
              const snippetHref = snippet.anchor ? `${result.href}#${snippet.anchor}` : result.href;

              return (
                <Link
                  key={`${snippet.anchor}-${index}`}
                  href={snippetHref}
                  className="focus-ring tap-target group block p-s3 transition-colors hover:bg-surface-muted active:bg-surface-muted"
                >
                  <div className="flex items-start justify-between gap-s2">
                    <div className="min-w-0 flex-1">
                      {snippet.headingPath.length > 0 ? (
                        <p className="text-caption font-medium text-muted truncate">
                          {snippet.headingPath.join(" / ")}
                        </p>
                      ) : null}
                      <p className="mt-s1 font-body text-label leading-body text-ink line-clamp-3">
                        <HighlightedText text={snippet.text} query={query} />
                      </p>
                    </div>
                    <ChevronRight className="size-icon-small text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-ink flex-shrink-0 mt-s1" />
                  </div>
                </Link>
              );
            })}
          </div>

          {/* 折叠/展开更多匹配片段 */}
          {hiddenCount > 0 ? (
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="focus-ring mt-s2 inline-flex min-h-tap items-center gap-s1 text-caption font-medium text-muted hover:text-ink"
            >
              {expanded ? (
                <>
                  收起该文档匹配 <ChevronUp className="size-icon-small" />
                </>
              ) : (
                <>
                  查看该文档其余 {hiddenCount} 处匹配 <ChevronDown className="size-icon-small" />
                </>
              )}
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  const needle = query.trim();
  if (!needle) return <>{text}</>;

  const parts = text.split(new RegExp(`(${escapeRegExp(needle)})`, "gi"));
  return (
    <>
      {parts.map((part, index) =>
        part.toLocaleLowerCase("zh-CN") === needle.toLocaleLowerCase("zh-CN") ? (
          <mark className="bg-action-subtle font-semibold text-ink" key={index}>
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </>
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
