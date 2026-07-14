import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/db/supabase";

export async function GET() {
  return NextResponse.json({
    message: "Use POST to submit feedback.",
    fields: ["pagePath", "question", "comment", "cardSlug"],
  });
}

export async function POST(req: NextRequest) {
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
}
