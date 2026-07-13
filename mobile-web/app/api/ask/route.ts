import { NextRequest, NextResponse } from "next/server";
import { createAnswerFixture } from "@/lib/answers/session";

export async function POST(request: NextRequest) {
  const body = await request.json() as {
    question?: string;
    pageContext?: { pageId: string; anchor?: string };
  };
  const question = body.question?.trim();
  if (!question) return NextResponse.json({ error: "Question is required" }, { status: 400 });
  return NextResponse.json(createAnswerFixture(question, body.pageContext));
}
