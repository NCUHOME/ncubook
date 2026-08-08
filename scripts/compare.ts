// 动态/静态发布数据比对脚本 (scripts/compare.ts)
// 用法: node scripts/compare.ts --source <snapshot.json> --target <snapshot.json>

import { readFile } from "node:fs/promises";
import type { Block } from "@/lib/content/schema";
import { comparePagePublication } from "@/scripts/compare-pub";

export {};

// 解析 source 与 target 快照 JSON 文件
type Snapshot = { pageId: string; blocks: Block[]; assetIds: string[] };
const sourcePath = argument("--source");
const targetPath = argument("--target");
const source = JSON.parse(await readFile(sourcePath, "utf8")) as Snapshot[];
const target = JSON.parse(await readFile(targetPath, "utf8")) as Snapshot[];
const targetByPageId = new Map(target.map((page) => [page.pageId, page]));

// 逐页比对两份快照的数据一致性
const reports = source.map((page) => {
  const published = targetByPageId.get(page.pageId);
  return published ? comparePagePublication(page, published) : { pageId: page.pageId, ok: false, issues: [{ code: "missing-page", detail: page.pageId }] };
});

// 输出比对报告
const result = { ok: reports.every((report) => report.ok), reports };
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
