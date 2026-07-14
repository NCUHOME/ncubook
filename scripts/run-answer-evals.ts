import { readFile } from "node:fs/promises";

export {};

type EvaluationCase = { id: string; question: string; expectedAnswerable: boolean; riskClass: string };
type Thresholds = { citationValidity: number; abstentionAccuracy: number; unsupportedSensitiveClaims: number; forbiddenHallucinations: number; p95LatencyMs: number };
type Session = { confidence: string; claims: Array<{ citationIds: string[]; status: string }>; citations: Array<{ id: string; anchor: string }> };

const endpoint = process.env.ANSWER_EVAL_ENDPOINT;
if (!endpoint) fail("ANSWER_EVAL_ENDPOINT is required");
const cases = JSON.parse(await readFile(new URL("../evals/cases.json", import.meta.url), "utf8")) as EvaluationCase[];
const thresholds = JSON.parse(await readFile(new URL("../evals/thresholds.json", import.meta.url), "utf8")) as Thresholds;
let totalCitations = 0;
let validCitations = 0;
let abstentions = 0;
let correctAbstentions = 0;
let unsupportedSensitiveClaims = 0;
let forbiddenHallucinations = 0;
const latencies: number[] = [];

for (const evaluationCase of cases) {
  const startedAt = performance.now();
  const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question: evaluationCase.question }) });
  latencies.push(performance.now() - startedAt);
  if (!response.ok) fail(`Evaluation ${evaluationCase.id} returned HTTP ${response.status}`);
  const session = await response.json() as Session;
  const citationIds = new Set(session.citations.map((citation) => citation.id));
  for (const claim of session.claims) for (const id of claim.citationIds) {
    totalCitations += 1;
    if (citationIds.has(id) && session.citations.find((citation) => citation.id === id)?.anchor.startsWith("b-")) validCitations += 1;
  }
  if (!evaluationCase.expectedAnswerable) {
    abstentions += 1;
    if (session.confidence === "insufficient" && session.claims.length === 0) correctAbstentions += 1;
    else forbiddenHallucinations += session.claims.length;
  }
  if (evaluationCase.riskClass === "sensitive") unsupportedSensitiveClaims += session.claims.filter((claim) => claim.status === "grounded" || claim.citationIds.length === 0).length;
}

latencies.sort((left, right) => left - right);
const metrics = {
  citationValidity: totalCitations === 0 ? 1 : validCitations / totalCitations,
  abstentionAccuracy: abstentions === 0 ? 1 : correctAbstentions / abstentions,
  unsupportedSensitiveClaims,
  forbiddenHallucinations,
  p95LatencyMs: latencies[Math.max(0, Math.ceil(latencies.length * 0.95) - 1)] ?? 0,
};
process.stdout.write(`${JSON.stringify(metrics, null, 2)}\n`);
if (metrics.citationValidity < thresholds.citationValidity
  || metrics.abstentionAccuracy < thresholds.abstentionAccuracy
  || metrics.unsupportedSensitiveClaims > thresholds.unsupportedSensitiveClaims
  || metrics.forbiddenHallucinations > thresholds.forbiddenHallucinations
  || metrics.p95LatencyMs > thresholds.p95LatencyMs) fail("Grounded answer evaluation thresholds failed");

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}
