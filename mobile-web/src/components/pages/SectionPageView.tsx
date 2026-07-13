import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { Page } from "@/lib/content/published-schema";
import { getAsset, resolvePageRoute, type DocumentView, type PageTreeNode } from "@/lib/content/published-repository";
import { ArticleRenderer } from "@/src/components/article/ArticleRenderer";
import { AppHeader } from "@/src/components/navigation/AppHeader";

type SectionPageViewProps = {
  view: DocumentView;
  children: Page[];
  tree: PageTreeNode[];
};

export function SectionPageView({ view, children, tree }: SectionPageViewProps) {
  const contentBlocks = view.blocks[0]?.type === "paragraph" ? view.blocks.slice(1) : view.blocks;
  return (
    <>
      <AppHeader title={view.page.title} backHref="/" sectionTitle={view.page.title} sectionTree={tree} currentPageId={view.page.id} />
      <main className="pb-s7">
        <section className="border-b border-line px-s5 py-s7">
          <p className="text-caption leading-ui tracking-widest text-muted">校园内容板块</p>
          <h1 className="mt-s3 font-display text-display leading-heading font-semibold">{view.page.title}</h1>
          <p className="mt-s4 max-w-prose font-body text-body leading-body text-muted">{view.description}</p>
        </section>
        {contentBlocks.length > 0 ? (
          <section className="px-s5 py-s6">
            <ArticleRenderer blocks={contentBlocks} getAsset={getAsset} resolvePageRoute={resolvePageRoute} />
          </section>
        ) : null}
        <section className="px-s5" aria-labelledby="section-pages-title">
          <div className="flex items-center justify-between border-b border-line pb-s3">
            <h2 id="section-pages-title" className="text-title leading-heading font-semibold">板块页面</h2>
            <span className="text-caption text-muted">{children.length} 篇</span>
          </div>
          {children.map((page) => (
            <Link key={page.id} href={resolvePageRoute(page.id)} className="focus-ring flex min-h-tap items-center justify-between border-b border-line py-s3 text-body">
              <span>{page.title}</span>
              <ChevronRight className="size-icon-small text-muted" strokeWidth={1.9} />
            </Link>
          ))}
        </section>
      </main>
    </>
  );
}
