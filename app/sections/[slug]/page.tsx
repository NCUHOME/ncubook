// 校园内容板块导引页路由：静态 SSG 生成 (/sections/[slug])，渲染包含介绍段落与子文档卡片树的 SectionPageView
import { notFound } from "next/navigation";
import { loadPublishedRepository } from "@/lib/content/supabase";
import { SectionPageView } from "@/src/views/section";

export default async function SectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const repository = await loadPublishedRepository();
  const view = repository.getSectionView(slug);
  if (!view) notFound();
  return <SectionPageView view={view} children={repository.getSectionChildren(slug)} tree={repository.getSectionTree(slug)} getPublishedAsset={repository.getAsset} resolveRoute={repository.resolvePageRoute} />;
}

export async function generateStaticParams() {
  const repository = await loadPublishedRepository();
  return repository.getPublishedSections().map((section) => ({ slug: section.slug }));
}
