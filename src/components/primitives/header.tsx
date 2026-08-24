// 组件：全站吸顶 Header 导航栏原语 (AppHeader)，支持首页与文档阅读器双模式
"use client";

import { ArrowLeft, Search } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { PageTreeNode } from "@/lib/content/server";
import { useSearch } from "@/src/components/search/search-provider";
import type { SectionSummary } from "@/src/components/primitives/drawer";

const PageTreeDrawer = dynamic(
  () => import("@/src/components/primitives/drawer").then((mod) => mod.PageTreeDrawer),
  { ssr: false },
);

type AppHeaderProps = {
  title?: string;
  backHref?: string;
  sectionTitle?: string;
  sectionTree?: PageTreeNode[];
  allSections?: SectionSummary[];
  currentPageId?: string;
  variant?: "home" | "doc" | "search";
  hideSearchAction?: boolean;
  progress?: number;
};

export function AppHeader({
  title = "此间",
  backHref,
  sectionTitle,
  sectionTree,
  allSections,
  currentPageId,
  variant = backHref ? "search" : "home",
  hideSearchAction = false,
  progress,
}: AppHeaderProps) {
  const { openSearch } = useSearch();

  return (
    <header className="header-glass sticky top-0 z-header border-b border-line font-sans">
      {variant === "home" ? (
        <div className="flex min-h-header items-center justify-between pl-s5 pr-s3">
          <Link href="/" className="text-ui-title font-semibold text-ink">
            {title}
          </Link>

          <div className="gap-hairline flex items-center">
            {!hideSearchAction ? (
              <button
                type="button"
                onClick={() => openSearch()}
                className="focus-ring h-header-action w-header-action grid place-items-center text-ink"
                aria-label="全屏搜索"
              >
                <Search className="size-icon" strokeWidth={1.7} />
              </button>
            ) : null}
            <PageTreeDrawer allSections={allSections} />
          </div>
        </div>
      ) : variant === "search" ? (
        <div className="flex min-h-header items-center gap-s1 pl-s2 pr-s3">
          <Link
            href={backHref || "/"}
            className="focus-ring h-header-action w-header-action grid place-items-center text-ink"
            aria-label="返回首页"
          >
            <ArrowLeft className="size-icon" strokeWidth={1.7} />
          </Link>
          <strong className="text-body font-semibold text-ink">{title}</strong>
        </div>
      ) : (
        <>
          <div className="flex min-h-header items-center gap-s1 pl-s2 pr-s3">
            <PageTreeDrawer
              sectionTitle={sectionTitle}
              currentPageId={currentPageId}
              nodes={sectionTree}
              allSections={allSections}
            />
            <div className="min-w-0 flex-1">
              <strong className="block truncate text-label font-semibold leading-tight text-ink">{title}</strong>
            </div>
            {!hideSearchAction ? (
              <button
                type="button"
                onClick={() => openSearch()}
                className="focus-ring h-header-action w-doc-search-action grid place-items-center text-ink"
                aria-label="搜索手册"
              >
                <Search className="size-icon" strokeWidth={1.7} />
              </button>
            ) : null}
          </div>
          <div className="h-0.5 bg-action-subtle">
            <div className="h-full bg-ink" style={{ width: `${Math.max(0, Math.min(100, progress ?? 0))}%` }} />
          </div>
        </>
      )}
    </header>
  );
}
