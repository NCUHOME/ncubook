// 管理员评测题库管理与数据飞轮 API 路由 (app/api/admin/evals/cases/route.ts)
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/publishing/auth";
import type { EvaluationCase, TestConfig } from "@/scripts/eval";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const isAuthenticated = await authenticateAdminRequest(request);
  if (!isAuthenticated) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const filePath = join(process.cwd(), "evals/test.json");
    const raw = await readFile(filePath, "utf8");
    const config = JSON.parse(raw) as TestConfig;
    return NextResponse.json({ ok: true, cases: config.cases, thresholds: config.thresholds });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "读取题库失败";
    return NextResponse.json({ ok: false, error: errorMsg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const isAuthenticated = await authenticateAdminRequest(request);
  if (!isAuthenticated) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      newCase?: EvaluationCase;
    };

    const newCase = body.newCase;
    if (!newCase || !newCase.id || !newCase.question) {
      return NextResponse.json({ ok: false, error: "缺少题目 ID 或提问内容" }, { status: 400 });
    }

    const filePath = join(process.cwd(), "evals/test.json");
    const raw = await readFile(filePath, "utf8");
    const config = JSON.parse(raw) as TestConfig;

    // 检查是否已有同 ID 用例，有则更新，无则追加
    const existingIndex = config.cases.findIndex((c) => c.id === newCase.id);
    if (existingIndex >= 0) {
      config.cases[existingIndex] = newCase;
    } else {
      config.cases.push(newCase);
    }

    await writeFile(filePath, JSON.stringify(config, null, 2), "utf8");

    return NextResponse.json({
      ok: true,
      caseCount: config.cases.length,
      savedCase: newCase,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "保存题库用例失败";
    return NextResponse.json({ ok: false, error: errorMsg }, { status: 500 });
  }
}
