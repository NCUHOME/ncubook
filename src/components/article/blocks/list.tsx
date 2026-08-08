// 组件：列表块渲染器，支持无序列表 (<ul>) 与有序列表 (<ol>) 及其内部 RichText 节点的映射
import type { Asset, Block } from "@/lib/content/published-schema";
import { RichText } from "@/src/components/article/blocks/richtext";

export function ListBlock({ block, resolvePageRoute }: { block: Extract<Block, { type: "bulleted-list" | "numbered-list" }>; getAsset: (assetId: string) => Asset | null; resolvePageRoute: (pageId: string) => string }) {
  const Component = block.type === "bulleted-list" ? "ul" : "ol";
  const listStyleClass = block.type === "bulleted-list" ? "list-disc" : "list-decimal";
  return (
    <Component id={block.anchor} className={`my-s4 pl-s5 font-body text-body leading-body ${listStyleClass}`}>
      {block.items.map((item) => (
        <li key={item.id} className="my-s2">
          <RichText value={item.richText} resolvePageRoute={resolvePageRoute} />
        </li>
      ))}
    </Component>
  );
}
