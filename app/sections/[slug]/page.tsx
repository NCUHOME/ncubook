import { notFound } from "next/navigation";
import { loadPublishedRepository } from "@/lib/content/supabase-published-repository";
import { SectionPageView } from "@/src/components/pages/SectionPageView";

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
