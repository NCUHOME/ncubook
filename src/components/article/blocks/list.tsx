// 组件：列表块渲染器，支持无序列表 (<ul>) 与有序列表 (<ol>) 及其内部 RichText 节点的映射
import type { Asset, Block } from "@/lib/content/schema";
import { RichText } from "@/src/components/article/blocks/richtext";

export function ListBlock({ block, getAsset, resolvePageRoute, depth = 0 }: { block: Extract<Block, { type: "bulleted-list" | "numbered-list" }>; getAsset: (assetId: string) => Asset | null; resolvePageRoute: (pageId: string) => string; depth?: number }) {
  const Component = block.type === "bulleted-list" ? "ul" : "ol";
  const listStyleClass = block.type === "bulleted-list" ? "list-disc" : "list-decimal";
  return (
    <Component
      id={block.anchor}
      className={`${depth > 0 ? "mt-compact gap-s1 pl-nested-list" : "gap-compact pl-s5"} flex flex-col font-body text-body leading-body ${listStyleClass}`}
      style={block.type === "bulleted-list" ? { listStyleType: depth > 0 ? "circle" : "disc" } : undefined}
    >
      {block.items.map((item) => (
        <li key={item.id}>
          <RichText value={item.richText} resolvePageRoute={resolvePageRoute} />
          {item.children.map((child) =>
            child.type === "bulleted-list" || child.type === "numbered-list" ? (
              <ListBlock
                key={child.id}
                block={child}
                getAsset={getAsset}
                resolvePageRoute={resolvePageRoute}
                depth={depth + 1}
              />
            ) : null,
          )}
        </li>
      ))}
    </Component>
  );
}
