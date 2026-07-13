import { FileText } from "lucide-react";
import type { Asset } from "@/lib/content/published-schema";
import type { ExtractBlock } from "@/src/components/article/types";

export function FileBlock({ block, asset }: { block: ExtractBlock<"file">; asset: Asset | null }) {
  if (!asset) return <p id={block.anchor} className="text-label text-muted">附件暂时无法加载：{block.name}</p>;
  return <a id={block.anchor} className="focus-ring flex min-h-tap items-center gap-s3 border-y border-line py-s3 text-label underline underline-offset-4" href={asset.publicUrl}><FileText className="size-icon" strokeWidth={1.9} />{block.name}</a>;
}
