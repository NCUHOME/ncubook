// Notion 发布引擎：Notion 远程发布与版本回滚指令解析与契约类型定义
export type PublicationCommand =
  | { operation: "publish"; dryRun: boolean; all: boolean; pageIds: string[]; contentVersion?: string }
  | { operation: "rollback"; version: string };

export type PublicationCommandRunner = (command: PublicationCommand) => Promise<Record<string, unknown>>;

export function parseCommand(value: unknown): PublicationCommand | null {
  if (!isRecord(value)) return null;
  if (value.operation === "rollback") {
    return typeof value.version === "string" && value.version.trim()
      ? { operation: "rollback", version: value.version.trim() }
      : null;
  }
  if (value.operation !== "publish") return null;

  const pageIds = Array.isArray(value.pageIds)
    ? value.pageIds.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim())
    : [];
  const all = value.all === true;
  if (!all && pageIds.length === 0) return null;
  if (new Set(pageIds).size !== pageIds.length) return null;
  const contentVersion = typeof value.contentVersion === "string" && value.contentVersion.trim()
    ? value.contentVersion.trim()
    : undefined;
  return { operation: "publish", dryRun: value.dryRun === true, all, pageIds, contentVersion };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
