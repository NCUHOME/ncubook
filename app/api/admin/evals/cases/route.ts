import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/publishing/auth";
import { validateEvaluationCase, type TestConfig } from "@/lib/ai/eval";

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
      newCase?: unknown;
    };

    const validation = validateEvaluationCase(body.newCase);
    if (!validation.valid) {
      return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
    }

    const newCase = validation.data;
    const filePath = join(process.cwd(), "evals/test.json");
    let config: TestConfig;

    try {
      const raw = await readFile(filePath, "utf8");
      config = JSON.parse(raw) as TestConfig;
    } catch {
      return NextResponse.json({ ok: false, error: "无法读取评测题库原始文件" }, { status: 500 });
    }

    // 检查是否已有同 ID 用例，有则更新，无则追加
    const existingIndex = config.cases.findIndex((c) => c.id === newCase.id);
    if (existingIndex >= 0) {
      config.cases[existingIndex] = newCase;
    } else {
      config.cases.push(newCase);
    }

    // 写入文件系统（在 Serverless / 只读文件系统下捕获 EROFS 防御性降级）
    try {
      await writeFile(filePath, JSON.stringify(config, null, 2), "utf8");
      return NextResponse.json({
        ok: true,
        caseCount: config.cases.length,
        savedCase: newCase,
        isPersisted: true,
      });
    } catch (writeErr) {
      const isReadOnly =
        (writeErr as { code?: string })?.code === "EROFS" ||
        (writeErr instanceof Error && writeErr.message.toLowerCase().includes("read-only"));

      if (isReadOnly) {
        return NextResponse.json({
          ok: true,
          caseCount: config.cases.length,
          savedCase: newCase,
          isPersisted: false,
          warning: "当前运行在只读生产/Serverless 环境，用例未能直接写入磁盘，请复制保存并提交至代码库。",
        });
      }

      throw writeErr;
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "保存题库用例失败";
    return NextResponse.json({ ok: false, error: errorMsg }, { status: 500 });
  }
}
