// 组件：多栏响应式布局容器，以网格系统 (grid-cols-1 sm:grid-cols-2) 并排递归渲染各列子 Block
import type { Asset, Block } from "@/lib/content/schema";
import { ArticleRenderer } from "@/src/components/article/renderer";
import { RichText } from "@/src/components/article/blocks/richtext";

export function ColumnsBlock({ block, getAsset, resolvePageRoute }: { block: Extract<Block, { type: "columns" }>; getAsset: (assetId: string) => Asset | null; resolvePageRoute: (pageId: string) => string }) {
  if (block.presentation === "media-grid") {
    return (
      <div id={block.anchor} className="grid grid-cols-2 gap-compact">
        {block.columns.map((column) => (
          <ArticleRenderer key={column.id} blocks={column.blocks} getAsset={getAsset} resolvePageRoute={resolvePageRoute} />
        ))}
      </div>
    );
  }

  if (block.presentation === "route-columns") {
    return (
      <div id={block.anchor} className="grid grid-cols-2 gap-s3">
        {block.columns.map((column) => {
          const [title, stops, note] = column.blocks;
          return (
            <div key={column.id}>
              {title?.type === "paragraph" ? <p className="text-small leading-body"><RichText value={title.richText} resolvePageRoute={resolvePageRoute} /></p> : null}
              {stops?.type === "paragraph" ? <p className="prototype-route-stops whitespace-pre-line text-ink-sub"><RichText value={stops.richText} resolvePageRoute={resolvePageRoute} /></p> : null}
              {note?.type === "paragraph" ? <p className="mt-s2 text-footnote leading-body"><RichText value={note.richText} resolvePageRoute={resolvePageRoute} /></p> : null}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div id={block.anchor} className="grid gap-s5 md:grid-cols-2">
      {block.columns.map((column) => (
        <div key={column.id}>
          <ArticleRenderer blocks={column.blocks} getAsset={getAsset} resolvePageRoute={resolvePageRoute} />
        </div>
      ))}
    </div>
  );
}
