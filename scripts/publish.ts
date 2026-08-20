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
// 5. 永久删除指定历史无用版本:
//    npx tsx scripts/publish.ts --delete-version content-20260811132640160
//
// 6. 异常状态下强行解除并发任务挂起锁:
//    npx tsx scripts/publish.ts --force-unlock
//
// 7. 通过 Remote Webhook Endpoint 远程发版:
//    PUBLICATION_ENDPOINT="https://book.ncuos.com/api/admin/publish-notion" PUBLICATION_ADMIN_TOKEN="xxx" npx tsx scripts/publish.ts --all

type CommandBody =
  | { operation: "publish"; dryRun: boolean; all?: true; pageIds?: string[] }
  | { operation: "rollback"; version: string }
  | { operation: "delete"; version: string }
  | { forceUnlock: true };

export {};

import { loadEnvConfig } from "@next/env";
import { runNotionPublicationCommand } from "../lib/publishing/pipeline";
import { parseCommand } from "../lib/publishing/route";
import { forceReleaseZombieJobs } from "../lib/publishing/job-store";

loadEnvConfig(process.cwd());

async function main() {
  const args = process.argv.slice(2);
  const isDirect = args.includes("--direct") || !process.env.PUBLICATION_ENDPOINT;
  const rawBody = parseArguments(args);

  // 处理手动解除僵尸锁
  if ("forceUnlock" in rawBody && rawBody.forceUnlock) {
    process.stdout.write("[INFO] 正在解除发布任务挂起锁与死锁状态...\n");
    if (isDirect) {
      await forceReleaseZombieJobs();
      process.stdout.write("[OK] 已成功解除本地/数据库发布任务挂起锁。\n");
      return;
    }
    const endpoint = environment("PUBLICATION_ENDPOINT");
    const token = environment("PUBLICATION_ADMIN_TOKEN");
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ forceUnlock: true }),
    });
    const result = await response.json().catch(() => ({ ok: false, error: "invalid_response" }));
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (!response.ok) process.exitCode = 1;
    return;
  }

  const command = parseCommand(rawBody);
  if (!command) usage("Invalid publication command arguments");

  let result: unknown;

  if (isDirect) {
    process.stdout.write(`[INFO] [CLI Direct Pipeline] 正在直连执行 [${command.operation}] 命令...\n`);
    try {
      result = await runNotionPublicationCommand(command);
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      process.stderr.write(`[ERROR] [Direct Operation Failure] ${reason}\n`);
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

// 解析 CLI 参数 (--all, --page, --rollback, --delete-version, --force-unlock, --dry-run)
function parseArguments(values: string[]): CommandBody {
  if (values.includes("--force-unlock")) {
    return { forceUnlock: true };
  }

  const rollbackIndex = values.indexOf("--rollback");
  if (rollbackIndex >= 0) {
    const version = values[rollbackIndex + 1];
    if (!version) usage("--rollback requires a content version");
    return { operation: "rollback", version };
  }

  const deleteIndex = values.indexOf("--delete-version");
  if (deleteIndex >= 0) {
    const version = values[deleteIndex + 1];
    if (!version) usage("--delete-version requires a content version");
    return { operation: "delete", version };
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
  if (pageIds.length === 0) usage("choose --all, --page <id>, --rollback <version>, --delete-version <version>, or --force-unlock");
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
  process.stderr.write(
    `${reason}\nUsage: node scripts/publish.ts [--dry-run] (--all | --page <id>...) | --rollback <version> | --delete-version <version> | --force-unlock\n`,
  );
  process.exit(2);
}
