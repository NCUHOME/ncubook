// AI 问答准确率与防幻觉测试脚本 (scripts/test.ts)
// 用法: npm run eval（即 node scripts/test.ts，读取 evals/test.json 并验证算法质量线）
// 必须先启动被测问答服务并通过 ANSWER_EVAL_ENDPOINT 环境变量指向其 /api/ask 端点；
// 缺少该变量时直接失败退出，不会静默降级为本地 fixture。

import { readFile } from "node:fs/promises";
import type { AnswerSession } from "../lib/ai/session";

export {};

type EvaluationCase = { id: string; question: string; expectedAnswerable: boolean; riskClass: string };
type Thresholds = { citationValidity: number; abstentionAccuracy: number; unsupportedSensitiveClaims: number; forbiddenHallucinations: number; p95LatencyMs: number };
type TestConfig = { thresholds: Thresholds; cases: EvaluationCase[] };

// 读取评测 API 端点；缺失即失败，不允许静默降级
const endpoint = process.env.ANSWER_EVAL_ENDPOINT;
if (!endpoint) fail("ANSWER_EVAL_ENDPOINT is required");

// 读取用例题库与合格线配置
const testConfig = JSON.parse(await readFile(new URL("../evals/test.json", import.meta.url), "utf8")) as TestConfig;
const cases = testConfig.cases;
const thresholds = testConfig.thresholds;

let totalCitations = 0;
let validCitations = 0;
let abstentions = 0;
let correctAbstentions = 0;
let unsupportedSensitiveClaims = 0;
let forbiddenHallucinations = 0;
const latencies: number[] = [];

// 遍历题目请求 AI 问答并统计准确率、幻觉率与延迟
for (const evaluationCase of cases) {
  const startedAt = performance.now();
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ question: evaluationCase.question }),
  });
  latencies.push(performance.now() - startedAt);
  if (!response.ok) fail(`Evaluation ${evaluationCase.id} returned HTTP ${response.status}`);
  const session = (await response.json()) as AnswerSession;
  const citationIds = new Set(session.citations.map((citation) => citation.id));

  // 校验 Citation 是否匹配锚点 b-<blockId>
  for (const claim of session.claims) {
    for (const id of claim.citationIds) {
      totalCitations += 1;
      if (citationIds.has(id) && session.citations.find((citation) => citation.id === id)?.anchor.startsWith("b-")) {
        validCitations += 1;
      }
    }
  }

  // 校验拒答逻辑与幻觉率
  if (!evaluationCase.expectedAnswerable) {
    abstentions += 1;
    if (session.confidence === "insufficient" && session.claims.length === 0) correctAbstentions += 1;
    else forbiddenHallucinations += session.claims.length;
  }

  // 校验敏感提问保护
  if (evaluationCase.riskClass === "sensitive") {
    unsupportedSensitiveClaims += session.claims.filter((claim) => claim.status === "grounded" || claim.citationIds.length === 0).length;
  }
}

// 汇总统计指标并计算 P95 延迟
latencies.sort((left, right) => left - right);
const metrics = {
  citationValidity: totalCitations === 0 ? 1 : validCitations / totalCitations,
  abstentionAccuracy: abstentions === 0 ? 1 : correctAbstentions / abstentions,
  unsupportedSensitiveClaims,
  forbiddenHallucinations,
  p95LatencyMs: latencies[Math.max(0, Math.ceil(latencies.length * 0.95) - 1)] ?? 0,
};
process.stdout.write(`${JSON.stringify(metrics, null, 2)}\n`);

// 对照合格线门槛判定测试结果
if (
  metrics.citationValidity < thresholds.citationValidity ||
  metrics.abstentionAccuracy < thresholds.abstentionAccuracy ||
  metrics.unsupportedSensitiveClaims > thresholds.unsupportedSensitiveClaims ||
  metrics.forbiddenHallucinations > thresholds.forbiddenHallucinations ||
  metrics.p95LatencyMs > thresholds.p95LatencyMs
) {
  fail("Grounded answer evaluation thresholds failed");
}

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}
