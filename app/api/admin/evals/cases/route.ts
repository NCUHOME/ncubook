// API 路由：评测题库用例管理与持久化 (优先 Supabase evaluation_cases 表存储，自动同步本地基准题库)
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/publishing/auth";
import {
  fetchEvaluationCasesFromSupabase,
  saveEvaluationCaseToSupabase,
  validateEvaluationCase,
  type TestConfig,
  type Thresholds,
} from "@/lib/ai/eval";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const defaultThresholds: Thresholds = {
  citationValidity: 1,
  abstentionAccuracy: 1,
  unsupportedSensitiveClaims: 0,
  forbiddenHallucinations: 0,
  factualityRate: 1,
  p95LatencyMs: 5000,
};

export async function GET(request: Request) {
  const isAuthenticated = await authenticateAdminRequest(request);
  if (!isAuthenticated) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    let thresholds = defaultThresholds;
    const filePath = join(process.cwd(), "evals/test.json");
    let fileCases: TestConfig["cases"] = [];

    try {
      const raw = await readFile(filePath, "utf8");
      const config = JSON.parse(raw) as TestConfig;
      if (config.thresholds) thresholds = config.thresholds;
      if (config.cases) fileCases = config.cases;
    } catch {
      // 忽略文件读取错误（如无本地文件环境）
    }

    const dbCases = await fetchEvaluationCasesFromSupabase();
    const finalCases = dbCases && dbCases.length > 0 ? dbCases : fileCases;

    return NextResponse.json({ ok: true, cases: finalCases, thresholds });
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

    // 1. 优先保存至 Supabase 数据库
    const isSavedToDb = await saveEvaluationCaseToSupabase(newCase);

    // 2. 尝试同步至本地文件（在开发环境保持 test.json 更新，在只读/Serverless 环境下安全忽略）
    const filePath = join(process.cwd(), "evals/test.json");
    try {
      const raw = await readFile(filePath, "utf8");
      const config = JSON.parse(raw) as TestConfig;
      const existingIndex = config.cases.findIndex((c) => c.id === newCase.id);
      if (existingIndex >= 0) {
        config.cases[existingIndex] = newCase;
      } else {
        config.cases.push(newCase);
      }
      await writeFile(filePath, JSON.stringify(config, null, 2), "utf8");
    } catch {
      // 静默降级，数据库持久化优先
    }

    return NextResponse.json({
      ok: true,
      savedCase: newCase,
      isPersisted: isSavedToDb,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "保存题库用例失败";
    return NextResponse.json({ ok: false, error: errorMsg }, { status: 500 });
  }
}
