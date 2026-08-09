// 关键词搜索页面路由：服务端获取 url ?q= 查询参数，进行纯文本 Block 索引检索并渲染 SearchPageView
import { loadPublishedRepository } from "@/lib/content/supabase";
import { searchEntries } from "@/lib/content/search";
import { SearchPageView } from "@/src/views/search";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  const repository = await loadPublishedRepository();
  return <SearchPageView query={query} results={searchEntries(query, repository.getSearchIndex(), repository.resolvePageRoute)} />;
}
