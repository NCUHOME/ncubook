// AI 问答准确率与防幻觉质量评测脚本 (scripts/eval.ts)
// 用法:
//   - 在线全量评测: ANSWER_EVAL_ENDPOINT="http://127.0.0.1:3000/api/ask" npm run eval
//   - 离线基准评测: npm run eval -- --mock （基于本地算法基准运行算法质量线验证）
//
// 评测指标实现合并自原 lib/ai/eval.ts 的 evaluateAnswerSessions（X9），全仓仅此一份。

import { readFile } from "node:fs/promises";
import { createAnswerFixture, type AnswerSession } from "../lib/ai/session";

export {};

type EvaluationCase = {
  id: string;
  expectedAnswerable: boolean;
  riskClass: "normal" | "sensitive" | "adversarial";
};

type EvaluationQuestion = EvaluationCase & { question: string };

type EvaluationResult = {
  citationValidity: number;
  abstentionAccuracy: number;
  unsupportedSensitiveClaims: number;
  forbiddenHallucinations: number;
};

type Thresholds = EvaluationResult & { p95LatencyMs: number };
type TestConfig = { thresholds: Thresholds; cases: EvaluationQuestion[] };

// 问答召回率、弃权准确度、事实归因精度与防幻觉评测指标计算
function evaluateAnswerSessions(cases: EvaluationCase[], sessions: Map<string, AnswerSession>): EvaluationResult {
  let citations = 0;
  let validCitations = 0;
  let abstentionCases = 0;
  let correctAbstentions = 0;
  let unsupportedSensitiveClaims = 0;
  let forbiddenHallucinations = 0;

  for (const evaluationCase of cases) {
    const session = sessions.get(evaluationCase.id);
    if (!session) {
      if (!evaluationCase.expectedAnswerable) {
        abstentionCases += 1;
        correctAbstentions += 1;
      }
      continue;
    }
    const citationIds = new Set(session.citations.map((citation) => citation.id));
    for (const claim of session.claims) {
      for (const citationId of claim.citationIds) {
        citations += 1;
        if (citationIds.has(citationId) && session.citations.find((citation) => citation.id === citationId)?.anchor.startsWith("b-")) validCitations += 1;
      }
    }
    if (!evaluationCase.expectedAnswerable) {
      abstentionCases += 1;
      if (session.confidence === "insufficient" && session.claims.length === 0) correctAbstentions += 1;
      else forbiddenHallucinations += session.claims.length;
    }
    if (evaluationCase.riskClass === "sensitive") {
      unsupportedSensitiveClaims += session.claims.filter((claim) => claim.status === "grounded" || claim.citationIds.length === 0).length;
    }
  }

  return {
    citationValidity: citations === 0 ? 1 : validCitations / citations,
    abstentionAccuracy: abstentionCases === 0 ? 1 : correctAbstentions / abstentionCases,
    unsupportedSensitiveClaims,
    forbiddenHallucinations,
  };
}

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

async function main() {
  const isMockMode = process.argv.includes("--mock") || process.argv.includes("--fixture") || Boolean(process.env.EVAL_MOCK);
  const endpoint = process.env.ANSWER_EVAL_ENDPOINT;

  if (!endpoint && !isMockMode) {
    fail("ANSWER_EVAL_ENDPOINT is required for live evaluation. Use '--mock' for offline benchmark evaluation.");
  }

  // 读取用例题库与合格线配置
  const testConfig = JSON.parse(await readFile(new URL("../evals/test.json", import.meta.url), "utf8")) as TestConfig;
  const cases = testConfig.cases;
  const thresholds = testConfig.thresholds;

  const sessions = new Map<string, AnswerSession>();
  const latencies: number[] = [];

  // 遍历题目请求 AI 问答或生成基准会话并记录延迟
  for (const evaluationCase of cases) {
    const startedAt = performance.now();
    let session: AnswerSession;

    if (isMockMode) {
      session = createAnswerFixture(evaluationCase.question);
    } else {
      const response = await fetch(endpoint!, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: evaluationCase.question }),
      });
      if (!response.ok) fail(`Evaluation ${evaluationCase.id} returned HTTP ${response.status}`);
      session = (await response.json()) as AnswerSession;
    }

    latencies.push(performance.now() - startedAt);
    sessions.set(evaluationCase.id, session);
  }

  // 汇总统计指标并计算 P95 延迟
  latencies.sort((left, right) => left - right);
  const metrics = {
    ...evaluateAnswerSessions(cases, sessions),
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
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
