// 首页路由：异步 Server Component，加载已发布知识库仓储并渲染提问优先的 HomePageView 视图
import { loadPublishedRepository } from "@/lib/content/supabase";
import { HomePageView } from "@/src/views/home";

export default async function HomePage() {
  const repository = await loadPublishedRepository();
  return <HomePageView sections={repository.getPublishedSections()} resolveRoute={repository.resolvePageRoute} />;
}
