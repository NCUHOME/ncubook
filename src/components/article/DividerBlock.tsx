import type { ExtractBlock } from "@/src/components/article/types";

export function DividerBlock({ block }: { block: ExtractBlock<"divider"> }) {
  return <hr id={block.anchor} className="border-0 border-t border-line" />;
}
