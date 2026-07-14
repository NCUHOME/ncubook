import { ExternalLink } from "lucide-react";
import type { ExtractBlock } from "@/src/components/article/types";

const allowedHosts = new Set(["school-map.ncuos.com"]);

export function EmbedBlock({ block }: { block: ExtractBlock<"embed"> }) {
  const safe = isAllowed(block.canonicalUrl);
  if (!safe) return <a id={block.anchor} className="focus-ring flex min-h-tap items-center gap-s2 border-y border-line py-s3 text-label underline underline-offset-4" href={block.canonicalUrl}><ExternalLink className="size-icon-small" strokeWidth={1.9} />打开{block.title}</a>;
  return <div id={block.anchor} className="overflow-hidden border border-line"><iframe className="h-80 w-full border-0" src={block.canonicalUrl} title={block.title} loading="lazy" /></div>;
}

function isAllowed(url: string) {
  try { return allowedHosts.has(new URL(url).hostname); } catch { return false; }
}
