// 部署后路由冒烟探针：测量核心路由的状态码 / TTFB / HTML 体积 / title 与 viewport 存在性 (scripts/audit-routes.ts)
// 用法:
//   - 默认本地冒烟: npx tsx scripts/audit-routes.ts
//   - 指定目标服务: npx tsx scripts/audit-routes.ts --url https://cijian.ncu.edu.cn
//   - 指定线上页面: npx tsx scripts/audit-routes.ts --url http://localhost:3000 --doc-slug page-24a7d60a0dda8094

import http from "node:http";
import https from "node:https";

const DEFAULT_BASE_URL = process.env.AUDIT_TARGET_URL || process.env.SITE_URL || "http://localhost:3000";

type RouteConfig = {
  path: string;
  name: string;
};

async function measureRoute(baseUrl: string, routePath: string) {
  const url = `${baseUrl.replace(/\/$/, "")}${routePath}`;
  const start = performance.now();

  return new Promise<{
    url: string;
    statusCode: number;
    ttfbMs: number;
    totalMs: number;
    contentLength: number;
    hasTitle: boolean;
    hasViewport: boolean;
  }>((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    const req = client.get(url, (res) => {
      const ttfbMs = performance.now() - start;
      let body = "";

      res.on("data", (chunk) => {
        body += chunk;
      });

      res.on("end", () => {
        const totalMs = performance.now() - start;
        const hasTitle = /<title[^>]*>.*<\/title>/i.test(body);
        const hasViewport = /<meta[^>]*name=["']viewport["'][^>]*>/i.test(body);

        resolve({
          url,
          statusCode: res.statusCode ?? 0,
          ttfbMs: Math.round(ttfbMs),
          totalMs: Math.round(totalMs),
          contentLength: Buffer.byteLength(body),
          hasTitle,
          hasViewport,
        });
      });
    });

    req.on("error", (err) => reject(err));
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error(`Request timed out for ${url}`));
    });
  });
}

export async function runAudit() {
  const args = process.argv.slice(2);
  let baseUrl = DEFAULT_BASE_URL;

  const urlArgIndex = args.indexOf("--url");
  const nextUrl = urlArgIndex !== -1 ? args[urlArgIndex + 1] : undefined;
  if (nextUrl) {
    baseUrl = nextUrl;
  }

  // 支持通过 --doc-slug 或 --doc-path 或环境变量动态配置文档测试路径
  let docPath = process.env.AUDIT_DOC_PATH || "/docs/campus-shuttle";
  const docSlugIndex = args.indexOf("--doc-slug");
  const nextSlug = docSlugIndex !== -1 ? args[docSlugIndex + 1] : undefined;
  if (nextSlug) {
    const rawSlug = nextSlug.trim();
    docPath = rawSlug.startsWith("/") ? rawSlug : `/docs/${rawSlug}`;
  }
  const docPathIndex = args.indexOf("--doc-path");
  const nextDocPath = docPathIndex !== -1 ? args[docPathIndex + 1] : undefined;
  if (nextDocPath) {
    docPath = nextDocPath.trim();
  }

  const routes: RouteConfig[] = [
    { path: "/", name: "首页" },
    { path: "/search", name: "关键词搜索页" },
    { path: docPath, name: "文档阅读页" },
  ];

  const sectionSlugIndex = args.indexOf("--section-slug");
  const nextSectionSlug = sectionSlugIndex !== -1 ? args[sectionSlugIndex + 1] : undefined;
  if (nextSectionSlug) {
    const rawSection = nextSectionSlug.trim();
    routes.push({
      path: rawSection.startsWith("/") ? rawSection : `/sections/${rawSection}`,
      name: "板块目录页",
    });
  }

  console.log(`\n======================================================`);
  console.log(` 此间 (NCU Book) 路由冒烟探针`);
  console.log(` 目标环境: ${baseUrl}`);
  console.log(` 测试时间: ${new Date().toISOString()}`);
  console.log(`======================================================\n`);

  console.log(`| 路由 | 状态码 | TTFB (ms) | 传输耗时 (ms) | HTML 体积 | Viewport | Title |`);
  console.log(`|---|---|---|---|---|---|---|`);

  let failures = 0;
  for (const route of routes) {
    try {
      const result = await measureRoute(baseUrl, route.path);
      const isPass = result.statusCode === 200 && result.hasTitle && result.hasViewport;
      if (!isPass) failures += 1;

      console.log(
        `| \`${route.path}\` (${route.name}) | ${result.statusCode} | ${result.ttfbMs}ms | ${result.totalMs}ms | ${(result.contentLength / 1024).toFixed(2)} KB | ${result.hasViewport ? "PASS" : "FAIL"} | ${result.hasTitle ? "PASS" : "FAIL"} |`
      );

      if (result.statusCode === 404 && route.path.startsWith("/docs/")) {
        console.warn(`  [提示] 若当前连接了 Supabase 线上数据库，请通过 '--doc-slug <slug>' 指定已发布的真实文档 slug。`);
      }
    } catch (err: unknown) {
      failures += 1;
      const message = err instanceof Error ? err.message : String(err);
      console.log(`| \`${route.path}\` | 失败 | - | - | - | - | FAIL (${message}) |`);
    }
  }

  console.log(`\n下一步：B4–B6 硬指标需用真实 Lighthouse 补测存档：`);
  console.log(`  npx lighthouse ${baseUrl} --form-factor=mobile --throttling-method=simulate --output=html`);
  console.log(`  （LCP ≤ 2.5s / Performance ≥ 95 / CLS ≤ 0.05）\n`);

  if (failures > 0) {
    console.error(`冒烟探针发现 ${failures} 条路由异常`);
    process.exit(1);
  }
}

if (process.argv[1]?.includes("audit-routes.ts") || process.argv[1]?.includes("audit-routes.js")) {
  runAudit().catch((err) => {
    console.error("Audit run error:", err);
    process.exit(1);
  });
}
