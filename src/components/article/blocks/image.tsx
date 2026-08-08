// 组件：图片与图注组件，使用 loading="lazy" 延迟加载图片，并渲染图注 (caption) 富文本
import type { Asset, Block } from "@/lib/content/published-schema";
import { RichText } from "@/src/components/article/blocks/richtext";

export function ImageBlock({ block, asset, resolvePageRoute }: { block: Extract<Block, { type: "image" }>; asset: Asset | null; resolvePageRoute: (pageId: string) => string }) {
  if (!asset) return <p id={block.anchor} className="text-label text-muted">图片暂时无法加载。</p>;
  return (
    <figure id={block.anchor}>
      <img className="h-auto w-full" src={asset.publicUrl} alt={asset.alt ?? ""} loading="lazy" decoding="async" />
      {block.caption ? (
        <figcaption className="mt-s2 text-caption leading-ui text-muted">
          <RichText value={block.caption} resolvePageRoute={resolvePageRoute} />
        </figcaption>
      ) : null}
    </figure>
  );
}
