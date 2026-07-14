import { loadPublishedRepository } from "@/lib/content/supabase-published-repository";
import { HomePageView } from "@/src/components/pages/HomePageView";

export default async function HomePage() {
  const repository = await loadPublishedRepository();
  return <HomePageView sections={repository.getPublishedSections()} resolveRoute={repository.resolvePageRoute} />;
}
