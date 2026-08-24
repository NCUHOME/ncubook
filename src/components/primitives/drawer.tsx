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
      <div key={bucket.groupName || `bucket-${bIdx}`}>
        {bucket.groupName && (
          <div className="pb-hairline text-drawer-group tracking-drawer-group px-control pt-s3 font-semibold text-brand">
            {bucket.groupName}
          </div>
        )}
        <div>
          {bucket.nodes.map((node) => {
            const current = node.id === currentPageId;
            return (
              <div key={node.id}>
                <Link
                  href={node.href}
                  onClick={() => setOpen(false)}
                  aria-current={current ? "page" : undefined}
                  className={`focus-ring ml-compact flex min-h-drawer-row items-center justify-between border-l px-control text-small leading-ui transition-colors ${
                    current
                      ? "border-brand bg-brand-tint font-semibold text-brand"
                      : "border-line text-ink-body hover:bg-surface-subtle"
                  }`}
                >
                  <span className="truncate leading-body">{node.title}</span>
                  {node.children.length > 0 ? <ChevronRight className="size-icon-small shrink-0 text-muted" /> : null}
                </Link>
                {node.children.length > 0 && (
                  <div>
                    {node.children.map((child) => {
                      const childCurrent = child.id === currentPageId;
                      return (
                        <Link
                          key={child.id}
                          href={child.href}
                          onClick={() => setOpen(false)}
                          aria-current={childCurrent ? "page" : undefined}
                          className={`focus-ring ml-compact flex min-h-drawer-row items-center justify-between border-l px-control text-small leading-ui transition-colors ${
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
          className="focus-ring h-header-action w-header-action grid place-items-center text-ink"
          aria-label={sectionTitle ? `打开${sectionTitle}页面列表` : "打开目录抽屉"}
        >
          {nodes.length > 0 ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <line x1="4" x2="20" y1="7" y2="7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              <line x1="4" x2="14" y1="12" y2="12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              <line x1="4" x2="18" y1="17" y2="17" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          ) : (
            <Menu className="size-icon" strokeWidth={1.7} />
          )}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="shell-fixed-overlay fixed inset-y-0 z-drawer bg-overlay animate-in fade-in duration-fast" />
        <Dialog.Content
          className="shell-fixed-left fixed inset-y-0 z-side-drawer flex w-drawer max-w-drawer flex-col bg-surface font-sans shadow-side focus:outline-none animate-in slide-in-from-left duration-fast"
          aria-describedby={undefined}
        >
          <Dialog.Title className="sr-only">{sectionTitle ? `${sectionTitle}页面列表` : "板块目录导航"}</Dialog.Title>

          {/* 抽屉顶部栏 */}
          <div className="flex min-h-drawer-header items-center gap-s2 border-b border-line pl-s5 pr-compact">
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="flex-1 text-body font-semibold text-ink"
            >
              此间 · 回到首页
            </Link>
            <Dialog.Close asChild>
              <button
                type="button"
                className="tap-target grid place-items-center text-ink focus:outline-none"
                aria-label="关闭目录"
              >
                <X className="size-icon-close" strokeWidth={1.7} />
              </button>
            </Dialog.Close>
          </div>

          {/* 抽屉动态内容区 */}
          <div className="flex-1 overflow-y-auto px-control pb-s5 pt-compact">
            {/* Mode 1: 全部板块列表 */}
            {mode === "sections" && (
              <div>
                {allSections.map((sec) => (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => handleSelectSection(sec)}
                    className="focus-ring flex min-h-header w-full items-center gap-s2 rounded-medium px-control text-left font-semibold text-ink"
                  >
                    <span className="flex-1 text-body">{sec.title}</span>
                    <ChevronRight className="size-icon-drawer text-light" />
                  </button>
                ))}
              </div>
            )}

            {/* Mode 2: 板块内篇目树 (完全对齐原型图样式) */}
            {mode === "tree" && activeSection && (
              <div>
                {allSections.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setMode("sections")}
                    className="focus-ring flex min-h-tap items-center gap-compact px-control text-small text-muted"
                  >
                    <ArrowLeft className="size-icon-drawer" strokeWidth={1.7} />
                    <span>全部板块</span>
                  </button>
                )}

                <div className="flex items-baseline gap-s2 px-control pb-s1 pt-s1">
                  <strong className="text-sheet-title font-semibold text-ink">{activeSection.title}</strong>
                  {activeSection.nodes[0] && (
                    <Link
                      href={activeSection.nodes[0].href}
                      onClick={() => setOpen(false)}
                      className="text-contact-label ml-auto text-brand"
                    >
                      从头读
                    </Link>
                  )}
                </div>

                <nav aria-label={`${activeSection.title}篇目树`}>
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
