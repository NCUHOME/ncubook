// 组件：文章水平分割线 (<hr>) 渲染器，附带 b-<blockId> 稳定位置锚点
import type { Block } from "@/lib/content/schema";

export function DividerBlock({ block }: { block: Extract<Block, { type: "divider" }> }) {
  return <hr id={block.anchor} className="border-line my-s6" />;
}
