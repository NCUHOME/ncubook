import { notFound } from "next/navigation";
import { getSectionChildren, getSectionTree, getSectionView } from "@/lib/content/published-repository";
import { SectionPageView } from "@/src/components/pages/SectionPageView";

export default async function SectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const view = getSectionView(slug);
  if (!view) notFound();
  return <SectionPageView view={view} children={getSectionChildren(slug)} tree={getSectionTree(slug)} />;
}
