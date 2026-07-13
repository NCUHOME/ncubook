import { loadPublishedRepository } from "@/lib/content/supabase-published-repository";
import { searchEntries } from "@/lib/search/search-blocks";
import { SearchPageView } from "@/src/components/pages/SearchPageView";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  const repository = await loadPublishedRepository();
  return <SearchPageView query={query} results={searchEntries(query, repository.getSearchIndex(), repository.resolvePageRoute)} />;
}
