// 组件：块级引用 (<blockquote>) 渲染器，带有左侧黑白边框与斜体排版，支持嵌套子块
import type { ReactNode } from "react";
import type { Block } from "@/lib/content/schema";
import { RichText } from "@/src/components/article/blocks/richtext";

export function QuoteBlock({ block, resolvePageRoute, children }: { block: Extract<Block, { type: "quote" }>; resolvePageRoute: (pageId: string) => string; children?: ReactNode }) {
  return (
    <blockquote id={block.anchor} className="border-l-2 border-line-mid pl-notice font-body text-quote leading-body text-ink-sub">
      <p><RichText value={block.richText} resolvePageRoute={resolvePageRoute} /></p>
      {children}
    </blockquote>
  );
}
