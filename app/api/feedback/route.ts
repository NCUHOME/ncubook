// API 路由：学生端提交文章与 AI 问答有用性反馈（持久化至 user_feedbacks 表，可集成飞书通知）
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/integrations/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      targetType?: "article" | "answer";
      targetId?: string;
      isHelpful?: boolean;
      comment?: string;
      metadata?: Record<string, unknown>;
    };

    const targetType = body.targetType;
    const targetId = body.targetId?.trim();
    const isHelpful = Boolean(body.isHelpful);

    if (!targetType || !["article", "answer"].includes(targetType) || !targetId) {
      return NextResponse.json({ ok: false, error: "invalid_parameters" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (supabase) {
      await supabase.from("user_feedbacks").insert({
        target_type: targetType,
        target_id: targetId,
        is_helpful: isHelpful,
        comment: body.comment?.trim() || null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metadata: (body.metadata || {}) as any,
      });
    }

    // 飞书 Webhook 异步分发（若配置）
    const feishuWebhook = process.env.FEISHU_FEEDBACK_WEBHOOK_URL;
    if (feishuWebhook) {
      fetch(feishuWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          msg_type: "text",
          content: {
            text: `📝 [此间指南反馈] ${targetType === "article" ? "文章" : "AI问答"} [${targetId}] - ${isHelpful ? "👍 有帮助" : "👎 没帮助"}${body.comment ? `\n💬 建议：${body.comment}` : ""}`,
          },
        }),
      }).catch((err) => console.error("Feishu webhook notify error:", err));
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "unknown_error" },
      { status: 500 },
    );
  }
}
