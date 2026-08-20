// 组件：双层板块目录抽屉原语 (PageTreeDrawer)，完全对齐原型图规范（支持单篇文章板块展开与有序篇目分组）
"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowLeft, ChevronRight, Menu, X } from "lucide-react";
import Link from "next/link";
import type { PageTreeNode } from "@/lib/content/server";
import { groupAndSortSectionNodes } from "@/lib/content/groups";

export type SectionSummary = {
  id: string;
  title: string;
  slug: string;
  count?: number;
  tree?: PageTreeNode[];
};

type PageTreeDrawerProps = {
  sectionTitle?: string;
  currentPageId?: string;
  nodes?: PageTreeNode[];
  allSections?: SectionSummary[];
  initialMode?: "sections" | "tree";
};

export function PageTreeDrawer({
  sectionTitle = "目录",
  currentPageId,
  nodes = [],
  allSections = [],
  initialMode = nodes.length > 0 ? "tree" : "sections",
}: PageTreeDrawerProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"sections" | "tree">(initialMode);
  const [activeSection, setActiveSection] = useState<{ title: string; nodes: PageTreeNode[]; slug: string } | null>(
    nodes.length > 0 ? { title: sectionTitle, nodes, slug: "" } : null,
  );

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      if (nodes.length > 0) {
        setMode("tree");
        setActiveSection({ title: sectionTitle, nodes, slug: "" });
      } else {
        setMode("sections");
      }
    }
  };

  const handleSelectSection = (sec: SectionSummary) => {
    // 无论是多篇树还是单篇板块，均构造有效节点以确保 100% 能够进入 Mode 2 目录树
    const effectiveNodes: PageTreeNode[] =
      sec.tree && sec.tree.length > 0
        ? sec.tree
        : [
            {
              id: sec.id,
              title: sec.title,
              href: `/docs/${sec.slug}`,
              children: [],
            },
          ];

    setActiveSection({ title: sec.title, nodes: effectiveNodes, slug: sec.slug });
    setMode("tree");
  };

  // 聚类渲染板块内的篇目分组树
  const renderGroupedTree = (section: { title: string; nodes: PageTreeNode[] }) => {
    const buckets = groupAndSortSectionNodes(section.title, section.nodes);

    return buckets.map((bucket, bIdx) => (
      <div key={bucket.groupName || `bucket-${bIdx}`} className="space-y-s1">
        {bucket.groupName && (
          <div className="pt-s3 pb-s1 text-caption font-semibold tracking-widest text-brand">
            {bucket.groupName}
          </div>
        )}
        <div className="space-y-s1">
          {bucket.nodes.map((node) => {
            const current = node.id === currentPageId;
            return (
              <div key={node.id}>
                <Link
                  href={node.href}
                  onClick={() => setOpen(false)}
                  aria-current={current ? "page" : undefined}
                  className={`focus-ring flex min-h-tap items-center justify-between ml-s1 px-s3 py-s2 border-l-2 text-body transition-colors rounded-r-small ${
                    current
                      ? "border-brand bg-brand-tint font-semibold text-brand"
                      : "border-line text-ink-body hover:bg-surface-subtle"
                  }`}
                >
                  <span className="truncate leading-body">{node.title}</span>
                  {node.children.length > 0 ? <ChevronRight className="size-icon-small text-muted shrink-0" /> : null}
                </Link>
                {node.children.length > 0 && (
                  <div className="pl-s3 space-y-s1">
                    {node.children.map((child) => {
                      const childCurrent = child.id === currentPageId;
                      return (
                        <Link
                          key={child.id}
                          href={child.href}
                          onClick={() => setOpen(false)}
                          aria-current={childCurrent ? "page" : undefined}
                          className={`focus-ring flex min-h-tap items-center justify-between ml-s1 px-s3 py-s2 border-l-2 text-body transition-colors rounded-r-small ${
                            childCurrent
                              ? "border-brand bg-brand-tint font-semibold text-brand"
                              : "border-line text-ink-body hover:bg-surface-subtle"
                          }`}
                        >
                          <span className="truncate leading-body">{child.title}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    ));
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="focus-ring tap-target grid place-items-center rounded-round text-ink hover:bg-surface-subtle"
          aria-label={sectionTitle ? `打开${sectionTitle}页面列表` : "打开目录抽屉"}
        >
          <Menu className="size-icon" strokeWidth={1.9} />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-drawer bg-ink/45 backdrop-blur-[2px] animate-in fade-in duration-fast" />
        <Dialog.Content
          className="fixed inset-y-0 left-0 z-modal flex w-5/6 max-w-xs flex-col bg-surface shadow-side focus:outline-none animate-in slide-in-from-left duration-fast"
          aria-describedby={undefined}
        >
          <Dialog.Title className="sr-only">{sectionTitle ? `${sectionTitle}页面列表` : "板块目录导航"}</Dialog.Title>

          {/* 抽屉顶部栏 */}
          <div className="flex min-h-tap items-center justify-between border-b border-line px-s4 py-s3">
            <div>
              <span className="text-caption leading-tight text-muted">目录导航</span>
              <Link
                href="/"
                onClick={() => setOpen(false)}
                className="block text-body font-semibold text-ink hover:text-brand transition-colors"
              >
                此间 · 回到首页
              </Link>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="focus-ring tap-target grid place-items-center rounded-round text-muted hover:text-ink"
                aria-label="关闭目录"
              >
                <X className="size-icon" strokeWidth={1.9} />
              </button>
            </Dialog.Close>
          </div>

          {/* 抽屉动态内容区 */}
          <div className="flex-1 overflow-y-auto px-s4 py-s3">
            {/* Mode 1: 全部板块列表 */}
            {mode === "sections" && (
              <div className="divide-y divide-line">
                {allSections.map((sec) => (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => handleSelectSection(sec)}
                    className="focus-ring flex w-full min-h-tap items-center justify-between py-s3 text-left hover:text-brand transition-colors"
                  >
                    <span className="text-body font-semibold text-ink">{sec.title}</span>
                    <div className="flex items-center gap-s1 text-muted text-caption">
                      {sec.count ? <span>{sec.count} 篇</span> : null}
                      <ChevronRight className="size-icon-small" />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Mode 2: 板块内篇目树 (完全对齐原型图样式) */}
            {mode === "tree" && activeSection && (
              <div className="space-y-s2">
                {allSections.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setMode("sections")}
                    className="focus-ring flex items-center gap-s1 text-caption font-medium text-brand hover:underline pb-s2"
                  >
                    <ArrowLeft className="size-icon-small" />
                    <span>全部板块</span>
                  </button>
                )}

                <div className="flex items-baseline justify-between border-b border-line pb-s2">
                  <div className="flex items-baseline gap-s2">
                    <strong className="text-title font-semibold text-ink">{activeSection.title}</strong>
                    <span className="text-caption text-muted">{activeSection.nodes.length} 篇</span>
                  </div>
                  {activeSection.nodes[0] && (
                    <Link
                      href={activeSection.nodes[0].href}
                      onClick={() => setOpen(false)}
                      className="text-caption font-medium text-brand hover:underline"
                    >
                      从头读
                    </Link>
                  )}
                </div>

                <nav className="space-y-s2 py-s2" aria-label={`${activeSection.title}篇目树`}>
                  {renderGroupedTree(activeSection)}
                </nav>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
