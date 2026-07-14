import type { Asset } from "@/lib/content/published-schema";
import type { ExtractBlock } from "@/src/components/article/types";
import { RichText } from "@/src/components/article/RichText";

export function ImageBlock({ block, asset, resolvePageRoute }: { block: ExtractBlock<"image">; asset: Asset | null; resolvePageRoute: (pageId: string) => string }) {
  if (!asset) return <p id={block.anchor} className="text-label text-muted">图片暂时无法加载。</p>;
  return <figure id={block.anchor}><img className="h-auto w-full" src={asset.publicUrl} alt={asset.alt ?? ""} loading="lazy" decoding="async" />{block.caption ? <figcaption className="mt-s2 text-caption leading-ui text-muted"><RichText value={block.caption} resolvePageRoute={resolvePageRoute} /></figcaption> : null}</figure>;
}
