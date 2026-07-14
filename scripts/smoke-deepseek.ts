import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { evaluateSmokeReport, type SmokeAnswerSample, type SmokeCase, type SmokeRetrievalSample } from "../lib/ai/smoke-report.ts";
import { createSupabaseRetrievalRepository, retrieveGroundingSources } from "../lib/ai/retrieve.ts";

const endpoint = environment("EDGEONE_SMOKE_ENDPOINT");
const supabase = createClient(environment("SUPABASE_URL"), environment("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});
const repository = createSupabaseRetrievalRepository(supabase);
const activeContentVersion = await repository.getCurrentVersion();
if (!activeContentVersion) fail("No active content version");

const cases = parseCases(JSON.parse(await readFile(new URL("../evals/edgeone-smoke-cases.json", import.meta.url), "utf8")));
const answerable = cases.filter((item) => item.expectedAnswerable);
const unanswerable = cases.filter((item) => !item.expectedAnswerable);
if (answerable.length !== 5 || unanswerable.length < 3) fail("Smoke corpus must contain five answerable and at least three unanswerable cases");

const retrievalSamples: SmokeRetrievalSample[] = [];
for (const evaluationCase of answerable) {
  const sources = await retrieveGroundingSources({ question: evaluationCase.question, repository, maxCandidates: 8 });
  retrievalSamples.push({
    caseId: evaluationCase.id,
    sourceIds: sources.map((source) => source.id),
    anchors: sources.map((source) => source.anchor),
  });
}

await requestAnswer(endpoint, answerable[0]);
const answers: SmokeAnswerSample[] = [];
for (let index = 0; index < 20; index += 1) {
  answers.push(await requestAnswer(endpoint, answerable[index % answerable.length]));
}
for (const evaluationCase of unanswerable) answers.push(await requestAnswer(endpoint, evaluationCase));

const coldStartEndpoints = (process.env.EDGEONE_COLD_START_ENDPOINTS ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const coldStarts: Array<{ endpointIndex: number; status: number; latencyMs: number; confidence: string }> = [];
for (let index = 0; index < coldStartEndpoints.length; index += 1) {
  const sample = await requestAnswer(coldStartEndpoints[index], answerable[index % answerable.length]);
  coldStarts.push({ endpointIndex: index + 1, status: sample.status, latencyMs: sample.latencyMs, confidence: sample.confidence });
}

const report = evaluateSmokeReport(cases, retrievalSamples, answers, activeContentVersion);
const evidence = answers.map((sample) => ({
  caseId: sample.caseId,
  status: sample.status,
  latencyMs: sample.latencyMs,
  confidence: sample.confidence,
  claimCount: sample.claimCount,
  citationCount: sample.citationCount,
}));
process.stdout.write(`${JSON.stringify({ activeContentVersion, report, coldStarts, evidence }, null, 2)}\n`);

if (report.answerableRecallAt8 < 0.8
  || report.answerableSuccess < 1
  || report.unanswerableAbstention < 1
  || report.citationValidity < 1
  || report.failedRequests > 0
  || report.p95LatencyMs > 5000
  || (coldStartEndpoints.length > 0 && (coldStarts.length !== 3 || coldStarts.some((sample) => sample.status < 200 || sample.status >= 300 || sample.latencyMs > 8000)))) {
  fail("EdgeOne DeepSeek smoke thresholds failed");
}

async function requestAnswer(url: string, evaluationCase: SmokeCase): Promise<SmokeAnswerSample> {
  const startedAt = performance.now();
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ question: evaluationCase.question }),
  });
  const latencyMs = Math.round(performance.now() - startedAt);
  const value: unknown = await response.json().catch(() => null);
  const session = asRecord(value);
  const confidence = parseConfidence(session.confidence, response.ok);
  const claims = Array.isArray(session.claims) ? session.claims.map(asRecord) : [];
  const citations = Array.isArray(session.citations) ? session.citations.map(asRecord) : [];
  return {
    caseId: evaluationCase.id,
    status: response.status,
    latencyMs,
    confidence,
    claimCount: claims.length,
    citationCount: citations.length,
    citationAnchors: citations.map((citation) => typeof citation.anchor === "string" ? citation.anchor : ""),
    citationContentVersions: citations.map((citation) => typeof citation.contentVersion === "string" ? citation.contentVersion : ""),
  };
}

function parseCases(value: unknown): SmokeCase[] {
  if (!Array.isArray(value)) fail("Smoke corpus must be an array");
  return value.map((item) => {
    const record = asRecord(item);
    if (typeof record.id !== "string" || typeof record.question !== "string" || typeof record.expectedAnswerable !== "boolean") {
      fail("Invalid smoke case");
    }
    return {
      id: record.id,
      question: record.question,
      expectedAnswerable: record.expectedAnswerable,
      expectedSourceIds: stringArray(record.expectedSourceIds),
      expectedAnchors: stringArray(record.expectedAnchors),
    };
  });
}

function parseConfidence(value: unknown, responseOk: boolean): SmokeAnswerSample["confidence"] {
  if (!responseOk) return "error";
  return value === "grounded" || value === "partial" || value === "insufficient" ? value : "error";
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function environment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) fail(`${name} is required`);
  return value;
}

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}
