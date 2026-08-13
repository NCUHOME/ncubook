// 组件：站内关联页面导航卡片，展示文档图标、关联标题与右侧跳转箭头
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { Block } from "@/lib/content/schema";
import { RichText } from "@/src/components/article/blocks/richtext";

export function PageLinkBlock({ block, href, resolvePageRoute }: { block: Extract<Block, { type: "page-link" }>; href: string; resolvePageRoute: (pageId: string) => string }) {
  return (
    <Link
      id={block.anchor}
      href={href}
      className="focus-ring flex min-h-tap items-center justify-between border-b border-line py-s3 font-body text-body leading-body hover:bg-surface-subtle transition-colors"
    >
      <span className="font-medium text-ink">
        <RichText value={block.richText} resolvePageRoute={resolvePageRoute} />
      </span>
      <ChevronRight className="size-icon-small text-muted flex-shrink-0" strokeWidth={1.9} />
    </Link>
  );
}
