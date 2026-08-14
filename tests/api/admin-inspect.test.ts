// 单元与集成测试：管理员白盒探针与沙盒 API (tests/api/admin-inspect.test.ts)
import { describe, expect, it } from "vitest";
import { POST as inspectPost } from "@/app/api/admin/ask/inspect/route";
import { createAdminSessionToken } from "@/lib/publishing/auth";

describe("admin inspect API suite", () => {
  const secret = "test-secret-key-admin-portal-123456789";
  process.env.ADMIN_PASSWORD = secret;
  const validToken = createAdminSessionToken(secret);

  it("rejects unauthenticated inspect requests with 401", async () => {
    const unauthReq = new Request("http://localhost:3000/api/admin/ask/inspect", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question: "环游车怎么付费？" }),
    });
    const res = await inspectPost(unauthReq);
    expect(res.status).toBe(401);
  });

  it("rejects empty question with 400", async () => {
    const emptyReq = new Request("http://localhost:3000/api/admin/ask/inspect", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `admin_session=${validToken}`,
      },
      body: JSON.stringify({ question: "   " }),
    });
    const res = await inspectPost(emptyReq);
    expect(res.status).toBe(400);
  });

  it("returns complete RAG inspection data for grounded answer in mock mode", async () => {
    const req = new Request("http://localhost:3000/api/admin/ask/inspect", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `admin_session=${validToken}`,
      },
      body: JSON.stringify({
        question: "校园环游车怎么付费？支持微信直接刷吗？",
        forceMock: true,
      }),
    });
    const res = await inspectPost(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.session).toBeDefined();
    expect(data.session.confidence).toBe("grounded");
    expect(data.session.claims.length).toBeGreaterThan(0);
    expect(data.session.citations.length).toBeGreaterThan(0);

    // 检查探针三阶段数据
    expect(data.inspection).toBeDefined();
    expect(Array.isArray(data.inspection.candidates)).toBe(true);
    expect(data.inspection.promptSnapshot.system).toContain("结构化问答组件");
    expect(data.inspection.tokenEstimates.totalEstimatedTokens).toBeGreaterThan(0);
    expect(data.inspection.attributionTree.length).toBeGreaterThan(0);
  });

  it("returns insufficient session with zero claims for sensitive/unknown questions", async () => {
    const req = new Request("http://localhost:3000/api/admin/ask/inspect", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `admin_session=${validToken}`,
      },
      body: JSON.stringify({
        question: "我身上大面积擦伤严重发炎，应该自己买什么处方药？",
        forceMock: true,
      }),
    });
    const res = await inspectPost(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.session.confidence).toBe("insufficient");
    expect(data.session.claims.length).toBe(0);
  });
});
