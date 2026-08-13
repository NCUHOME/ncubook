// 组件：全站吸顶 Header 导航栏原语 (AppHeader)，包含返回按钮、PageTreeDrawer 板块抽屉触发按钮、标题与搜索页入口
"use client";

import { ArrowLeft, Search } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { PageTreeNode } from "@/lib/content/server";

const PageTreeDrawer = dynamic(
  () => import("@/src/components/primitives/drawer").then((mod) => mod.PageTreeDrawer),
  { ssr: false }
);

type AppHeaderProps = {
  title?: string;
  backHref?: string;
  sectionTitle?: string;
  sectionTree?: PageTreeNode[];
  currentPageId?: string;
};

export function AppHeader({
  title = "此间",
  backHref,
  sectionTitle,
  sectionTree,
  currentPageId,
}: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-header flex min-h-tap items-center justify-between border-b border-line bg-surface px-s5 py-s3">
      <div className="flex items-center gap-s2">
        {backHref ? (
          <Link href={backHref} className="focus-ring tap-target grid place-items-center rounded-round border border-line" aria-label="返回">
            <ArrowLeft className="size-icon" strokeWidth={1.9} />
          </Link>
        ) : null}
        {sectionTree && sectionTitle ? (
          <PageTreeDrawer sectionTitle={sectionTitle} currentPageId={currentPageId} nodes={sectionTree} />
        ) : null}
        <strong className="truncate text-title leading-ui font-semibold">{title}</strong>
      </div>
      <Link href="/search" className="focus-ring tap-target grid place-items-center rounded-round border border-line" aria-label="搜索文档">
        <Search className="size-icon" strokeWidth={1.9} />
      </Link>
    </header>
  );
}
