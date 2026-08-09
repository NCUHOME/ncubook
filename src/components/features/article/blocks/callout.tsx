// 组件：Notion 高亮提示框渲染器，支持左侧图标、背景色、提示音调 (info/warning/risk) 与嵌套子块
import type { ReactNode } from "react";
import type { Block } from "@/lib/content/schema";
import { RichText } from "@/src/components/features/article/blocks/richtext";

export function CalloutBlock({ block, resolvePageRoute, children }: { block: Extract<Block, { type: "callout" }>; resolvePageRoute: (pageId: string) => string; children?: ReactNode }) {
  return (
    <aside id={block.anchor} className="border-l-2 border-ink bg-surface-subtle p-s4 font-body text-body leading-body text-ink">
      <div className="flex items-start gap-s3">
        {block.icon ? <span className="text-body-large leading-none" aria-hidden="true">{block.icon}</span> : null}
        <div>
          <p><RichText value={block.richText} resolvePageRoute={resolvePageRoute} /></p>
          {children}
        </div>
      </div>
    </aside>
  );
}
