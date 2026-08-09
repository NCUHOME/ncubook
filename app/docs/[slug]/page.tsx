// 校园知识文档阅读页路由：静态 SSG/ISR 生成 (/docs/[slug])，配置 1小时增量刷新，直连领域渲染组件
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadPublishedRepository } from "@/lib/content/supabase";
import { ArticleRenderer } from "@/src/components/features/article/renderer";
import { DocumentAskEntry } from "@/src/components/features/ask/entry";
import { AppHeader } from "@/src/components/primitives/header";

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const repository = await loadPublishedRepository();
  const view = repository.getDocumentView(slug);
  if (!view || view.page.parentId === null) return { title: "文档未找到 - 此间" };
  const section = repository.getSectionForPage(view.page.id);

  const title = `${view.page.title} - ${section?.title ?? "校园知识"} · 此间`;
  const description = `南昌大学 AI 知识库 · ${view.page.title}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      siteName: "此间",
    },
  };
}

export default async function DocumentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const repository = await loadPublishedRepository();
  const view = repository.getDocumentView(slug);
  if (!view || view.page.parentId === null) notFound();
  const section = repository.getSectionForPage(view.page.id);
  if (!section) notFound();

  const tree = repository.getSectionTree(section.slug);
  const getAsset = repository.getAsset;
  const resolvePageRoute = repository.resolvePageRoute;

  return (
    <>
      <AppHeader
        title={view.page.title}
        backHref={resolvePageRoute(section.id)}
        sectionTitle={section.title}
        sectionTree={tree}
        currentPageId={view.page.id}
      />
      <main className="px-s5 pb-s7 pt-s6">
        <article>
          <p className="text-caption leading-ui text-muted">
            {section.title}　/　{view.page.title}
          </p>
          <h1 className="mt-s4 font-display text-display leading-heading font-semibold">{view.page.title}</h1>
          <p className="mt-s3 border-b border-line pb-s5 text-caption leading-ui text-muted">
            更新于 {formatDate(view.page.lastPublishedAt)}
          </p>
          <div className="pt-s5">
            <ArticleRenderer blocks={view.blocks} getAsset={getAsset} resolvePageRoute={resolvePageRoute} />
          </div>
        </article>
      </main>
      <DocumentAskEntry
        pageId={view.page.id}
        initialAnchor={view.blocks.find((block) => block.type === "heading")?.anchor}
      />
    </>
  );
}

export async function generateStaticParams() {
  const repository = await loadPublishedRepository();
  const routes = repository.getPageRoutes();
  return Object.values(routes)
    .filter((route) => route.startsWith("/docs/"))
    .map((route) => ({ slug: route.replace("/docs/", "") }));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Shanghai" }).format(new Date(value));
}
