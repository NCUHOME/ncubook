import { describe, expect, it } from "vitest";
import { POST as runEvalPost } from "@/app/api/admin/evals/run/route";
import { GET as getCases, POST as postCase } from "@/app/api/admin/evals/cases/route";
import { validateEvaluationCase } from "@/lib/ai/eval";
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

  describe("validateEvaluationCase schema tests", () => {
    it("validates correct evaluation case", () => {
      const valid = validateEvaluationCase({
        id: "case-new-1",
        question: "校园网多少钱一个月？",
        category: "网络卡证",
        expectedAnswerable: true,
        riskClass: "normal",
        mustInclude: ["20元", "电信"],
        mustNotInclude: ["免费"],
        expectedPageSlug: "page-network",
      });
      expect(valid.valid).toBe(true);
      if (valid.valid) {
        expect(valid.data.id).toBe("case-new-1");
        expect(valid.data.mustInclude).toEqual(["20元", "电信"]);
      }
    });

    it("rejects invalid fields", () => {
      expect(validateEvaluationCase(null).valid).toBe(false);
      expect(validateEvaluationCase({ id: "" }).valid).toBe(false);
      expect(validateEvaluationCase({ id: "1", question: "" }).valid).toBe(false);
      expect(validateEvaluationCase({ id: "1", question: "q", expectedAnswerable: "yes" }).valid).toBe(false);
      expect(validateEvaluationCase({ id: "1", question: "q", expectedAnswerable: true, riskClass: "invalid" }).valid).toBe(false);
      expect(
        validateEvaluationCase({
          id: "1",
          question: "q",
          expectedAnswerable: true,
          riskClass: "normal",
          mustInclude: "not-array",
        }).valid,
      ).toBe(false);
    });
  });

  it("validates new case input for POST /api/admin/evals/cases", async () => {
    const invalidReq = new Request("http://localhost:3000/api/admin/evals/cases", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `admin_session=${validToken}`,
      },
      body: JSON.stringify({ newCase: { id: "bad" } }),
    });
    const res = await postCase(invalidReq);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.error).toContain("提问内容");
  });

  it("handles valid new case submission for POST /api/admin/evals/cases", async () => {
    const validReq = new Request("http://localhost:3000/api/admin/evals/cases", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `admin_session=${validToken}`,
      },
      body: JSON.stringify({
        newCase: {
          id: "case-test-mock-unit",
          question: "测试题目？",
          expectedAnswerable: true,
          riskClass: "normal",
        },
      }),
    });
    const res = await postCase(validReq);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.savedCase.id).toBe("case-test-mock-unit");
  });
});
