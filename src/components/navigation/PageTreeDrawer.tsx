"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ArrowLeft, ChevronRight, Menu, X } from "lucide-react";
import Link from "next/link";
import type { PageTreeNode } from "@/lib/content/published-repository";

type PageTreeDrawerProps = {
  sectionTitle: string;
  currentPageId?: string;
  nodes: PageTreeNode[];
};

export function PageTreeDrawer({ sectionTitle, currentPageId, nodes }: PageTreeDrawerProps) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="focus-ring tap-target grid place-items-center rounded-round border border-line bg-surface"
          aria-label={`打开${sectionTitle}页面列表`}
        >
          <Menu className="size-icon" strokeWidth={1.9} />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-drawer bg-ink/45" />
        <Dialog.Content
          className="fixed inset-y-0 left-0 z-modal flex w-5/6 max-w-sm flex-col bg-surface shadow-floating focus:outline-none"
          aria-describedby={undefined}
        >
          <Dialog.Title className="sr-only">{sectionTitle}页面列表</Dialog.Title>
          <div className="flex min-h-tap items-center justify-between border-b border-line px-s4 py-s3">
            <Dialog.Close asChild>
              <button type="button" className="focus-ring tap-target grid place-items-center rounded-round border border-line" aria-label="关闭页面列表">
                <ArrowLeft className="size-icon" strokeWidth={1.9} />
              </button>
            </Dialog.Close>
            <Dialog.Close asChild>
              <button type="button" className="focus-ring tap-target grid place-items-center rounded-round" aria-label="关闭">
                <X className="size-icon" strokeWidth={1.9} />
              </button>
            </Dialog.Close>
          </div>
          <div className="border-b border-line px-s5 py-s5">
            <p className="text-caption leading-ui tracking-widest text-muted">当前板块</p>
            <p className="mt-s2 font-display text-heading leading-heading font-semibold">{sectionTitle}</p>
          </div>
          <nav className="flex-1 overflow-y-auto py-s3" aria-label={`${sectionTitle}页面`}>
            {nodes.map((node) => (
              <TreeNode key={node.id} node={node} currentPageId={currentPageId} depth={0} />
            ))}
          </nav>
          <Link href="/" className="focus-ring flex min-h-tap items-center gap-s2 border-t border-line px-s5 text-label text-muted">
            <ArrowLeft className="size-icon-small" strokeWidth={1.9} />
            返回全部校园内容
          </Link>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function TreeNode({ node, currentPageId, depth }: { node: PageTreeNode; currentPageId?: string; depth: number }) {
  const current = node.id === currentPageId;
  return (
    <>
      <Link
        href={node.href}
        aria-current={current ? "page" : undefined}
        className={`focus-ring flex min-h-tap items-center justify-between border-l px-s5 text-label ${
          current ? "border-ink bg-surface-subtle font-semibold" : "border-transparent"
        }`}
        style={{ paddingInlineStart: `calc(var(--space-5) + ${depth} * var(--space-4))` }}
      >
        <span>{node.title}</span>
        {node.children.length > 0 ? <ChevronRight className="size-icon-small text-muted" strokeWidth={1.9} /> : null}
      </Link>
      {node.children.map((child) => (
        <TreeNode key={child.id} node={child} currentPageId={currentPageId} depth={depth + 1} />
      ))}
    </>
  );
}
