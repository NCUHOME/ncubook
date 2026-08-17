// AI 问答准确率、事实符合率与防幻觉质量评测引擎核心算法 (lib/ai/eval.ts)
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createAnswerFixture, type AnswerSession } from "./session";

export type EvaluationCase = {
  id: string;
  question: string;
  category?: string;
  expectedAnswerable: boolean;
  riskClass: "normal" | "sensitive" | "adversarial";
  mustInclude?: string[];
  mustNotInclude?: string[];
  expectedPageSlug?: string;
};

// 评测用例参数强校验与防御收敛
export function validateEvaluationCase(input: unknown): { valid: true; data: EvaluationCase } | { valid: false; error: string } {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { valid: false, error: "用例参数必须为对象结构" };
  }

  const raw = input as Record<string, unknown>;

  if (typeof raw.id !== "string" || !raw.id.trim()) {
    return { valid: false, error: "题目 ID (id) 不能为空且必须为字符串" };
  }

  if (typeof raw.question !== "string" || !raw.question.trim()) {
    return { valid: false, error: "提问内容 (question) 不能为空且必须为字符串" };
  }

  if (typeof raw.expectedAnswerable !== "boolean") {
    return { valid: false, error: "期望是否可答 (expectedAnswerable) 必须为布尔值" };
  }

  const validRiskClasses = ["normal", "sensitive", "adversarial"];
  if (typeof raw.riskClass !== "string" || !validRiskClasses.includes(raw.riskClass)) {
    return { valid: false, error: `风险分类 (riskClass) 必须为 ${validRiskClasses.join(" / ")} 之一` };
  }

  if (raw.category !== undefined && typeof raw.category !== "string") {
    return { valid: false, error: "板块分类 (category) 必须为字符串" };
  }

  if (raw.expectedPageSlug !== undefined && typeof raw.expectedPageSlug !== "string") {
    return { valid: false, error: "关联文档 Slug (expectedPageSlug) 必须为字符串" };
  }

  if (raw.mustInclude !== undefined) {
    if (!Array.isArray(raw.mustInclude) || raw.mustInclude.some((item) => typeof item !== "string")) {
      return { valid: false, error: "关键事实列表 (mustInclude) 必须为字符串数组" };
    }
  }

  if (raw.mustNotInclude !== undefined) {
    if (!Array.isArray(raw.mustNotInclude) || raw.mustNotInclude.some((item) => typeof item !== "string")) {
      return { valid: false, error: "禁用幻觉词列表 (mustNotInclude) 必须为字符串数组" };
    }
  }

  const validated: EvaluationCase = {
    id: raw.id.trim(),
    question: raw.question.trim(),
    category: typeof raw.category === "string" ? raw.category.trim() : undefined,
    expectedAnswerable: raw.expectedAnswerable,
    riskClass: raw.riskClass as "normal" | "sensitive" | "adversarial",
    mustInclude: Array.isArray(raw.mustInclude) ? raw.mustInclude.map((s) => String(s).trim()).filter(Boolean) : undefined,
    mustNotInclude: Array.isArray(raw.mustNotInclude) ? raw.mustNotInclude.map((s) => String(s).trim()).filter(Boolean) : undefined,
    expectedPageSlug: typeof raw.expectedPageSlug === "string" ? raw.expectedPageSlug.trim() : undefined,
  };

  return { valid: true, data: validated };
}

export type EvaluationResult = {
  citationValidity: number;
  abstentionAccuracy: number;
  unsupportedSensitiveClaims: number;
  forbiddenHallucinations: number;
  factualityRate: number;
};

export type Thresholds = EvaluationResult & { p95LatencyMs: number };
export type TestConfig = { thresholds: Thresholds; cases: EvaluationCase[] };

export type CaseEvaluationDetail = {
  id: string;
  question: string;
  category: string;
  expectedAnswerable: boolean;
  riskClass: "normal" | "sensitive" | "adversarial";
  isPass: boolean;
  latencyMs: number;
  failReasons: string[];
  answerSummary: string;
  claimCount: number;
  citationCount: number;
  session?: AnswerSession;
};

export type EvaluationReport = {
  metrics: EvaluationResult & { p95LatencyMs: number; passCount: number; totalCount: number };
  thresholds: Thresholds;
  details: CaseEvaluationDetail[];
};

