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
      className="focus-ring flex min-h-tap items-center justify-between border-b border-line py-s3 font-body text-body leading-body hover:bg-brand-tint/40 transition-colors group"
    >
      <span className="font-medium text-brand group-hover:underline" style={{ color: "var(--brand-blue)" }}>
        <RichText value={block.richText} resolvePageRoute={resolvePageRoute} />
      </span>
      <ChevronRight className="size-icon-small text-brand flex-shrink-0 group-hover:translate-x-0.5 transition-transform" strokeWidth={1.9} />
    </Link>
  );
}
