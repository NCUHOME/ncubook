// API 路由：学生反馈与勘误收集接口 (Node.js runtime，含 IP 限流，预留后续接入飞书问卷 Lark Forms)
import { NextRequest, NextResponse } from "next/server";
import { createMinuteRateLimiter } from "@/lib/ai/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const checkFeedbackRateLimit = createMinuteRateLimiter(30);

export async function GET() {
  return NextResponse.json({
    message: "Use POST to submit feedback. Reserved for Lark Form integration.",
    larkFormConfigured: Boolean(process.env.LARK_FORM_URL),
    fields: ["pagePath", "question", "comment", "cardSlug"],
  });
}

export async function POST(req: NextRequest) {
  if (!checkFeedbackRateLimit(req)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  try {
    const payload = (await req.json().catch(() => ({}))) as {
      pagePath?: string;
      question?: string;
      comment?: string;
      cardSlug?: string;
    };

    if (!payload.question && !payload.comment && !payload.cardSlug) {
      return NextResponse.json({ error: "missing_feedback_content" }, { status: 400 });
    }

    // 预留：后续接入飞书问卷 (Lark Forms) / 多维表格 Webhook
    const larkFormUrl = process.env.LARK_FORM_URL;
    if (larkFormUrl) {
      return NextResponse.json({ ok: true, redirectedToLark: true, larkFormUrl });
    }

    return NextResponse.json({
      ok: true,
      stored: false,
      message: "Feedback received. Reserved for Lark Form integration.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "feedback_internal_error";
    return NextResponse.json({ error: "feedback_failed", message }, { status: 500 });
  }
}
