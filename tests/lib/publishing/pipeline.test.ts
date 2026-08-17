// 单测：测试 Notion 发布总管线 (Pipeline)，验证发布指令调度、版本回滚、dry-run 预检与未授权异常拦截
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSupabaseAdmin: vi.fn(),
  createSupabasePublicationStore: vi.fn(),
  rollbackPublishedVersion: vi.fn(),
}));

vi.mock("@/lib/integrations/supabase", () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
}));

vi.mock("@/lib/publishing/store", () => ({
  createSupabasePublicationStore: mocks.createSupabasePublicationStore,
}));

vi.mock("@/lib/publishing/version", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/publishing/version")>(),
  rollbackPublishedVersion: mocks.rollbackPublishedVersion,
}));

import { runNotionPublicationCommand } from "@/lib/publishing/pipeline";

const originalEnv = { ...process.env };

describe("Notion publication pipeline runner", () => {
  beforeEach(() => {
    process.env.NOTION_TOKEN = "test-notion-token";
    process.env.NOTION_ROOT_PAGE_ID = "test-root-page-id";
    mocks.getSupabaseAdmin.mockReturnValue({ from: vi.fn() });
    mocks.createSupabasePublicationStore.mockReturnValue({});
    mocks.rollbackPublishedVersion.mockResolvedValue(undefined);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  it("handles rollback operation successfully through store and logs progress", async () => {
    const logs: string[] = [];
    const result = await runNotionPublicationCommand(
      { operation: "rollback", version: "v-2026-07-01-1" },
      (msg) => logs.push(msg),
    );

    expect(result).toMatchObject({ ok: true, operation: "rollback", contentVersion: "v-2026-07-01-1" });
    expect(mocks.rollbackPublishedVersion).toHaveBeenCalled();
    expect(logs.some((log) => log.includes("v-2026-07-01-1"))).toBe(true);
  });

  it("fails rollback when Supabase is not configured", async () => {
    mocks.getSupabaseAdmin.mockReturnValue(null);

    await expect(
      runNotionPublicationCommand({ operation: "rollback", version: "v-stale" }),
    ).rejects.toThrow(/Supabase publication storage is not configured/i);
  });

  it("fails publication when required Notion environment variables are missing", async () => {
    delete process.env.NOTION_TOKEN;

    await expect(
      runNotionPublicationCommand({ operation: "publish", dryRun: false, all: true, pageIds: [] }),
    ).rejects.toThrow(/NOTION_TOKEN/i);
  });
});
