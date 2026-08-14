// 单元与集成测试：管理员评测 API 与数据飞轮路由 (tests/api/admin-evals.test.ts)
import { describe, expect, it, vi } from "vitest";
import { POST as runEvalPost } from "@/app/api/admin/evals/run/route";
import { GET as getCases, POST as postCase } from "@/app/api/admin/evals/cases/route";
import { createAdminSessionToken } from "@/lib/publishing/auth";

describe("admin evals API suite", () => {
  const secret = "test-secret-key-admin-portal-123456789";
  process.env.ADMIN_PASSWORD = secret;
  const validToken = createAdminSessionToken(secret);

  it("rejects unauthenticated requests with 401", async () => {
    const unauthReq = new Request("http://localhost:3000/api/admin/evals/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isMock: true }),
    });
    const res = await runEvalPost(unauthReq);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.ok).toBe(false);
  });

  it("runs mock evaluation suite when authenticated", async () => {
    const authReq = new Request("http://localhost:3000/api/admin/evals/run", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `admin_session=${validToken}`,
      },
      body: JSON.stringify({ isMock: true }),
    });
    const res = await runEvalPost(authReq);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.report).toBeDefined();
    expect(data.report.metrics.citationValidity).toBe(1);
    expect(data.report.metrics.abstentionAccuracy).toBe(1);
    expect(data.report.metrics.factualityRate).toBe(1);
    expect(data.report.details.length).toBeGreaterThanOrEqual(35);
  });

  it("fetches test cases from test.json via GET /api/admin/evals/cases", async () => {
    const authReq = new Request("http://localhost:3000/api/admin/evals/cases", {
      headers: { cookie: `admin_session=${validToken}` },
    });
    const res = await getCases(authReq);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(Array.isArray(data.cases)).toBe(true);
    expect(data.cases.length).toBeGreaterThanOrEqual(35);
  });

  it("validates new case input for POST /api/admin/evals/cases", async () => {
    const invalidReq = new Request("http://localhost:3000/api/admin/evals/cases", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `admin_session=${validToken}`,
      },
      body: JSON.stringify({}),
    });
    const res = await postCase(invalidReq);
    expect(res.status).toBe(400);
  });
});
