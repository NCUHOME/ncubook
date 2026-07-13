# Production Grounded QA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the deterministic `/api/ask` fixture with production retrieval and model calls while enforcing claim-level citations to the active published content version.

**Architecture:** Keep keyword search untouched. The ask path retrieves only active published entries, builds a bounded evidence packet, asks a provider adapter for structured claims, then independently validates every citation before returning the existing `AnswerSession` contract. Invalid or unsupported output degrades to `insufficient`; model prose never bypasses validation.

**Tech Stack:** Next.js server routes, TypeScript, Supabase/Postgres vector + full-text retrieval, OpenAI-compatible chat/embedding HTTP adapters, Vitest, Playwright, JSON evaluation fixtures.

---

## File map

- Create `mobile-web/lib/ai/provider.ts`: injected chat and embedding interfaces.
- Create `mobile-web/lib/ai/openai-compatible-provider.ts`: server-only HTTP adapter.
- Create `mobile-web/lib/ai/retrieve-evidence.ts`: active-version hybrid retrieval.
- Create `mobile-web/lib/ai/evidence-packet.ts`: prompt-safe bounded evidence serialization.
- Create `mobile-web/lib/ai/generate-claims.ts`: structured model request/parse.
- Create `mobile-web/lib/ai/ground-answer.ts`: orchestration and fail-closed validation.
- Modify `mobile-web/lib/answers/session.ts`: separate fixture builder from shared validation.
- Modify `mobile-web/app/api/ask/route.ts`: production service boundary with fixture mode only in tests/local opt-in.
- Create `mobile-web/supabase/answer-retrieval.sql`: FTS/vector columns and active-version RPC.
- Create `mobile-web/evals/cases/grounded-qa-v1.json` and `mobile-web/scripts/run-grounded-eval.ts`.
- Create tests under `mobile-web/tests/ai/`.

### Task 1: Freeze provider-independent request and response boundaries

**Files:**
- Create: `mobile-web/lib/ai/provider.ts`
- Modify: `mobile-web/lib/answers/session.ts`
- Create: `mobile-web/tests/ai/provider-contract.test.ts`

- [ ] Write failing type/runtime tests for `embed(texts)`, `generateStructured(input)`, timeouts, abort signals and provider errors.
- [ ] Move deterministic fixture construction to `mobile-web/lib/answers/fixtures.ts`; keep `validateAnswerSession` provider-independent.
- [ ] Define structured model output as claims containing evidence IDs, never URLs or arbitrary citation objects.
- [ ] Run tests; expect pass after minimal interfaces and fixture extraction.
- [ ] Commit: `refactor: isolate grounded answer provider contracts`.

### Task 2: Add active-version hybrid retrieval

**Files:**
- Create: `mobile-web/supabase/answer-retrieval.sql`
- Create: `mobile-web/lib/ai/retrieve-evidence.ts`
- Create: `mobile-web/tests/ai/retrieve-evidence.test.ts`

- [ ] Write failing tests proving retrieval filters to the active content version, respects published status, returns original text/anchor/page metadata, and boosts but does not exclusively constrain `pageContext`.
- [ ] Add FTS and embedding indexes to published search entries plus RPC `match_published_evidence(query_text, query_embedding, active_version, context_page_id, limit)`.
- [ ] Implement reciprocal-rank fusion of lexical and vector results with deterministic tie-breaking.
- [ ] Cap results and per-entry length; retain full evidence IDs for later validation.
- [ ] Re-run tests against injected repository results and a disposable database; expect pass.
- [ ] Commit: `feat: retrieve active published evidence`.

### Task 3: Build injection-resistant evidence packets

**Files:**
- Create: `mobile-web/lib/ai/evidence-packet.ts`
- Create: `mobile-web/tests/ai/evidence-packet.test.ts`

- [ ] Write failing tests for XML/JSON-like content, instruction-looking source text, oversized evidence and duplicate blocks.
- [ ] Serialize evidence as data records with opaque IDs, page title, section path, anchor, content version and original text.
- [ ] State in the system instruction that evidence is untrusted content, not instructions.
- [ ] Enforce total character/token budget before the provider call.
- [ ] Re-run tests; expect pass.
- [ ] Commit: `feat: build bounded grounded evidence packets`.

### Task 4: Generate structured claims

