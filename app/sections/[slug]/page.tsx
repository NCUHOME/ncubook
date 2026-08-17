import type { Metadata } from "next";
import { ChevronRight, FolderTree } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadPublishedRepository } from "@/lib/content/server";
import { ArticleRenderer } from "@/src/components/article/renderer";
import { AppHeader } from "@/src/components/primitives/header";

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const repository = await loadPublishedRepository();
    const view = await repository.getSectionView(slug);
    if (!view) return { title: "板块未找到 - 此间" };

    const title = `${view.page.title} - 校园指南 · 此间`;
    const description = `南昌大学 AI 知识导引 · ${view.page.title}板块`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "website",
        siteName: "此间",
      },
    };
  } catch {
    return { title: "板块未找到 - 此间" };
  }
}

export default async function SectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let view: import("@/lib/content/server").SectionView | null = null;
  let children: import("@/lib/content/schema").Page[] = [];
  let tree: import("@/lib/content/server").PageTreeNode[] = [];
  let routes: Record<string, string> = {};
  let repository: import("@/lib/content/server").ContentRepository | null = null;

  try {
    repository = await loadPublishedRepository();
    view = await repository.getSectionView(slug);
    if (!view) notFound();

    children = await repository.getSectionChildren(slug);
    tree = await repository.getSectionTree(slug);
    routes = await repository.getPageRoutes();
  } catch {
    notFound();
  }

  if (!view || !repository) {
    notFound();
  }
  const assetMap = new Map((view.assets ?? []).map((a) => [a.id, a]));
  const getAsset = (assetId: string) => assetMap.get(assetId) ?? null;
  const resolveRoute = (pageId: string) => routes[pageId] || repository.resolvePageRoute(pageId);
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
            <ArticleRenderer blocks={contentBlocks} getAsset={getAsset} resolvePageRoute={resolveRoute} />
          </section>
        ) : null}
        {children.length > 0 ? (
          <section className="px-s5 pt-s2" aria-labelledby="section-pages-title">
            <div className="rounded-medium border border-line bg-surface-subtle/50 p-s5 shadow-subtle">
              <div className="flex items-center justify-between border-b border-line pb-s3">
                <div className="flex items-center gap-s2">
                  <FolderTree className="size-icon text-muted" strokeWidth={1.9} />
                  <h2 id="section-pages-title" className="text-title leading-heading font-semibold text-ink">
                    本板块全部页面
                  </h2>
                </div>
                <span className="text-caption font-medium text-muted bg-surface px-s3 py-s1 rounded-pill border border-line">
                  {children.length} 篇全览
                </span>
              </div>
              <div className="divide-y divide-line pt-s1">
                {children.map((page) => (
                  <Link
                    key={page.id}
                    href={resolveRoute(page.id)}
                    className="focus-ring flex min-h-tap items-center justify-between py-s3 text-body hover:text-accent transition-colors"
                  >
                    <span className="font-medium">{page.title}</span>
                    <ChevronRight className="size-icon-small text-muted flex-shrink-0" strokeWidth={1.9} />
                  </Link>
                ))}
              </div>
            </div>
          </section>
        ) : null}
      </main>
    </>
  );
}

export async function generateStaticParams() {
  try {
    const repository = await loadPublishedRepository();
    const sections = await repository.getPublishedSections();
    return sections.map((section) => ({ slug: section.slug }));
  } catch {
    return [];
  }
}
