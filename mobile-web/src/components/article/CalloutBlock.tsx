import type { ExtractBlock } from "@/src/components/article/types";
import { RichText } from "@/src/components/article/RichText";

const toneClass = {
  info: "border-info",
  warning: "border-warning",
  risk: "border-danger",
} as const;

export function CalloutBlock({ block, resolvePageRoute }: { block: ExtractBlock<"callout">; resolvePageRoute: (pageId: string) => string }) {
  return <aside id={block.anchor} className={`border-l bg-surface-subtle p-s4 ${toneClass[block.tone]}`}><RichText value={block.richText} resolvePageRoute={resolvePageRoute} /></aside>;
}
