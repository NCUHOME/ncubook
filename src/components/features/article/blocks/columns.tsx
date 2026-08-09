// 组件：多栏响应式布局容器，以网格系统 (grid-cols-1 sm:grid-cols-2) 并排递归渲染各列子 Block
import type { Asset, Block } from "@/lib/content/schema";
import { ArticleRenderer } from "@/src/components/features/article/renderer";

export function ColumnsBlock({ block, getAsset, resolvePageRoute }: { block: Extract<Block, { type: "columns" }>; getAsset: (assetId: string) => Asset | null; resolvePageRoute: (pageId: string) => string }) {
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
