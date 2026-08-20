// 单测：全面测试面向普通学生端的前台公共 API 路由 (analytics 埋点、feedback 反馈、config 配置读取)
import { describe, expect, it, vi, beforeEach } from "vitest";
import { POST as postAnalytics } from "@/app/api/analytics/route";
import { POST as postFeedback } from "@/app/api/feedback/route";
import { GET as getConfig } from "@/app/api/config/route";
import * as supabaseIntegrations from "@/lib/integrations/supabase";

describe("client-side public API routes suite", () => {
  const mockInsert = vi.fn().mockResolvedValue({ error: null });
  const mockSupabase = {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "analytics_events" || table === "user_feedbacks") {
        return {
          insert: mockInsert,
        };
      }
      if (table === "site_configs") {
        return {
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
          upsert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      return {
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
        insert: mockInsert,
      };
    }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(supabaseIntegrations, "getSupabaseAdmin").mockReturnValue(mockSupabase as any);
  });

  describe("1. 学生端行为埋点上报 (POST /api/analytics)", () => {
    it("rejects invalid event names with 400", async () => {
      const req = new Request("http://localhost:3000/api/analytics", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ eventName: "invalid_hacker_event" }),
      });
      const res = await postAnalytics(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.ok).toBe(false);
      expect(data.error).toBe("invalid_event_name");
    });

    it("rejects oversized payloads (>4KB) with 400", async () => {
      const hugeData = { overflow: "x".repeat(5000) };
      const req = new Request("http://localhost:3000/api/analytics", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ eventName: "page_view", eventData: hugeData }),
      });
      const res = await postAnalytics(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.ok).toBe(false);
      expect(data.error).toBe("payload_too_large");
    });

    it("successfully collects valid page_view and search events", async () => {
      const validEvents = [
        { eventName: "page_view", eventData: { slug: "xinsheng", title: "新生必看" } },
        { eventName: "search_query", eventData: { query: "选课指南", resultCount: 5 } },
        { eventName: "contact_copied", eventData: { channel: "qq_group" } },
        { eventName: "ai_ask_submitted", eventData: { questionPreview: "校园网费用" } },
      ];

      for (const item of validEvents) {
        const req = new Request("http://localhost:3000/api/analytics", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sessionId: "sess-test-123", ...item }),
        });
        const res = await postAnalytics(req);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.ok).toBe(true);
      }
      expect(mockInsert).toHaveBeenCalledTimes(4);
    });
  });

  describe("2. 学生端文章与AI反馈提交 (POST /api/feedback)", () => {
    it("rejects missing or invalid parameters with 400", async () => {
      const invalidRequests = [
        {},
        { targetType: "unknown" },
        { targetType: "article", targetId: "" },
      ];

      for (const body of invalidRequests) {
        const req = new Request("http://localhost:3000/api/feedback", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        const res = await postFeedback(req);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.ok).toBe(false);
        expect(data.error).toBe("invalid_parameters");
      }
    });

    it("successfully records article and AI answer feedback", async () => {
      const req = new Request("http://localhost:3000/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          targetType: "article",
          targetId: "campus-shuttle",
          isHelpful: true,
          comment: "非常清晰，很有帮助！",
        }),
      });
      const res = await postFeedback(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(mockInsert).toHaveBeenCalledTimes(1);
    });
  });

  describe("3. 全站公共配置只读读取 (GET /api/config)", () => {
    it("returns complete site configuration domains with fallback safety", async () => {
      const res = await getConfig();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data).toBeDefined();
      expect(json.data.search_config).toBeDefined();
      expect(json.data.ai_config).toBeDefined();
      expect(json.data.home_hero).toBeDefined();
      expect(json.data.home_notice).toBeDefined();
      expect(json.data.home_contribute).toBeDefined();
      expect(json.data.footer_config).toBeDefined();
      expect(json.data.article_feedback_config).toBeDefined();
      expect(json.data.article_groups).toBeDefined();
    });
  });
});
