import { anchorFromSourceId } from "@/lib/content/published-repository";
import type { ExtractBlock } from "@/src/components/article/types";
import { ArticleRenderer, type ArticleRendererProps } from "@/src/components/article/ArticleRenderer";
import { RichText } from "@/src/components/article/RichText";

export function ListBlock({ block, getAsset, resolvePageRoute }: { block: ExtractBlock<"bulleted-list" | "numbered-list"> } & Pick<ArticleRendererProps, "getAsset" | "resolvePageRoute">) {
  const Tag = block.type === "numbered-list" ? "ol" : "ul";
  return (
    <Tag id={block.anchor} className="space-y-s2 pl-s5 font-body text-body leading-body">
      {block.items.map((item) => (
        <li id={anchorFromSourceId(item.id)} key={item.id}>
          <RichText value={item.richText} resolvePageRoute={resolvePageRoute} />
          {item.children.length > 0 ? <ArticleRenderer blocks={item.children} getAsset={getAsset} resolvePageRoute={resolvePageRoute} /> : null}
        </li>
      ))}
    </Tag>
  );
}
