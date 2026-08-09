// 核心业务领域：ContentRepository 仓储策略模式依赖注入工厂，按环境注入 Supabase 生产策略或 Fixture 测试策略
import { cache } from "react";
import { publishedFixture } from "@/lib/content/fixtures";
import { createFixtureRepository } from "@/lib/content/fixture-repo";
import type { PublishedFixture } from "@/lib/content/schema";
import { fetchPublishedFixtureFromSupabase } from "@/lib/content/supabase-repo";
import { hasSupabaseConfig } from "@/lib/integrations/supabase";
import type { ContentRepository } from "@/lib/content/repository";

export type LoadRepositoryOptions = {
  environment?: string;
  configured?: boolean;
  loadPublishedFixture?: () => Promise<PublishedFixture | null>;
};

export const getContentRepository = cache(async function getContentRepository(
  options: LoadRepositoryOptions = {},
): Promise<ContentRepository> {
  const environment = options.environment ?? process.env.PUBLISHED_CONTENT_ENV ?? process.env.VERCEL_ENV ?? "development";
  const configured = options.configured ?? hasSupabaseConfig();

  if (!configured) {
    if (environment === "production") throw new Error("Published content storage is not configured");
    return createFixtureRepository(publishedFixture);
  }

  try {
    const fixture = await (options.loadPublishedFixture ?? fetchPublishedFixtureFromSupabase)();
    if (fixture) return createFixtureRepository(fixture);
    if (environment === "production") throw new Error("No published content version is available");
  } catch (error) {
    if (environment === "production") throw error;
  }

  return createFixtureRepository(publishedFixture);
});
