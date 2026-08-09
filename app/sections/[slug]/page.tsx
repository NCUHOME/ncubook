// 校园内容板块导引页路由：静态 SSG/ISR 生成 (/sections/[slug])，配置 1小时增量刷新，直连领域渲染组件
import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadPublishedRepository } from "@/lib/content/supabase";
import { ArticleRenderer } from "@/src/components/features/article/renderer";
import { AppHeader } from "@/src/components/primitives/header";

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const repository = await loadPublishedRepository();
  const view = repository.getSectionView(slug);
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
}

export default async function SectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const repository = await loadPublishedRepository();
  const view = repository.getSectionView(slug);
  if (!view) notFound();

  const children = repository.getSectionChildren(slug);
  const tree = repository.getSectionTree(slug);
  const getAsset = repository.getAsset;
  const resolveRoute = repository.resolvePageRoute;
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
        <section className="px-s5" aria-labelledby="section-pages-title">
          <div className="flex items-center justify-between border-b border-line pb-s3">
            <h2 id="section-pages-title" className="text-title leading-heading font-semibold">板块页面</h2>
            <span className="text-caption text-muted">{children.length} 篇</span>
          </div>
          {children.map((page) => (
            <Link key={page.id} href={resolveRoute(page.id)} className="focus-ring flex min-h-tap items-center justify-between border-b border-line py-s3 text-body">
              <span>{page.title}</span>
              <ChevronRight className="size-icon-small text-muted" strokeWidth={1.9} />
            </Link>
          ))}
        </section>
      </main>
    </>
  );
}

export async function generateStaticParams() {
  const repository = await loadPublishedRepository();
  return repository.getPublishedSections().map((section) => ({ slug: section.slug }));
}
