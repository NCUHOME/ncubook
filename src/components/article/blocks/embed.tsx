// 组件：外部嵌入内容渲染器，针对白名单域名 (如地图) 渲染 iframe 容器，其他域名回退为标准外链
import { ArrowUpRight, Map } from "lucide-react";
import type { Block } from "@/lib/content/schema";

const allowedHosts = new Set(["school-map.ncuos.com"]);

export function EmbedBlock({ block }: { block: Extract<Block, { type: "embed" }> }) {
  if (block.presentation === "map-card") {
    return (
      <a
        id={block.anchor}
        className="prototype-map-card focus-ring flex items-center gap-control rounded-medium border border-line px-notice py-s3 text-ink"
        href={block.canonicalUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Map aria-hidden="true" className="prototype-map-card-icon shrink-0 text-brand" />
        <span className="min-w-0 flex-1">
          <span className="block text-small font-semibold">{block.title}</span>
          <span className="prototype-map-card-subtitle block font-sans text-caption text-muted">school-map.ncuos.com · 可查建筑介绍与校车轨迹</span>
        </span>
        <ArrowUpRight aria-hidden="true" className="size-icon-small shrink-0 text-brand" />
      </a>
    );
  }

  const safe = isAllowed(block.canonicalUrl);
  if (!safe) {
    return (
      <a
        id={block.anchor}
        className="focus-ring flex min-h-tap items-center gap-s2 border-y border-line py-s3 text-label text-brand font-medium"
        style={{ color: "var(--brand-blue)" }}
        href={block.canonicalUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        <ArrowUpRight className="size-icon-small text-brand" strokeWidth={1.9} />
        打开{block.title}
      </a>
    );
  }
  return <div id={block.anchor} className="overflow-hidden border border-line"><iframe className="h-80 w-full border-0" src={block.canonicalUrl} title={block.title} loading="lazy" /></div>;
}

function isAllowed(url: string) {
  try { return allowedHosts.has(new URL(url).hostname); } catch { return false; }
}
