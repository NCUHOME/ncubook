import type { Asset, Page } from "@/lib/content/published-schema";
import type { DocumentView, PageTreeNode } from "@/lib/content/published-repository";
import { ArticleRenderer } from "@/src/components/article/ArticleRenderer";
import { DocumentAskEntry } from "@/src/components/ask/DocumentAskEntry";
import { AppHeader } from "@/src/components/navigation/AppHeader";

type DocumentPageViewProps = {
  view: DocumentView;
  section: Page;
  tree: PageTreeNode[];
  getAsset: (assetId: string) => Asset | null;
  resolvePageRoute: (pageId: string) => string;
};

export function DocumentPageView({ view, section, tree, getAsset, resolvePageRoute }: DocumentPageViewProps) {
  return (
    <>
      <AppHeader title={view.page.title} backHref={resolvePageRoute(section.id)} sectionTitle={section.title} sectionTree={tree} currentPageId={view.page.id} />
      <main className="px-s5 pb-s7 pt-s6">
        <article>
          <p className="text-caption leading-ui text-muted">{section.title}　/　{view.page.title}</p>
          <h1 className="mt-s4 font-display text-display leading-heading font-semibold">{view.page.title}</h1>
          <p className="mt-s3 border-b border-line pb-s5 text-caption leading-ui text-muted">更新于 {formatDate(view.page.lastPublishedAt)}</p>
          <div className="pt-s5">
            <ArticleRenderer blocks={view.blocks} getAsset={getAsset} resolvePageRoute={resolvePageRoute} />
          </div>
        </article>
      </main>
      <DocumentAskEntry pageId={view.page.id} initialAnchor={view.blocks.find((block) => block.type === "heading")?.anchor} />
    </>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Shanghai" }).format(new Date(value));
}
