// 组件：外部嵌入内容渲染器，针对白名单域名 (如地图) 渲染 iframe 容器，其他域名回退为标准外链
import { ArrowUpRight } from "lucide-react";
import type { Block } from "@/lib/content/schema";

const allowedHosts = new Set(["school-map.ncuos.com"]);

export function EmbedBlock({ block }: { block: Extract<Block, { type: "embed" }> }) {
  const safe = isAllowed(block.canonicalUrl);
  if (!safe) return <a id={block.anchor} className="focus-ring flex min-h-tap items-center gap-s2 border-y border-line py-s3 text-label underline underline-offset-4" href={block.canonicalUrl}><ArrowUpRight className="size-icon-small" strokeWidth={1.9} />打开{block.title}</a>;
  return <div id={block.anchor} className="overflow-hidden border border-line"><iframe className="h-80 w-full border-0" src={block.canonicalUrl} title={block.title} loading="lazy" /></div>;
}

function isAllowed(url: string) {
  try { return allowedHosts.has(new URL(url).hostname); } catch { return false; }
}
