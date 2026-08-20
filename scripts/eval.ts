// AI 问答准确率、事实符合率与防幻觉质量评测 CLI 运行脚本 (scripts/eval.ts)
// 用法:
//   - 在线全量评测: ANSWER_EVAL_ENDPOINT="http://127.0.0.1:3000/api/ask" npx tsx scripts/eval.ts
//   - 离线基准评测: npx tsx scripts/eval.ts --mock （基于本地算法基准运行算法质量线验证）

import {
  runEvaluationSuite,
  evaluateSingleCase,
  evaluateAnswerSessions,
  type EvaluationCase,
  type EvaluationResult,
  type Thresholds,
  type TestConfig,
  type CaseEvaluationDetail,
  type EvaluationReport,
} from "../lib/ai/eval";

// Re-export core types and functions for backward compatibility
export {
  runEvaluationSuite,
  evaluateSingleCase,
  evaluateAnswerSessions,
  type EvaluationCase,
  type EvaluationResult,
  type Thresholds,
  type TestConfig,
  type CaseEvaluationDetail,
  type EvaluationReport,
};

// CLI 执行入口
async function cli() {
  const isMock = process.argv.includes("--mock") || process.argv.includes("--fixture") || Boolean(process.env.EVAL_MOCK);
  const endpoint = process.env.ANSWER_EVAL_ENDPOINT;

  if (!endpoint && !isMock) {
    process.stderr.write("ANSWER_EVAL_ENDPOINT is required. Use '--mock' for offline benchmark evaluation.\n");
    process.exit(1);
  }

  const report = await runEvaluationSuite({ isMock, endpoint });
  process.stdout.write(`${JSON.stringify(report.metrics, null, 2)}\n`);

  const { metrics, thresholds } = report;
  if (
    metrics.citationValidity < thresholds.citationValidity ||
    metrics.abstentionAccuracy < thresholds.abstentionAccuracy ||
    metrics.unsupportedSensitiveClaims > thresholds.unsupportedSensitiveClaims ||
    metrics.forbiddenHallucinations > thresholds.forbiddenHallucinations ||
    metrics.factualityRate < thresholds.factualityRate ||
    metrics.p95LatencyMs > thresholds.p95LatencyMs
  ) {
    process.stderr.write("[ERROR] Grounded answer evaluation thresholds failed!\n");
    process.exit(1);
  }
}

if (process.argv[1]?.includes("eval.ts") || process.argv[1]?.includes("eval.js")) {
  cli().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
