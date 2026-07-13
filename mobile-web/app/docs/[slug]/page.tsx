import { notFound } from "next/navigation";
import { loadPublishedRepository } from "@/lib/content/supabase-published-repository";
import { DocumentPageView } from "@/src/components/pages/DocumentPageView";

export default async function DocumentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const repository = await loadPublishedRepository();
  const view = repository.getDocumentView(slug);
  if (!view || view.page.parentId === null) notFound();
  const section = repository.getSectionForPage(view.page.id);
  if (!section) notFound();
  return <DocumentPageView view={view} section={section} tree={repository.getSectionTree(section.slug)} getAsset={repository.getAsset} resolvePageRoute={repository.resolvePageRoute} />;
}
