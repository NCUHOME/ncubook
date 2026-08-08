// 组件：站内关联页面导航卡片，展示文档图标、关联标题与右侧跳转箭头
import { ChevronRight, FileText } from "lucide-react";
import Link from "next/link";
import type { Block } from "@/lib/content/schema";
import { RichText } from "@/src/components/article/blocks/richtext";

export function PageLinkBlock({ block, href, resolvePageRoute }: { block: Extract<Block, { type: "page-link" }>; href: string; resolvePageRoute: (pageId: string) => string }) {
  return (
    <Link id={block.anchor} href={href} className="focus-ring flex items-center justify-between border border-line p-s4 font-body text-label leading-ui hover:bg-surface-subtle">
      <div className="flex items-center gap-s3">
        <FileText className="size-icon text-muted" strokeWidth={1.9} />
        <div>
          <p className="font-semibold text-ink"><RichText value={block.richText} resolvePageRoute={resolvePageRoute} /></p>
        </div>
      </div>
      <ChevronRight className="size-icon-small text-muted" strokeWidth={1.9} />
    </Link>
  );
}
