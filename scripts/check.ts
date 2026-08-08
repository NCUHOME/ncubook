// 全站资源与死链审计检查脚本 (scripts/check.ts)
// 用法: node scripts/check.ts --fixture <fixture.json>

import { readFile } from "node:fs/promises";
import type { PublishedFixture } from "../lib/content/published-schema.ts";
import { auditPublishedFixture } from "../lib/migration/check-links-assets.ts";

export {};

// 解析待审计的 Fixture 数据文件
const fixturePath = argument("--fixture");
const fixture = JSON.parse(await readFile(fixturePath, "utf8")) as PublishedFixture;

// 发起 HEAD 请求并发审计外部链接与静态资源可用性
const result = await auditPublishedFixture(fixture, async (url) => {
  const response = await fetch(url, { method: "HEAD", redirect: "follow" });
  return { ok: response.ok, status: response.status };
});

// 输出死链与破损资源审计结果
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (!result.ok) process.exitCode = 1;

// 读取 CLI 选项参数
function argument(name: string): string {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (!value) {
    process.stderr.write(`${name} is required\n`);
    process.exit(2);
  }
  return value;
}
