// 组件：文档级聚合搜索结果条目卡片 (Grouped Search Result Item)，呈现所属板块、页面标题、精准章节片段与高亮锚点跳转
"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
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

      {/* 场景 A：纯标题命中，正文无匹配 */}
      {result.snippets.length === 0 ? (
        <div className="mt-s3">
          <p className="font-body text-label leading-body text-muted">
            匹配文档标题《<HighlightedText text={result.pageTitle} query={query} />》
          </p>
          <Link
            href={result.href}
            className="focus-ring mt-s3 inline-flex min-h-tap items-center text-caption underline underline-offset-4 text-ink"
          >
            阅读完整文档 →
          </Link>
        </div>
      ) : null}

      {/* 场景 B：正文/章节有精准匹配片段 */}
      {result.snippets.length > 0 ? (
        <div className="mt-s3 space-y-s4">
          {visibleSnippets.map((snippet, index) => {
            const sectionName = snippet.headingPath.at(-1) ?? result.pageTitle;
            const snippetHref = snippet.anchor ? `${result.href}#${snippet.anchor}` : result.href;

            return (
              <div key={`${snippet.anchor}-${index}`} className="border-l-2 border-line pl-s3">
                {snippet.headingPath.length > 0 ? (
                  <p className="text-caption font-medium text-muted">{snippet.headingPath.join(" / ")}</p>
                ) : null}
                <p className="mt-s1 font-body text-label leading-body text-ink">
                  <HighlightedText text={snippet.text} query={query} />
                </p>
                <Link
                  href={snippetHref}
                  className="focus-ring mt-s2 inline-flex min-h-tap items-center text-caption underline underline-offset-4 text-ink"
                >
                  跳到“{sectionName}”
                </Link>
              </div>
            );
          })}

          {/* 折叠/展开更多匹配片段 */}
          {hiddenCount > 0 ? (
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="focus-ring inline-flex min-h-tap items-center gap-s1 text-caption font-medium text-muted hover:text-ink"
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
