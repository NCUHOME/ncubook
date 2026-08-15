// 单元测试：校验 sitemap.ts 与 robots.ts 的路由完整性、协议规则与安全过滤
import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { getSiteUrl } from "@/lib/site";

describe("SEO & Search Engine Crawling metadata", () => {
  it("generates a comprehensive sitemap with root, search, sections, and docs", async () => {
    const siteUrl = getSiteUrl();
    const entries = await sitemap();
    expect(Array.isArray(entries)).toBe(true);
    expect(entries.length).toBeGreaterThanOrEqual(5);

    const urls = entries.map((entry) => entry.url);

    // 必须包含首页与搜索入口
    expect(urls).toContain(`${siteUrl}/`);
    expect(urls).toContain(`${siteUrl}/search`);

    // 必须包含板块与文档路由
    expect(urls.some((url) => url.includes("/sections/"))).toBe(true);
    expect(urls.some((url) => url.includes("/docs/"))).toBe(true);

    // 严禁泄露管理后台与内部 API
    expect(urls.some((url) => url.includes("/admin"))).toBe(false);
    expect(urls.some((url) => url.includes("/api"))).toBe(false);

    // 校验条目元数据完整性
    for (const entry of entries) {
      expect(entry.url.startsWith(siteUrl)).toBe(true);
      expect(entry.priority).toBeDefined();
      expect(entry.changeFrequency).toBeDefined();
    }
  });

  it("generates valid robots.txt rules blocking sensitive paths and linking sitemap", () => {
    const result = robots();

    expect(result.sitemap).toBe(`${getSiteUrl()}/sitemap.xml`);
    expect(result.rules).toBeDefined();

    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    expect(rules).toBeDefined();
    expect(rules?.userAgent).toBe("*");
    expect(rules?.allow).toBe("/");
    expect(rules?.disallow).toEqual(["/admin/", "/api/"]);
  });
});
