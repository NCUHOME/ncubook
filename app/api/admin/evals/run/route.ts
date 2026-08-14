// 管理员 AI 质量评测执行 API 路由 (app/api/admin/evals/run/route.ts)
import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/publishing/auth";
import { runEvaluationSuite } from "@/scripts/eval";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const isAuthenticated = await authenticateAdminRequest(request);
  if (!isAuthenticated) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      isMock?: boolean;
      endpoint?: string;
    };

    const isMock = body.isMock ?? true;
    const origin = new URL(request.url).origin;
    const endpoint = body.endpoint ?? `${origin}/api/ask`;

    const report = await runEvaluationSuite({
      isMock,
      endpoint: isMock ? undefined : endpoint,
    });

    return NextResponse.json({
      ok: true,
      report,
      executedAt: new Date().toISOString(),
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "评测执行异常";
    return NextResponse.json({ ok: false, error: errorMsg }, { status: 500 });
  }
}