**Files:**
- Create: `mobile-web/lib/ai/openai-compatible-provider.ts`
- Create: `mobile-web/lib/ai/generate-claims.ts`
- Create: `mobile-web/tests/ai/generate-claims.test.ts`

- [ ] Write failing tests with injected fetch for success, timeout, non-2xx, malformed JSON, unknown evidence IDs and provider refusal.
- [ ] Implement environment-backed base URL, API key and model name; keep the adapter in server-only modules.
- [ ] Request JSON containing `claims[{text,evidenceIds,status}]` and `confidence`; no persona, chat history or free-form citations.
- [ ] Parse with explicit guards and return a typed provider error rather than repairing invented fields.
- [ ] Re-run tests; expect pass.
- [ ] Commit: `feat: generate structured evidence-linked claims`.

### Task 5: Enforce citations after generation

**Files:**
- Create: `mobile-web/lib/ai/ground-answer.ts`
- Modify: `mobile-web/lib/answers/session.ts`
- Create: `mobile-web/tests/ai/ground-answer.test.ts`

- [ ] Write failing tests for a valid multi-claim answer, one uncited claim, an unknown evidence ID, stale content version, mixed grounded/verification claims, no evidence and provider failure.
- [ ] Convert only referenced retrieved evidence into `Citation`; derive routes/anchors from repository data, not model output.
- [ ] Reject the entire factual answer when any grounded claim lacks a current citation; return an `insufficient` session with no factual claims.
- [ ] Preserve `partial` only when grounded and verification claims are explicitly separated.
- [ ] Run tests including existing `answer-session.test.ts`; expect pass.
- [ ] Commit: `feat: enforce claim-level grounded answers`.

### Task 6: Replace the fixture API behind a safe mode switch

**Files:**
- Modify: `mobile-web/app/api/ask/route.ts`
- Create: `mobile-web/tests/ai/ask-route.test.ts`

- [ ] Write failing route tests for invalid bodies, configured production mode, explicit local fixture mode, rate limiting, timeout and redacted errors.
- [ ] Wire `retrieve -> packet -> generate -> validate`; log IDs/counts/latency, never prompts, API keys or student free text by default.
- [ ] Keep deterministic fixtures available only under `ANSWER_PROVIDER=fixture`; production fails closed if provider configuration is missing.
- [ ] Return the unchanged `AnswerSession` JSON so the approved UI does not branch on provider.
- [ ] Run route and component tests; expect pass.
- [ ] Commit: `feat: connect production grounded ask route`.

### Task 7: Add evaluation and release thresholds

**Files:**
- Create: `mobile-web/evals/cases/grounded-qa-v1.json`
- Create: `mobile-web/scripts/run-grounded-eval.ts`
- Modify: `mobile-web/package.json`
- Create: `mobile-web/tests/ai/eval-runner.test.ts`

- [ ] Add cases for fees/payment, ambiguous campus context, stale rules, missing facts, conflicting sources, prompt injection text and exact citation anchors.
- [ ] Implement metrics: citation validity 100%, active-version validity 100%, unsupported factual claim rate 0%, insufficient precision/recall, and answer latency distribution.
- [ ] Add `test:eval:grounded` script with deterministic recorded provider responses for CI and an opt-in live mode.
- [ ] Make release fail on any invalid citation or unsupported factual claim; latency/insufficient metrics report against documented thresholds.
- [ ] Run deterministic eval; expect all hard safety metrics to pass.
- [ ] Commit: `test: add grounded answer evaluation gate`.

### Task 8: Verify end-to-end behavior

**Files:**
- Modify: `mobile-web/e2e/mobile-journeys.spec.ts`
- Modify only after human approval: corresponding visual baselines if UI text changes.

- [ ] Mock production provider at the HTTP boundary while using real retrieval fixtures; verify homepage and document-context asking.
- [ ] Assert keyword search sends zero `/api/ask`, answer citations target active anchors, and browser back restores answer/draft/scroll.
- [ ] Run `npm test`, `npm run typecheck`, `npm run build`, `npm run test:e2e`, `npm run test:visual`, and `npm run test:eval:grounded`.
- [ ] Perform one staging live-provider smoke test with redacted telemetry.
- [ ] Commit: `test: verify production grounded question flow`.

## Release gate

- No model-generated page ID, URL, anchor or content version is trusted directly.
- Every grounded claim cites retrieved evidence from the currently active publication version.
- Missing, conflicting or invalid evidence produces `insufficient`, not fluent speculation.

