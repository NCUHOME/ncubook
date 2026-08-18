// 单测：测试 Notion 发布与回滚指令解析函数 parseCommand
import { describe, expect, it } from "vitest";
import { parseCommand } from "@/lib/publishing/route";

describe("Notion publication command parser (parseCommand)", () => {
  it("parses valid publish commands with all pages or specific pageIds", () => {
    expect(parseCommand({ operation: "publish", all: true, dryRun: false })).toEqual({
      operation: "publish",
      all: true,
      dryRun: false,
      pageIds: [],
      contentVersion: undefined,
    });

    expect(parseCommand({ operation: "publish", all: false, pageIds: ["p1", "p2"], dryRun: true, contentVersion: "v-custom" })).toEqual({
      operation: "publish",
      all: false,
      dryRun: true,
      pageIds: ["p1", "p2"],
      contentVersion: "v-custom",
    });
  });

  it("parses valid rollback commands", () => {
    expect(parseCommand({ operation: "rollback", version: "v-2026-07-01-1" })).toEqual({
      operation: "rollback",
      version: "v-2026-07-01-1",
    });
  });

  it("parses valid delete commands", () => {
    expect(parseCommand({ operation: "delete", version: "v-2026-07-01-1" })).toEqual({
      operation: "delete",
      version: "v-2026-07-01-1",
    });
  });

  it("rejects invalid commands and edge cases", () => {
    expect(parseCommand(null)).toBeNull();
    expect(parseCommand({})).toBeNull();
    expect(parseCommand({ operation: "unknown" })).toBeNull();
    expect(parseCommand({ operation: "rollback", version: "" })).toBeNull();
    expect(parseCommand({ operation: "delete", version: "" })).toBeNull();
    expect(parseCommand({ operation: "publish", all: false, pageIds: [] })).toBeNull(); // 非全量且无页面
    expect(parseCommand({ operation: "publish", all: false, pageIds: ["dup", "dup"] })).toBeNull(); // 重复页面 ID
  });
});
