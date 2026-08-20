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

    const rawTargetType = body.targetType;
    const rawTargetId = (body.targetId ?? "").trim();
    if (!rawTargetType || !["article", "answer"].includes(rawTargetType) || !rawTargetId) {
      return NextResponse.json({ ok: false, error: "invalid_parameters" }, { status: 400 });
    }

    const targetType = rawTargetType as "article" | "answer";
    const targetId = rawTargetId.slice(0, 128);
    const isHelpful = Boolean(body.isHelpful);
    const comment = typeof body.comment === "string" && body.comment.trim() ? body.comment.trim().slice(0, 1000) : null;

    const safeMeta =
      typeof body.metadata === "object" && body.metadata !== null && !Array.isArray(body.metadata)
        ? body.metadata
        : {};

    const supabase = getSupabaseAdmin();
    if (supabase) {
      await supabase.from("user_feedbacks").insert({
        target_type: targetType,
        target_id: targetId,
        is_helpful: isHelpful,
        comment,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metadata: safeMeta as any,
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
            text: `[此间指南反馈] ${targetType === "article" ? "文章" : "AI问答"} [${targetId}] - ${isHelpful ? "有帮助" : "没帮助"}${body.comment ? `\n建议：${body.comment}` : ""}`,
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
