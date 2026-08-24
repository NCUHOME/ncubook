// 组件：文件附件渲染器，按原型显示紧凑的文件名称行；没有真实资源时保留占位
import type { Asset, Block } from "@/lib/content/schema";

export function FileBlock({ block, asset }: { block: Extract<Block, { type: "file" }>; asset: Asset | null }) {
  if (!asset) {
    return (
      <div id={block.anchor} className="flex items-center gap-s2 text-small text-ink">
        <span aria-hidden="true">📄</span>
        <span>{block.name}</span>
      </div>
    );
  }

  return (
    <a
      id={block.anchor}
      className="focus-ring flex items-center gap-s2 text-small text-ink"
      href={asset.publicUrl}
      target="_blank"
      rel="noopener noreferrer"
    >
      <span aria-hidden="true">📄</span>
      <span>{block.name}</span>
    </a>
  );
}
