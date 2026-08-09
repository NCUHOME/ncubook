// 校园知识文档阅读页路由：静态 SSG/ISR 生成 (/docs/[slug])，动态生成 Metadata 并渲染移动端优先的 DocumentPageView
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadPublishedRepository } from "@/lib/content/supabase";
import { DocumentPageView } from "@/src/views/doc";

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
  return (
    <DocumentPageView
      view={view}
      section={section}
      tree={repository.getSectionTree(section.slug)}
      getAsset={repository.getAsset}
      resolvePageRoute={repository.resolvePageRoute}
    />
  );
}

export async function generateStaticParams() {
  const repository = await loadPublishedRepository();
  const routes = repository.getPageRoutes();
  return Object.values(routes)
    .filter((route) => route.startsWith("/docs/"))
    .map((route) => ({ slug: route.replace("/docs/", "") }));
}
