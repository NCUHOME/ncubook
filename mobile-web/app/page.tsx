import { getPublishedSections } from "@/lib/content/published-repository";
import { HomePageView } from "@/src/components/pages/HomePageView";

export default function HomePage() {
  return <HomePageView sections={getPublishedSections()} />;
}
