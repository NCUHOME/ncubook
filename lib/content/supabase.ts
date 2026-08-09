// 核心业务领域：Supabase 线上数据库版本化文档与仓储加载器 (兼容导出 loadPublishedRepository)
export { getContentRepository as loadPublishedRepository } from "@/lib/content/factory";
export { fetchPublishedFixtureFromSupabase, decodePublishedBlock } from "@/lib/content/supabase-repo";
