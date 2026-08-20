// 组件：全站吸顶 Header 导航栏原语 (AppHeader)，支持首页与文档阅读器双模式
"use client";

import { ArrowLeft, Search } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
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
  breadcrumb?: string;
  sectionTitle?: string;
  sectionTree?: PageTreeNode[];
  allSections?: SectionSummary[];
  currentPageId?: string;
  variant?: "home" | "doc";
  hideSearchAction?: boolean;
};

export function AppHeader({
  title = "此间",
  backHref,
  breadcrumb,
  sectionTitle,
  sectionTree,
  allSections,
  currentPageId,
  variant = backHref ? "doc" : "home",
  hideSearchAction = false,
}: AppHeaderProps) {
  const { openSearch } = useSearch();

  return (
    <header className="sticky top-0 z-header flex min-h-tap items-center justify-between border-b border-line bg-surface/95 px-s4 py-s2 backdrop-blur-md">
      {variant === "home" ? (
        <>
          {/* 首页模式：左侧品牌标题（带小家园吉祥物图标），右侧目录与搜索 */}
          <Link
            href="/"
            className="flex items-center gap-s2 text-body-large font-semibold text-ink tracking-tight hover:opacity-80 transition-opacity group"
          >
            <Image
              src="/icon.svg"
              alt="此间"
              width={26}
              height={26}
              className="size-[26px] shrink-0 rounded-round group-hover:scale-105 transition-transform"
              priority
            />
            <span>{title}</span>
          </Link>

          <div className="flex items-center gap-s1">
            <PageTreeDrawer allSections={allSections} />
            {!hideSearchAction ? (
              <button
                type="button"
                onClick={() => openSearch()}
                className="focus-ring tap-target grid place-items-center rounded-round text-ink hover:bg-surface-subtle"
                aria-label="全屏搜索"
              >
                <Search className="size-icon" strokeWidth={1.9} />
              </button>
            ) : null}
          </div>
        </>
      ) : (
        <>
          {/* 阅读器模式：左返回、中进度与大标题、右抽屉与搜索 */}
          <Link
            href={backHref || "/"}
            className="focus-ring tap-target grid place-items-center rounded-round text-ink hover:bg-surface-subtle"
            aria-label="返回首页"
          >
            <ArrowLeft className="size-icon" strokeWidth={1.9} />
          </Link>

          <div className="flex-1 min-w-0 px-s2 text-center">
            {breadcrumb && <div className="text-caption leading-tight text-muted truncate">{breadcrumb}</div>}
            <strong className="block text-label font-semibold text-ink truncate leading-tight mt-s1">{title}</strong>
          </div>

          <div className="flex items-center gap-s1">
            <PageTreeDrawer
              sectionTitle={sectionTitle}
              currentPageId={currentPageId}
              nodes={sectionTree}
              allSections={allSections}
            />
            {!hideSearchAction ? (
              <button
                type="button"
                onClick={() => openSearch()}
                className="focus-ring tap-target grid place-items-center rounded-round text-ink hover:bg-surface-subtle"
                aria-label="搜索手册"
              >
                <Search className="size-icon" strokeWidth={1.9} />
              </button>
            ) : null}
          </div>
        </>
      )}
    </header>
  );
}
