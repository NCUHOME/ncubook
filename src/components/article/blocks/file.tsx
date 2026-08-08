// 组件：文件附件渲染器，提供包含图标与名称的离线文件外链，无 Asset 资源时展示不可用提示
import { FileText } from "lucide-react";
import type { Asset, Block } from "@/lib/content/published-schema";

export function FileBlock({ block, asset }: { block: Extract<Block, { type: "file" }>; asset: Asset | null }) {
  if (!asset) return <p id={block.anchor} className="text-label text-muted">附件暂时无法加载：{block.name}</p>;
  return (
    <a id={block.anchor} className="focus-ring flex min-h-tap items-center gap-s3 border-y border-line py-s3 text-label underline underline-offset-4" href={asset.publicUrl}>
      <FileText aria-hidden="true" className="size-icon shrink-0" strokeWidth={1.9} />
      <span>{block.name}</span>
    </a>
  );
}
