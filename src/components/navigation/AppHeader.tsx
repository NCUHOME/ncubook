import { ArrowLeft, Search } from "lucide-react";
import Link from "next/link";
import type { PageTreeNode } from "@/lib/content/published-repository";
import { PageTreeDrawer } from "@/src/components/navigation/PageTreeDrawer";

type AppHeaderProps = {
  title?: string;
  backHref?: string;
  sectionTitle?: string;
  sectionTree?: PageTreeNode[];
  currentPageId?: string;
};

export function AppHeader({
  title = "此间",
  backHref,
  sectionTitle,
  sectionTree,
  currentPageId,
}: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-header flex min-h-tap items-center justify-between border-b border-line bg-surface px-s5 py-s3">
      <div className="flex items-center gap-s2">
        {backHref ? (
          <Link href={backHref} className="focus-ring tap-target grid place-items-center rounded-round border border-line" aria-label="返回">
            <ArrowLeft className="size-icon" strokeWidth={1.9} />
          </Link>
        ) : null}
        {sectionTree && sectionTitle ? (
          <PageTreeDrawer sectionTitle={sectionTitle} currentPageId={currentPageId} nodes={sectionTree} />
        ) : null}
        <strong className="truncate text-title leading-ui font-semibold">{title}</strong>
      </div>
      <Link href="/search" className="focus-ring tap-target grid place-items-center rounded-round border border-line" aria-label="搜索文档">
        <Search className="size-icon" strokeWidth={1.9} />
      </Link>
    </header>
  );
}
