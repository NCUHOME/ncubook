// 校园知识文档阅读页路由：静态 SSG/ISR 生成 (/docs/[slug])，校验 slug 合法性并渲染移动端优先的 DocumentPageView
import { notFound } from "next/navigation";
import { loadPublishedRepository } from "@/lib/content/supabase";
import { DocumentPageView } from "@/src/views/doc";

export default async function DocumentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const repository = await loadPublishedRepository();
  const view = repository.getDocumentView(slug);
  if (!view || view.page.parentId === null) notFound();
  const section = repository.getSectionForPage(view.page.id);
  if (!section) notFound();
  return <DocumentPageView view={view} section={section} tree={repository.getSectionTree(section.slug)} getAsset={repository.getAsset} resolvePageRoute={repository.resolvePageRoute} />;
}

export async function generateStaticParams() {
  const repository = await loadPublishedRepository();
  const routes = repository.getPageRoutes();
  return Object.values(routes)
    .filter((route) => route.startsWith("/docs/"))
    .map((route) => ({ slug: route.replace("/docs/", "") }));
}
