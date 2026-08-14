// 部署后路由冒烟探针：测量核心路由的状态码 / TTFB / HTML 体积 / title 与 viewport 存在性
// 注意：本脚本不是 Lighthouse。B4–B6（LCP / Performance 分 / CLS）需真实浏览器测量，
// 请在部署后运行：npx lighthouse <url> --form-factor=mobile --throttling-method=simulate
// 用法: node scripts/audit-routes.ts --url http://localhost:3000

import http from "node:http";
import https from "node:https";

const DEFAULT_BASE_URL = process.env.AUDIT_TARGET_URL || process.env.SITE_URL || "http://localhost:3000";

const ROUTES = [
  { path: "/", name: "首页" },
  { path: "/docs/campus-shuttle", name: "文档阅读页" },
  { path: "/search", name: "关键词搜索页" },
];

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

async function runAudit() {
  const args = process.argv.slice(2);
  let baseUrl = DEFAULT_BASE_URL;
  const urlArgIndex = args.indexOf("--url");
  if (urlArgIndex !== -1 && args[urlArgIndex + 1]) {
    baseUrl = args[urlArgIndex + 1];
  }

  console.log(`\n======================================================`);
  console.log(` 此间 (NCU Book) 路由冒烟探针`);
  console.log(` 目标环境: ${baseUrl}`);
  console.log(` 测试时间: ${new Date().toISOString()}`);
  console.log(`======================================================\n`);

  console.log(`| 路由 | 状态码 | TTFB (ms) | 传输耗时 (ms) | HTML 体积 | Viewport | Title |`);
  console.log(`|---|---|---|---|---|---|---|`);

  let failures = 0;
  for (const route of ROUTES) {
    try {
      const result = await measureRoute(baseUrl, route.path);
      if (result.statusCode !== 200 || !result.hasTitle || !result.hasViewport) failures += 1;
      console.log(
        `| \`${route.path}\` (${route.name}) | ${result.statusCode} | ${result.ttfbMs}ms | ${result.totalMs}ms | ${(result.contentLength / 1024).toFixed(2)} KB | ${result.hasViewport ? "✅" : "❌"} | ${result.hasTitle ? "✅" : "❌"} |`
      );
    } catch (err: unknown) {
      failures += 1;
      const message = err instanceof Error ? err.message : String(err);
      console.log(`| \`${route.path}\` | 失败 | - | - | - | - | ❌ (${message}) |`);
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

runAudit().catch((err) => {
  console.error("Audit run error:", err);
  process.exit(1);
});
