// 单测：全面集成测试管理后台全部数据写入、更新与配置流转 API
import { describe, expect, it, vi, beforeEach } from "vitest";
import { GET as getConfig, POST as postConfig } from "@/app/api/admin/config/route";
import { GET as getFeedbacks, PATCH as patchFeedbacks } from "@/app/api/admin/feedbacks/route";
import { GET as getPublish, POST as postPublish } from "@/app/api/admin/publish-notion/route";
import { POST as postCases } from "@/app/api/admin/evals/cases/route";
import { POST as postInspect } from "@/app/api/admin/ask/inspect/route";
import { createAdminSessionToken } from "@/lib/publishing/auth";
import * as supabaseIntegrations from "@/lib/integrations/supabase";

describe("admin data mutation & update endpoints suite", () => {
  const secret = "test-secret-key-admin-portal-123456789";
  process.env.ADMIN_PASSWORD = secret;
  const validToken = createAdminSessionToken(secret);

  const mockUpsert = vi.fn().mockResolvedValue({ error: null });
  const mockSelect = vi.fn().mockReturnValue({
    order: vi.fn().mockReturnValue({
      limit: vi.fn().mockResolvedValue({
        data: [
          {
            id: "fb-1",
            target_type: "article",
            target_id: "/docs/xinsheng",
            is_helpful: false,
            comment: "信息有待更新",
            created_at: "2026-08-20T12:00:00Z",
            metadata: { status: "pending" },
          },
        ],
        error: null,
      }),
    }),
    eq: vi.fn().mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({
        data: { metadata: { status: "pending" } },
        error: null,
      }),
    }),
  });
  const mockUpdate = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: null }),
  });

  const mockSupabase = {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "site_configs") {
        return {
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
          upsert: mockUpsert,
          update: mockUpdate,
        };
      }
      if (table === "user_feedbacks") {
        return {
          select: mockSelect,
          update: mockUpdate,
        };
      }
      if (table === "evaluation_cases") {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
          upsert: vi.fn().mockResolvedValue({ error: null }),
          update: mockUpdate,
        };
      }
      return {
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
        upsert: vi.fn().mockResolvedValue({ error: null }),
        update: mockUpdate,
      };
    }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(supabaseIntegrations, "getSupabaseAdmin").mockReturnValue(mockSupabase as any);
  });

  describe("1. 站点公共信息配置更新 (POST /api/admin/config)", () => {
    it("rejects unauthenticated POST with 401", async () => {
      const req = new Request("http://localhost:3000/api/admin/config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key: "home_hero", value: { title: "测试标语" } }),
      });
      const res = await postConfig(req);
      expect(res.status).toBe(401);
    });

    it("rejects invalid payload missing key with 400", async () => {
      const req = new Request("http://localhost:3000/api/admin/config", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `admin_session=${validToken}`,
        },
        body: JSON.stringify({ value: {} }),
      });
      const res = await postConfig(req);
      expect(res.status).toBe(400);
    });

    it("successfully updates all 8 configuration domains", async () => {
      const configTestCases = [
        { key: "search_config", value: { placeholder: "新搜索占位符", chips: ["测试标签"] } },
        { key: "ai_config", value: { suggestedQuestions: ["测试问题 1"] } },
        { key: "home_hero", value: { title: "新标语<br>测试", quote: "新名人名言" } },
        { key: "home_notice", value: { title: "新公告", desc: "新公告内容" } },
        { key: "home_contribute", value: { email: "test@ncu.edu.cn", qq_group: "123456" } },
        { key: "footer_config", value: { thankPrefix: "感谢测试同学" } },
        { key: "article_feedback_config", value: { prompt: "本指南有帮助吗？" } },
        { key: "article_groups", value: { 学习: { 新生: "基础" } } },
      ];

      for (const item of configTestCases) {
        const req = new Request("http://localhost:3000/api/admin/config", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            cookie: `admin_session=${validToken}`,
          },
          body: JSON.stringify(item),
        });
        const res = await postConfig(req);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.ok).toBe(true);
        expect(data.key).toBe(item.key);
      }
      expect(mockUpsert).toHaveBeenCalledTimes(8);
    });
  });

  describe("2. 用户反馈工单状态流转与归档 (PATCH /api/admin/feedbacks)", () => {
    it("rejects unauthenticated PATCH with 401", async () => {
      const req = new Request("http://localhost:3000/api/admin/feedbacks", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: "fb-1", status: "resolved" }),
      });
      const res = await patchFeedbacks(req);
      expect(res.status).toBe(401);
    });

    it("rejects invalid status transition with 400", async () => {
      const req = new Request("http://localhost:3000/api/admin/feedbacks", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: `admin_session=${validToken}`,
        },
        body: JSON.stringify({ id: "fb-1", status: "invalid_status" }),
      });
      const res = await patchFeedbacks(req);
      expect(res.status).toBe(400);
    });

    it("successfully updates single feedback status to resolved", async () => {
      const req = new Request("http://localhost:3000/api/admin/feedbacks", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: `admin_session=${validToken}`,
        },
        body: JSON.stringify({ id: "fb-1", status: "resolved" }),
      });
      const res = await patchFeedbacks(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.status).toBe("resolved");
      expect(data.updatedCount).toBe(1);
    });

    it("successfully batch archives multiple feedbacks", async () => {
      const req = new Request("http://localhost:3000/api/admin/feedbacks", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: `admin_session=${validToken}`,
        },
        body: JSON.stringify({ ids: ["fb-1", "fb-2"], status: "archived" }),
      });
      const res = await patchFeedbacks(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.status).toBe("archived");
      expect(data.updatedCount).toBe(2);
    });
  });

  describe("3. 内容发布与版本管理 (POST /api/admin/publish-notion)", () => {
    it("rejects unauthenticated POST with 401", async () => {
      const req = new Request("http://localhost:3000/api/admin/publish-notion", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ forceUnlock: true }),
      });
      const res = await postPublish(req);
      expect(res.status).toBe(401);
    });

    it("handles forceUnlock action to release zombie mutexes", async () => {
      const req = new Request("http://localhost:3000/api/admin/publish-notion", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `admin_session=${validToken}`,
        },
        body: JSON.stringify({ forceUnlock: true }),
      });
      const res = await postPublish(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.message).toContain("解除僵尸任务挂起锁");
    });
  });

  describe("4. 评测用例新增与飞轮入库 (POST /api/admin/evals/cases)", () => {
    it("rejects unauthenticated POST with 401", async () => {
      const req = new Request("http://localhost:3000/api/admin/evals/cases", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ newCase: {} }),
      });
      const res = await postCases(req);
      expect(res.status).toBe(401);
    });

    it("rejects invalid case payload with 400", async () => {
      const req = new Request("http://localhost:3000/api/admin/evals/cases", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `admin_session=${validToken}`,
        },
        body: JSON.stringify({ newCase: { id: "incomplete-case" } }),
      });
      const res = await postCases(req);
      expect(res.status).toBe(400);
    });

    it("successfully creates and saves a new evaluation case", async () => {
      const validCase = {
        id: "case-custom-test-1",
        question: "南昌大学保卫处电话是多少？",
        category: "校园安全",
        expectedAnswerable: true,
        riskClass: "normal",
        expectedFacts: ["0791-83969110"],
        forbiddenKeywords: ["110直接出警"],
      };

      const req = new Request("http://localhost:3000/api/admin/evals/cases", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `admin_session=${validToken}`,
        },
        body: JSON.stringify({ newCase: validCase }),
      });
      const res = await postCases(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.savedCase.question).toBe(validCase.question);
    });
  });

  describe("5. 问答调试沙盒探针 (POST /api/admin/ask/inspect)", () => {
    it("rejects unauthenticated POST with 401", async () => {
      const req = new Request("http://localhost:3000/api/admin/ask/inspect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: "测试问题" }),
      });
      const res = await postInspect(req);
      expect(res.status).toBe(401);
    });

    it("rejects empty question with 400", async () => {
      const req = new Request("http://localhost:3000/api/admin/ask/inspect", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `admin_session=${validToken}`,
        },
        body: JSON.stringify({ question: "" }),
      });
      const res = await postInspect(req);
      expect(res.status).toBe(400);
    });

    it("returns inspection diagnostic payload in fixture/mock mode", async () => {
      const req = new Request("http://localhost:3000/api/admin/ask/inspect", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `admin_session=${validToken}`,
        },
        body: JSON.stringify({ question: "校园环游车怎么坐？", forceMock: true }),
      });
      const res = await postInspect(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.inspection).toBeDefined();
      expect(data.inspection.mode).toBe("mock");
      expect(data.session).toBeDefined();
    });
  });
});
