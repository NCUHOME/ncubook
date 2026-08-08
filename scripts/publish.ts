// Notion 内容一键发布脚本 (scripts/publish.ts)
// 用法: node scripts/publish.ts [--dry-run] (--all | --page <id>...) | --rollback <version>

type CommandBody =
  | { operation: "publish"; dryRun: boolean; all?: true; pageIds?: string[] }
  | { operation: "rollback"; version: string };

export {};

// 解析命令行参数并获取环境变量
const args = process.argv.slice(2);
const endpoint = environment("PUBLICATION_ENDPOINT");
const token = environment("PUBLICATION_ADMIN_TOKEN");
const body = parseArguments(args);

// 调用后台 Admin 发布接口执行同步/回滚
const response = await fetch(endpoint, {
  method: "POST",
  headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
  body: JSON.stringify(body),
});

// 解析并格式化打印发布结果
const result: unknown = await response.json().catch(() => ({ ok: false, error: "invalid_response" }));
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (!response.ok) process.exitCode = 1;

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
