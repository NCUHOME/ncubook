import { notFound } from "next/navigation";
import { getAsset, getDocumentView, getSectionForPage, getSectionTree, resolvePageRoute } from "@/lib/content/published-repository";
import { DocumentPageView } from "@/src/components/pages/DocumentPageView";

export default async function DocumentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const view = getDocumentView(slug);
  if (!view || view.page.parentId === null) notFound();
  const section = getSectionForPage(view.page.id);
  if (!section) notFound();
  return <DocumentPageView view={view} section={section} tree={getSectionTree(section.slug)} getAsset={getAsset} resolvePageRoute={resolvePageRoute} />;
}
