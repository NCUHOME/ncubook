// 单元测试：校验学生反馈与勘误 API 路由 (app/api/feedback/route.ts) 预留飞书问卷 (Lark Forms) 集成响应
import { describe, expect, it } from "vitest";
import { GET, POST } from "@/app/api/feedback/route";
import { NextRequest } from "next/server";

describe("student feedback API route (app/api/feedback/route)", () => {
  it("responds to GET with metadata and Lark Form status", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({
      message: "Use POST to submit feedback. Reserved for Lark Form integration.",
      fields: ["pagePath", "question", "comment", "cardSlug"],
    });
  });

  it("returns 400 Bad Request when mandatory feedback content is missing", async () => {
    const req = new NextRequest("http://localhost:3000/api/feedback", {
      method: "POST",
      body: JSON.stringify({ pagePath: "/docs/transport" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toEqual({ error: "missing_feedback_content" });
  });

  it("returns reserved stub response when submitted without LARK_FORM_URL", async () => {
    const req = new NextRequest("http://localhost:3000/api/feedback", {
      method: "POST",
      headers: { "x-forwarded-for": "192.168.1.100" },
      body: JSON.stringify({
        pagePath: "/docs/campus-shuttle",
        question: "班车时刻表有误？",
        comment: "一栋楼下的站点时间似乎有更新",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({
      ok: true,
      stored: false,
      message: "Feedback received. Reserved for Lark Form integration.",
    });
  });
});
