import { loadPublishedRepository } from "@/lib/content/supabase-published-repository";
import { HomePageView } from "@/src/views/home";

export default async function HomePage() {
  const repository = await loadPublishedRepository();
  return <HomePageView sections={repository.getPublishedSections()} resolveRoute={repository.resolvePageRoute} />;
}