// 计算单个 Case 的综合判定详情
export function evaluateSingleCase(
  evaluationCase: EvaluationCase,
  session: AnswerSession | undefined,
  latencyMs: number,
): CaseEvaluationDetail {
  const failReasons: string[] = [];
  const category = evaluationCase.category ?? "常规问答";

  if (!session) {
    if (evaluationCase.expectedAnswerable) {
      failReasons.push("期望回答但服务未返回任何结果");
    }
    return {
      id: evaluationCase.id,
      question: evaluationCase.question,
      category,
      expectedAnswerable: evaluationCase.expectedAnswerable,
      riskClass: evaluationCase.riskClass,
      isPass: failReasons.length === 0,
      latencyMs,
      failReasons,
      answerSummary: "未返回会话",
      claimCount: 0,
      citationCount: 0,
    };
  }

  const claimTexts = session.claims.map((c) => c.text).join(" ");
  const citationIds = new Set(session.citations.map((c) => c.id));

  // 1. 出处有效性检查
  for (const claim of session.claims) {
    for (const citationId of claim.citationIds) {
      if (!citationIds.has(citationId)) {
        failReasons.push(`引用了不存在的 Citation ID: ${citationId}`);
      }
      const citation = session.citations.find((c) => c.id === citationId);
      if (citation && !citation.anchor.startsWith("b-")) {
        failReasons.push(`出处锚点非稳定格式: ${citation.anchor}`);
      }
    }
  }

  // 2. 弃权准确性与幻觉检查
  if (!evaluationCase.expectedAnswerable) {
    if (session.confidence !== "insufficient" || session.claims.length > 0) {
      failReasons.push(`不可答/风控问题发生幻觉回答 (产生了 ${session.claims.length} 条观点)`);
    }
  } else {
    // 3. 黄金事实关键词检查 (mustInclude)
    if (evaluationCase.mustInclude && evaluationCase.mustInclude.length > 0) {
      for (const keyword of evaluationCase.mustInclude) {
        if (!claimTexts.includes(keyword)) {
          failReasons.push(`回答缺少关键黄金事实: "${keyword}"`);
        }
      }
    }

    // 4. 黄金禁用词检查 (mustNotInclude)
    if (evaluationCase.mustNotInclude && evaluationCase.mustNotInclude.length > 0) {
      for (const forbidden of evaluationCase.mustNotInclude) {
        if (claimTexts.includes(forbidden)) {
          failReasons.push(`回答包含了禁止的错误事实/幻觉词: "${forbidden}"`);
        }
      }
    }
  }

  // 5. 敏感风控检查
  if (evaluationCase.riskClass === "sensitive") {
    const sensitiveViolation = session.claims.some(
      (claim) => claim.status === "grounded" || claim.citationIds.length === 0,
    );
    if (sensitiveViolation) {
      failReasons.push("敏感安全问题未执行严格风控拦截");
    }
  }

  return {
    id: evaluationCase.id,
    question: evaluationCase.question,
    category,
    expectedAnswerable: evaluationCase.expectedAnswerable,
    riskClass: evaluationCase.riskClass,
    isPass: failReasons.length === 0,
    latencyMs,
    failReasons,
    answerSummary: session.claims.length > 0 ? claimTexts : "（已严格拒答）",
    claimCount: session.claims.length,
    citationCount: session.citations.length,
    session,
  };
}

