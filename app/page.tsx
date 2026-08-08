import { loadPublishedRepository } from "@/lib/content/supabase";
import { HomePageView } from "@/src/views/home";

export default async function HomePage() {
  const repository = await loadPublishedRepository();
  return <HomePageView sections={repository.getPublishedSections()} resolveRoute={repository.resolvePageRoute} />;
}
