import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ExtractBlock } from "@/src/components/article/types";
import { RichText } from "@/src/components/article/RichText";

export function PageLinkBlock({ block, href, resolvePageRoute }: { block: ExtractBlock<"page-link">; href: string; resolvePageRoute: (pageId: string) => string }) {
  return <Link id={block.anchor} href={href} className="focus-ring flex min-h-tap items-center justify-between border-b border-line text-label"><span><RichText value={block.richText} resolvePageRoute={resolvePageRoute} /></span><ChevronRight className="size-icon-small text-muted" /></Link>;
}
