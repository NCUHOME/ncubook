import type { ReactNode } from "react";
import type { ExtractBlock } from "@/src/components/article/types";
import { RichText } from "@/src/components/article/RichText";

export function QuoteBlock({ block, resolvePageRoute, children }: { block: ExtractBlock<"quote">; resolvePageRoute: (pageId: string) => string; children?: ReactNode }) {
  return <blockquote id={block.anchor} className="border-l border-ink pl-s4 font-body text-body leading-body text-muted">
    <RichText value={block.richText} resolvePageRoute={resolvePageRoute} defaultTone="muted" />
    {children}
  </blockquote>;
}
