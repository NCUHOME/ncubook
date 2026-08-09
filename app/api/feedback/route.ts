// API 路由：学生反馈与勘误收集接口 (Node.js runtime，含 IP 分钟级 Rate Limit 限流防护与 Supabase 数据表写入)
import { NextRequest, NextResponse } from "next/server";
import { createMinuteRateLimiter } from "@/lib/ai/route";
import { getSupabaseAdmin } from "@/lib/integrations/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const checkFeedbackRateLimit = createMinuteRateLimiter(30);

export async function GET() {
  return NextResponse.json({
    message: "Use POST to submit feedback.",
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

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ ok: true, stored: false });
    }

    const { error } = await supabase.from("student_feedback").insert({
      page_path: payload.pagePath || null,
      question: payload.question || null,
      comment: payload.comment || null,
      card_slug: payload.cardSlug || null,
      status: "new",
    });

    if (error) {
      return NextResponse.json({ error: "feedback_write_failed", details: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, stored: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "feedback_internal_error";
    return NextResponse.json({ error: "feedback_failed", message }, { status: 500 });
  }
}
