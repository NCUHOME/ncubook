// Notion 内容一键发布脚本 (scripts/publish.ts)
//
// 命令行具体使用示例：
// 1. 直连本地/生产环境全量发布 Notion 文章:
//    npx tsx scripts/publish.ts --all
//
// 2. 预检模式（仅检查与校验格式，不真正写入数据库）:
//    npx tsx scripts/publish.ts --dry-run --all
//
// 3. 仅发布指定 ID 的 Notion 页面:
//    npx tsx scripts/publish.ts --page <NOTION_PAGE_ID>
//
// 4. 一键恢复切线至历史特定版本:
//    npx tsx scripts/publish.ts --rollback content-20260811132640160
//
// 5. 通过 Remote Webhook Endpoint 远程发版 (需配置 PUBLICATION_ENDPOINT 和 PUBLICATION_ADMIN_TOKEN):
//    PUBLICATION_ENDPOINT="https://book.ncuos.com/api/admin/publish-notion" PUBLICATION_ADMIN_TOKEN="xxx" npx tsx scripts/publish.ts --all

type CommandBody =
  | { operation: "publish"; dryRun: boolean; all?: true; pageIds?: string[] }
  | { operation: "rollback"; version: string };

export {};

import { loadEnvConfig } from "@next/env";
import { runNotionPublicationCommand } from "../lib/publishing/pipeline";
import { parseCommand } from "../lib/publishing/route";

loadEnvConfig(process.cwd());

async function main() {
  const args = process.argv.slice(2);
  const isDirect = args.includes("--direct") || !process.env.PUBLICATION_ENDPOINT;
  const rawBody = parseArguments(args);
  const command = parseCommand(rawBody);
  if (!command) usage("Invalid publication command arguments");

  let result: unknown;

  if (isDirect) {
    process.stdout.write("🚀 [CLI Direct Pipeline] 正在直连 Notion 与 Supabase 执行全量同步发版...\n");
    try {
      result = await runNotionPublicationCommand(command);
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      process.stderr.write(`❌ [Direct Publish Failure] ${reason}\n`);
      process.exitCode = 1;
    }
  } else {
    const endpoint = environment("PUBLICATION_ENDPOINT");
    const token = environment("PUBLICATION_ADMIN_TOKEN");

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(command),
    });

    result = await response.json().catch(() => ({ ok: false, error: "invalid_response" }));
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (!response.ok) process.exitCode = 1;
  }
}

main().catch((err) => {
  process.stderr.write(`Fatal error: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});

// 解析 CLI 参数 (--all, --page, --rollback, --dry-run)
function parseArguments(values: string[]): CommandBody {
  const rollbackIndex = values.indexOf("--rollback");
  if (rollbackIndex >= 0) {
    const version = values[rollbackIndex + 1];
    if (!version) usage("--rollback requires a content version");
    return { operation: "rollback", version };
  }

  const dryRun = values.includes("--dry-run");
  if (values.includes("--all")) return { operation: "publish", dryRun, all: true };
  const pageIds: string[] = [];
  for (let index = 0; index < values.length; index += 1) {
    if (values[index] === "--page") {
      const pageId = values[index + 1];
      if (!pageId) usage("--page requires a Notion page id");
      pageIds.push(pageId);
      index += 1;
    }
  }
  if (pageIds.length === 0) usage("choose --all, --page <id>, or --rollback <version>");
  return { operation: "publish", dryRun, pageIds };
}

// 读取必填环境变量
function environment(name: string): string {
  const value = process.env[name];
  if (!value) usage(`${name} is required`);
  return value;
}

// 打印使用说明并退出
function usage(reason: string): never {
  process.stderr.write(`${reason}\nUsage: node scripts/publish.ts [--dry-run] (--all | --page <id>...) | --rollback <version>\n`);
  process.exit(2);
}
