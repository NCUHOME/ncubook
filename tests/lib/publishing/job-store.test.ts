import { describe, expect, it, vi } from "vitest";
import {
  calculateProgressAndStage,
  createPersistentJob,
  findActiveRunningJob,
  forceReleaseZombieJobs,
  getPersistentJob,
  updateJobLogs,
} from "@/lib/publishing/job-store";

describe("publishing job-store fail-closed security (Item 1)", () => {
  it("calculates progress percentages correctly across all stages", () => {
    expect(calculateProgressAndStage([], "running")).toEqual({ progressPct: 15, stage: "正在准备" });
    expect(calculateProgressAndStage(["[阶段 1/5] 正在连接 Notion"], "running")).toEqual({ progressPct: 20, stage: "连接知识库" });
    expect(calculateProgressAndStage(["[阶段 2/5] 成功找到文章"], "running")).toEqual({ progressPct: 40, stage: "读取文章列表" });
    expect(calculateProgressAndStage(["已完成 5/10 篇"], "running")).toEqual({ progressPct: 82, stage: "同步文章图片 (5/10)" });
    expect(calculateProgressAndStage([], "success")).toEqual({ progressPct: 100, stage: "已完成" });
    expect(calculateProgressAndStage([], "error")).toEqual({ progressPct: 0, stage: "已中断" });
  });

  it("fails closed when Supabase is not configured", async () => {
    // 默认测试环境下没有配置 SUPABASE_SERVICE_ROLE_KEY
    await expect(createPersistentJob("v-test-1")).rejects.toThrow("Supabase publication storage is unavailable");
    await expect(forceReleaseZombieJobs()).rejects.toThrow("Supabase publication storage is unavailable");
    await expect(updateJobLogs("v-test-1", ["log1"])).rejects.toThrow("Supabase publication storage is unavailable");

    // 查询函数安全返回 null
    expect(await findActiveRunningJob()).toBeNull();
    expect(await getPersistentJob("v-test-1")).toBeNull();
  });
});
