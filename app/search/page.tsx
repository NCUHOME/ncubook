// 关键词搜索页面路由：服务端获取 url ?q= 查询参数，动态生成 Metadata，并渲染 SearchPageView
import type { Metadata } from "next";
import { loadPublishedRepository } from "@/lib/content/supabase";
import { searchEntries } from "@/lib/content/search";
import { SearchPageView } from "@/src/views/search";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}): Promise<Metadata> {
  const { q = "" } = await searchParams;
  const query = q.trim();
  const title = query ? `"${query}" 的搜索结果 - 此间` : "关键词搜索 - 此间";

  return {
    title,
    description: "南昌大学校园知识全文关键词搜索与定位",
  };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  const repository = await loadPublishedRepository();
  return (
    <SearchPageView
      query={query}
      results={searchEntries(query, repository.getSearchIndex(), repository.resolvePageRoute)}
    />
  );
}
