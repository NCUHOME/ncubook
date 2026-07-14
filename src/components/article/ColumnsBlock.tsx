import type { ExtractBlock } from "@/src/components/article/types";
import { ArticleRenderer, type ArticleRendererProps } from "@/src/components/article/ArticleRenderer";

export function ColumnsBlock({ block, getAsset, resolvePageRoute }: { block: ExtractBlock<"columns"> } & Pick<ArticleRendererProps, "getAsset" | "resolvePageRoute">) {
  return <div id={block.anchor} className="grid gap-s5 md:grid-cols-2">{block.columns.map((column) => <div key={column.id}><ArticleRenderer blocks={column.blocks} getAsset={getAsset} resolvePageRoute={resolvePageRoute} /></div>)}</div>;
}
