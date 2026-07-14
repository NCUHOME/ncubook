# Production Grounded AI Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the deterministic answer fixture with production retrieval and model calls while making unsupported factual claims fail closed and retaining exact, versioned citations.

**Architecture:** `/api/ask` remains the only frontend boundary. A retrieval layer searches only the current published content version, a model adapter returns structured claims referencing retrieved source IDs, and a deterministic post-validator resolves citations, rejects invented/stale IDs, and converts unsafe output to partial or insufficient before the UI receives it.

**Tech Stack:** Next.js server routes, TypeScript, Supabase Postgres/pgvector, OpenAI-compatible chat/embedding HTTP adapters, Vitest, Playwright, existing AnswerSession contract and evaluation fixtures.

---

## Scope and gate

This plan implements the AI half of T3.3. It does not change keyword search, rewrite source documents, or introduce a chat persona. Approve a dedicated specification before implementation covering provider, model IDs, cost/latency limits, sensitive-topic behavior, privacy/log retention, and the production content publication dependency.

## File map

- Create `mobile-web/lib/ai/provider.ts`: server-only provider interfaces and HTTP adapters.
- Create `mobile-web/lib/ai/retrieve.ts`: version-scoped hybrid retrieval with page/anchor context boost.
- Create `mobile-web/lib/ai/prompt.ts`: structured answer instructions and retrieved-source envelope.
- Create `mobile-web/lib/ai/ground-answer.ts`: orchestration and deterministic claim/citation enforcement.
- Create `mobile-web/lib/ai/policy.ts`: sensitive/verification/insufficient rules.
- Modify `mobile-web/lib/answers/session.ts`: separate runtime schema validation from fixture generation.
- Modify `mobile-web/app/api/ask/route.ts`: authenticated/rate-limited production call with typed failures.
- Create `mobile-web/evals/` and `mobile-web/scripts/run-answer-evals.ts`.
- Create unit/integration tests under `mobile-web/tests/ai/`.

### Task 1: Approve provider and operational constraints

- [ ] Add `docs/product/production-ai-policy.md` defining provider/model/embedding dimensions, 95th-percentile latency budget, per-request token/cost cap, timeout, retries, log redaction, retention, rate limits, and sensitive-topic refusal/escalation.
- [ ] Add required server-only environment variables to `mobile-web/.env.example`; forbid `NEXT_PUBLIC_` for provider secrets.
- [ ] Add a test that imports provider modules from a client component and expects the build guard to reject the import.
- [ ] Commit: `docs: approve production ai operating policy`.

### Task 2: Add version-scoped retrieval

- [ ] Add a Supabase migration/RPC returning source ID, page ID/title, anchor, section path, exact text, risk level, content version, and lexical/vector scores for the current pointer only.
- [ ] Write failing tests for lexical matches, semantic matches, page-context boost, anchor-context boost, current-version isolation, school=`ncu`, risk filtering, empty retrieval, and deterministic tie ordering.
- [ ] Implement `retrieve.ts` with an injected repository and embedding adapter; cap candidate count and return complete source records rather than generated excerpts.
- [ ] Run retrieval tests against fixtures and a seeded disposable database.
- [ ] Commit: `feat: add current-version grounded retrieval`.

### Task 3: Add the structured provider boundary

- [ ] Define a JSON response schema containing `claims[{id,text,sourceIds,status}]` and overall confidence; the model never creates final URLs, page titles, anchors, or content versions.
- [ ] Write failing tests for timeout, non-JSON output, schema mismatch, provider 429/5xx, token-limit truncation, and secret-free errors.
- [ ] Implement `provider.ts` using injected `fetch`, one bounded retry for eligible errors, abort timeout, and strict parsed output.
- [ ] Commit: `feat: add structured answer model adapter`.

### Task 4: Enforce claims and citations after generation

- [ ] Write failing tests where the model invents a source ID, cites a stale version, emits a factual claim without a source, mixes grounded and unverifiable claims, or returns facts after empty retrieval.
- [ ] Implement `ground-answer.ts` so citations are constructed only from retrieved records; reject unknown IDs; downgrade unverifiable claims; return `insufficient` with no factual claims when nothing remains grounded.
- [ ] Extend `validateAnswerSession` to validate parsed unknown input without `any`, duplicate IDs, valid routes/anchors, confidence/status coherence, and the active content version.
- [ ] Run `npm test -- ai/ground-answer.test.ts answer-session.test.ts`.
- [ ] Commit: `feat: enforce grounded claims after model generation`.

### Task 5: Apply sensitive-content and uncertainty policy

- [ ] Write cases for admissions deadlines, fees, medical advice, safety emergencies, and conflicting current sources.
- [ ] Implement `policy.ts` to require authoritative sources for sensitive claims, label `needs-verification`, preserve disagreements, and provide non-factual next steps when evidence is insufficient.
- [ ] Ensure fluent model text cannot override deterministic policy results.
- [ ] Commit: `feat: apply answer risk and uncertainty policy`.

### Task 6: Replace the fixture API without changing the UI contract

- [ ] Write route tests for valid question/context, empty question, rate limit, provider timeout, insufficient evidence, and a two-claim grounded answer with exact citation URLs.
- [ ] Modify `/api/ask` to call `groundAnswer`; retain fixture injection only in tests and local explicit demo mode.
- [ ] Add request IDs and privacy-safe telemetry: latency, content version, retrieval count, confidence, policy outcome, and feedback correlation; do not log full questions by default.
- [ ] Run existing AskProvider/AskSheet and citation-return tests unchanged.
- [ ] Commit: `feat: serve production grounded answers`.

### Task 7: Build an evaluation gate

- [ ] Create versioned evaluation cases for campus transport, onboarding, services, no-answer questions, adversarial instructions in documents, conflicting sources, and sensitive queries.
- [ ] Implement metrics for citation validity, claim support, answerability/abstention, retrieval recall@k, forbidden hallucination, latency, and cost.
- [ ] Add a deterministic evaluator for citation validity and a separately configured model-assisted support scorer whose output cannot approve deployment alone.
- [ ] Define thresholds in `mobile-web/evals/thresholds.json`; CI fails on citation validity below 100% or any unsupported sensitive factual claim.
- [ ] Commit: `test: add grounded answer evaluation gate`.

### Task 8: Stage, observe, and release

- [ ] Add a feature flag with `fixture`, `shadow`, and `production` modes; shadow mode never exposes generated output to students.
- [ ] Compare latency, retrieval, grounding, abstention, and cost on staging traffic; manually review a fixed sample of every risk class.
- [ ] Run unit/type/build/E2E/visual checks and the evaluation suite; verify keyword search makes zero model/embedding requests.
- [ ] Document rollback to fixture/insufficient-only mode and provider-key rotation.
- [ ] Commit: `ops: add grounded ai rollout and rollback controls`.

## Completion gate

Production mode may be enabled only after the current published-content version exists, citation validity is 100% in the evaluation set, sensitive unsupported claims are zero, search remains deterministic, provider secrets are absent from client bundles, and the approved mobile visual baselines have no differences.