// 统计全量指标
export function evaluateAnswerSessions(
  cases: EvaluationCase[],
  sessions: Map<string, AnswerSession>,
  latencies: number[],
  thresholds: Thresholds,
): EvaluationReport {
  let citations = 0;
  let validCitations = 0;
  let abstentionCases = 0;
  let correctAbstentions = 0;
  let unsupportedSensitiveClaims = 0;
  let forbiddenHallucinations = 0;
  let factualityCases = 0;
  let factualityPassed = 0;

  const details: CaseEvaluationDetail[] = [];

  for (let i = 0; i < cases.length; i++) {
    const evaluationCase = cases[i];
    if (!evaluationCase) continue;
    const session = sessions.get(evaluationCase.id);
    const latency = latencies[i] ?? 0;

    const detail = evaluateSingleCase(evaluationCase, session, latency);
    details.push(detail);

    if (!session) {
      if (!evaluationCase.expectedAnswerable) {
        abstentionCases += 1;
        correctAbstentions += 1;
      }
      continue;
    }

    const citationIds = new Set(session.citations.map((c) => c.id));
    for (const claim of session.claims) {
      for (const citationId of claim.citationIds) {
        citations += 1;
        if (citationIds.has(citationId) && session.citations.find((c) => c.id === citationId)?.anchor.startsWith("b-")) {
          validCitations += 1;
        }
      }
    }

    if (!evaluationCase.expectedAnswerable) {
      abstentionCases += 1;
      if (session.confidence === "insufficient" && session.claims.length === 0) {
        correctAbstentions += 1;
      } else {
        forbiddenHallucinations += session.claims.length;
      }
    } else {
      factualityCases += 1;
      const mustIncludePassed =
        !evaluationCase.mustInclude || evaluationCase.mustInclude.every((kw) => session.claims.some((c) => c.text.includes(kw)));
      const mustNotIncludePassed =
        !evaluationCase.mustNotInclude || !evaluationCase.mustNotInclude.some((kw) => session.claims.some((c) => c.text.includes(kw)));
      if (mustIncludePassed && mustNotIncludePassed) {
        factualityPassed += 1;
      }
    }

    if (evaluationCase.riskClass === "sensitive") {
      unsupportedSensitiveClaims += session.claims.filter(
        (claim) => claim.status === "grounded" || claim.citationIds.length === 0,
      ).length;
    }
  }

  const sortedLatencies = [...latencies].sort((a, b) => a - b);
  const p95LatencyMs = sortedLatencies[Math.max(0, Math.ceil(sortedLatencies.length * 0.95) - 1)] ?? 0;

  const passCount = details.filter((d) => d.isPass).length;

  return {
    metrics: {
      citationValidity: citations === 0 ? 1 : validCitations / citations,
      abstentionAccuracy: abstentionCases === 0 ? 1 : correctAbstentions / abstentionCases,
      unsupportedSensitiveClaims,
      forbiddenHallucinations,
      factualityRate: factualityCases === 0 ? 1 : factualityPassed / factualityCases,
      p95LatencyMs,
      passCount,
      totalCount: cases.length,
    },
    thresholds,
    details,
  };
}

// 统一评测执行套件 (供 CLI 与 API 路由共用)
export async function runEvaluationSuite(options: {
  isMock: boolean;
  endpoint?: string;
  onProgress?: (current: number, total: number, detail: CaseEvaluationDetail) => void;
}): Promise<EvaluationReport> {
  const filePath = join(process.cwd(), "evals/test.json");
  const testConfig = JSON.parse(await readFile(filePath, "utf8")) as TestConfig;
  const cases = testConfig.cases;
  const thresholds = testConfig.thresholds;

  const sessions = new Map<string, AnswerSession>();
  const latencies: number[] = [];

  for (let i = 0; i < cases.length; i++) {
    const evaluationCase = cases[i];
    if (!evaluationCase) continue;
    const startedAt = performance.now();
    let session: AnswerSession;

    if (options.isMock) {
      session = createAnswerFixture(evaluationCase.question);
    } else {
      if (!options.endpoint) throw new Error("ANSWER_EVAL_ENDPOINT is required for live mode");
      const response = await fetch(options.endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: evaluationCase.question }),
      });
      if (!response.ok) throw new Error(`Case ${evaluationCase.id} failed with HTTP ${response.status}`);
      session = (await response.json()) as AnswerSession;
    }

    const latency = performance.now() - startedAt;
    latencies.push(latency);
    sessions.set(evaluationCase.id, session);

    if (options.onProgress) {
      const detail = evaluateSingleCase(evaluationCase, session, latency);
      options.onProgress(i + 1, cases.length, detail);
    }
  }

  return evaluateAnswerSessions(cases, sessions, latencies, thresholds);
}

export async function saveEvaluationRun(
  mode: "fixture" | "shadow" | "production",
  summary: Record<string, unknown>,
): Promise<string | null> {
  const { getSupabaseAdmin } = await import("@/lib/integrations/supabase");
  const client = getSupabaseAdmin();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from("evaluation_runs")
      .insert({
        mode,
        summary: summary as unknown as import("@/lib/database.types").Json,
      })
      .select("id")
      .single();

    if (error) {
      console.error(JSON.stringify({ event: "save_eval_run_error", error: error.message }));
      return null;
    }
    return data?.id ?? null;
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "save_eval_run_failed",
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    return null;
  }
}
