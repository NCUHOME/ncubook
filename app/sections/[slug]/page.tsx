// 校园内容板块导引页路由：静态 SSG 生成 (/sections/[slug])，动态生成 Metadata 并渲染 SectionPageView
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadPublishedRepository } from "@/lib/content/supabase";
import { SectionPageView } from "@/src/views/section";

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
  return (
    <SectionPageView
      view={view}
      children={repository.getSectionChildren(slug)}
      tree={repository.getSectionTree(slug)}
      getPublishedAsset={repository.getAsset}
      resolveRoute={repository.resolvePageRoute}
    />
  );
}

export async function generateStaticParams() {
  const repository = await loadPublishedRepository();
  return repository.getPublishedSections().map((section) => ({ slug: section.slug }));
}
