// 单元测试：校验飞书同步 API 路由 (app/api/sync/lark/route.ts) 鉴权策略与飞书问卷接入留白
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/sync/lark/route";
import { NextRequest } from "next/server";

describe("Lark sync API route (app/api/sync/lark/route)", () => {
  const originalEnv = process.env.CRON_SECRET;

  beforeEach(() => {
    delete process.env.CRON_SECRET;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.CRON_SECRET = originalEnv;
    } else {
      delete process.env.CRON_SECRET;
    }
  });

  it("returns 503 Service Unavailable when CRON_SECRET is unconfigured (F-04 fix)", async () => {
    const req = new NextRequest("http://localhost:3000/api/sync/lark", {
      method: "POST",
    });

    const res = await POST(req);
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json).toEqual({
      error: "cron_secret_unconfigured",
      reason: "环境变量 CRON_SECRET 未配置",
    });
  });

  it("returns 401 Unauthorized when provided secret is invalid", async () => {
    process.env.CRON_SECRET = "correct-secret-123";

    const req = new NextRequest("http://localhost:3000/api/sync/lark", {
      method: "POST",
      headers: { "x-cron-secret": "wrong-secret" },
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json).toEqual({ error: "unauthorized" });
  });

  it("handles Lark Form sync reserved entrypoint with valid secret", async () => {
    process.env.CRON_SECRET = "correct-secret-123";

    const req = new NextRequest("http://localhost:3000/api/sync/lark?type=lark_form", {
      method: "POST",
      headers: { "x-cron-secret": "correct-secret-123" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({
      ok: true,
      type: "lark_form",
      message: expect.stringContaining("Lark Form"),
    });
  });
});
