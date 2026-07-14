# EdgeOne DeepSeek Production Cutover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy the approved `mobile-web` product to `book.ncuos.com` on Tencent EdgeOne with grounded `deepseek-v4-flash` answers, deterministic search, guarded secrets, and a rehearsed Docusaurus rollback.

**Architecture:** EdgeOne builds `` as a full-stack Next.js 15 project. Supabase remains the published-content runtime; `/api/search` stays deterministic, while `/api/ask` performs thresholded lexical retrieval and then calls DeepSeek Chat Completions with thinking disabled. Production publishing credentials remain absent from EdgeOne.

**Tech Stack:** Next.js 15 App Router, TypeScript, Vitest, Playwright, Supabase/Postgres `pg_trgm`, DeepSeek OpenAI-compatible API, Tencent EdgeOne Pages/Makers, GitHub.

---

## File map

- Modify `tests/ai/retrieve.test.ts`: retrieval threshold and optional embedding behavior.
- Modify `lib/ai/retrieve.ts`: defense-in-depth filtering of weak lexical candidates.
- Modify `tests/publishing/schema.test.ts`: SQL RPC threshold contract.
- Modify `supabase/published-content.sql`: filter weak candidates before returning grounding sources.
- Modify `tests/ai/provider.test.ts`: DeepSeek-compatible chat payload and optional embedding behavior.
- Modify `lib/ai/provider.ts`: separate answer generation from optional embedding capability.
- Modify `tests/ai/ask-route.test.ts`: production/shadow failure behavior if needed.
- Modify `lib/ai/answer-service.ts`: build required chat model and only build embedding model when configured.
- Modify `.env.example`: exact EdgeOne runtime variables without secrets.
- Modify `README.md`: DeepSeek and lexical-only production operation.
- Modify `docs/operations/mobile-web-cutover.md`: EdgeOne environment matrix, DNS snapshot, WAF, smoke and rollback procedure.
- Create `scripts/smoke-deepseek.ts`: repeatable answerable/unanswerable and latency smoke runner without logging questions or keys.
- Modify `package.json`: expose the smoke command without adding dependencies.
- Modify `docs/specs/2026-07-edgeone-production-cutover/{tasks,acceptance}.md`: record actual revisions and evidence as tasks pass.

## Execution convention

All npm commands in Tasks 1–5 run from `` after:

```bash
cd /Users/water/.config/superpowers/worktrees/ncubook/editorial-mobile-frontend/mobile-web
```

Git commands run from the worktree root. No command may print environment-variable values or matched secret text.

### Task 1: Filter unsupported lexical candidates

**Files:**
- Modify: `tests/ai/retrieve.test.ts`
- Modify: `lib/ai/retrieve.ts`
- Modify: `tests/publishing/schema.test.ts`
- Modify: `supabase/published-content.sql`

- [ ] **Step 1: Write the failing retrieval test**

Add candidates with lexical scores `0`, `0.079`, and `0.08`; assert only `0.08` survives without embeddings. Add an unrelated question case that resolves to no sources.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- tests/ai/retrieve.test.ts`

Expected: FAIL because current retrieval returns zero and below-threshold candidates.

- [ ] **Step 3: Implement the TypeScript threshold**

Add `minimumLexicalScore = 0.08` to `retrieveGroundingSources` and filter candidates unless they meet the threshold or have a positive vector score. Preserve the existing school, version and risk filters.

- [ ] **Step 4: Run retrieval tests and verify GREEN**

Run: `npm test -- tests/ai/retrieve.test.ts`

Expected: PASS.

- [ ] **Step 5: Write the failing SQL schema assertion**

Assert the RPC body contains a predicate equivalent to:

```sql
position(lower(p_question) in lower(entry.plain_text)) > 0
or similarity(lower(entry.plain_text), lower(p_question)) >= 0.08
or (p_query_embedding is not null and entry.embedding is not null)
```

- [ ] **Step 6: Run the schema test and verify RED**

Run: `npm test -- tests/publishing/schema.test.ts`

Expected: FAIL because the SQL function currently has no candidate threshold.

- [ ] **Step 7: Add the SQL predicate and verify GREEN**

Modify only `retrieve_published_sources`; run:

`npm test -- tests/publishing/schema.test.ts tests/ai/retrieve.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add lib/ai/retrieve.ts tests/ai/retrieve.test.ts supabase/published-content.sql tests/publishing/schema.test.ts
git commit -m "fix(ai): reject unrelated grounding candidates"
```

### Task 2: Use DeepSeek V4 Flash without requiring embeddings

**Files:**
- Modify: `tests/ai/provider.test.ts`
- Modify: `lib/ai/provider.ts`
- Modify: `lib/ai/answer-service.ts`
- Create: `tests/ai/answer-service.test.ts`
- Modify: `tests/ai/ground-answer.test.ts`

- [ ] **Step 1: Write failing provider tests**

Assert chat generation works when no embedding model is configured and sends:

```ts
{
  model: "deepseek-v4-flash",
  thinking: { type: "disabled" },
  response_format: { type: "json_object" }
}
```

Assert creating an embedding model still requires a non-empty embedding model identifier.

- [ ] **Step 2: Run provider tests and verify RED**

Run: `npm test -- tests/ai/provider.test.ts`

Expected: FAIL because the provider currently requires `embeddingModel` and omits `thinking`.

- [ ] **Step 3: Split provider capabilities minimally**

Expose `createOpenAICompatibleAnswerModel` and `createOpenAICompatibleEmbeddingModel`, sharing the existing request/retry parser internally. The answer model always sends non-thinking JSON Chat Completions; the embedding model is created only when configured.

- [ ] **Step 4: Update answer-service wiring**

First add `tests/ai/answer-service.test.ts` that constructs the service with no `AI_EMBEDDING_MODEL`, injects test doubles for repository/model creation, and expects retrieval to receive no embedding model. Run it and verify RED because current service requires the variable. Then require only `AI_PROVIDER_BASE_URL`, `AI_PROVIDER_API_KEY`, and `AI_CHAT_MODEL`; read `AI_EMBEDDING_MODEL` as optional and pass `undefined` to retrieval when absent.

- [ ] **Step 5: Run focused AI tests and verify GREEN**

Run: `npm test -- tests/ai/provider.test.ts tests/ai/answer-service.test.ts tests/ai/retrieve.test.ts tests/ai/ground-answer.test.ts tests/ai/ask-route.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/ai/provider.ts lib/ai/answer-service.ts tests/ai/provider.test.ts tests/ai/answer-service.test.ts tests/ai/ground-answer.test.ts
git commit -m "feat(ai): use DeepSeek V4 Flash without embeddings"
```

### Task 3: Document fail-closed EdgeOne runtime

**Files:**
- Modify: `.env.example`
- Modify: `README.md`
- Modify: `docs/operations/mobile-web-cutover.md`
- Modify: `tests/publishing/publish-route.test.ts`
- Modify: `lib/publishing/publish-route.ts` only if the RED test demonstrates a leak

- [ ] **Step 1: Locate and extend the admin-route test**

Add cases proving missing `NOTION_TOKEN`/`PUBLICATION_ADMIN_TOKEN` and a forged token cannot publish, and that responses do not identify which secret is missing.

- [ ] **Step 2: Run the admin test and verify its current behavior**

Run: `npm test -- tests/publishing/publish-route.test.ts`. If the new assertion fails, make the smallest route change needed; if it already passes, retain the test as regression evidence and do not rewrite the route.

- [ ] **Step 3: Update environment documentation**

Document EdgeOne values:

```dotenv
PUBLISHED_CONTENT_ENV=production
AI_ANSWER_MODE=shadow
AI_PROVIDER_BASE_URL=https://api.deepseek.com
AI_CHAT_MODEL=deepseek-v4-flash
# AI_EMBEDDING_MODEL intentionally unset
```

State that the Key and Supabase service-role value belong only in EdgeOne encrypted variables, while Notion/publisher variables must be absent.

- [ ] **Step 4: Add operational checks**

Record exact DNS/HTTPS snapshot commands, EdgeOne `/api/ask` platform rate-limit verification, fixed-revision preview procedure, and timed B→A→B rollback steps.

- [ ] **Step 5: Verify docs and secret scan**

Run:

Use file-name-only scans so matched values never print:

```bash
git diff --check
rg -l 'sk-[A-Za-z0-9]{20,}' . --glob '!node_modules/**' --glob '!.git/**' --glob '!.next/**'
git rev-list --all | while read revision; do git grep -Il -E 'sk-[A-Za-z0-9]{20,}' "$revision" -- . || true; done | sort -u
rg -l 'sk-[A-Za-z0-9]{20,}' .next || true
```

Expected: diff clean; secret scans emit no filenames. Delete captured output after recording only pass/fail.

- [ ] **Step 6: Commit**

```bash
git add .env.example README.md docs/operations/mobile-web-cutover.md tests/publishing/publish-route.test.ts lib/publishing/publish-route.ts
git commit -m "docs: define fail-closed EdgeOne runtime"
```

### Task 4: Add repeatable production smoke validation

**Files:**
- Create: `scripts/smoke-deepseek.ts`
- Create: `evals/edgeone-smoke-cases.json`
- Create: `tests/ai/smoke-report.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Write a failing test for smoke result aggregation**

Extract a pure function that calculates retrieval recall@8, answerable success, unanswerable abstention, failures and p95 from response samples. Test 20 samples, failure inclusion, percentile selection, expected source/anchor matching, and `confidence=insufficient && claims=[]`.

- [ ] **Step 2: Run the new test and verify RED**

Run the focused Vitest path and confirm the aggregator is missing.

- [ ] **Step 3: Implement the aggregator and CLI**

Create a versioned corpus with five answerable prompts and expected source ID/anchor plus at least three unanswerable prompts. The CLI reads endpoint/token configuration from environment, separately calls real Supabase retrieval for recall@8, performs one warm-up and 20 measured requests across answerable prompts, then validates all unanswerable responses. Three cold-start samples are supplied from three separate preview deployment URLs of the same revision. It logs only case IDs, request IDs, confidence, citation counts, content versions, status and latency—not full questions, answers or secrets.

- [ ] **Step 4: Run unit tests and local mocked smoke**

Expected: aggregator tests pass; mocked run produces a non-secret JSON report.

- [ ] **Step 5: Commit**

```bash
git add scripts/smoke-deepseek.ts evals/edgeone-smoke-cases.json tests/ai/smoke-report.test.ts package.json
git commit -m "test(ai): add DeepSeek production smoke checks"
```

### Task 5: Full local verification and Supabase RPC deployment

**Files:**
- Create: `supabase/migrations/20260714_grounding_threshold.sql`
- Create: `supabase/rollbacks/2026071401_grounding_threshold.sql`
- Modify: `docs/specs/2026-07-edgeone-production-cutover/tasks.md`
- Modify: `docs/specs/2026-07-edgeone-production-cutover/acceptance.md`

- [ ] **Step 1: Run the focused suite**

Run: `npm test -- tests/ai tests/publishing/schema.test.ts`

Expected: PASS.

- [ ] **Step 2: Run all engineering gates**

Run from ``:

```bash
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Expected: all pass without changing approved visual snapshots.

After the production build, repeat the `.next` file-name-only secret scan from Task 3 so the scan covers the newly generated artifact. Record only pass/fail and filenames if remediation is needed; never print matched values.

- [ ] **Step 3: Prepare a reversible Supabase migration**

Copy the old `retrieve_published_sources` definition into the rollback migration. Put only the thresholded replacement in the forward migration. Before applying, retrieve and record `pg_get_functiondef` checksum and active `contentVersion`, never credentials.

- [ ] **Step 4: Perform a mandatory forward→rollback→forward RPC rehearsal**

Use the Supabase skill/connector and always run this sequence, even when forward succeeds:

1. Record old `pg_get_functiondef` checksum and active `contentVersion`.
2. Apply forward migration; verify threshold behavior and unchanged contentVersion.
3. Apply rollback migration; verify function checksum equals the original and old behavior is restored.
4. Apply forward migration again; re-verify threshold behavior and unchanged contentVersion.

Capture only non-secret checksums/results.

- [ ] **Step 5: Record evidence and commit**

Check completed local tasks in the Gate E task/acceptance files and record commands, revision and remaining remote-only checks.

Commit both migration files and the non-secret rehearsal evidence with the task records.

### Task 6: GitHub and controlled EdgeOne preview

**Files:**
- No product-code changes expected; dashboard configuration and evidence only.

- [ ] **Step 1: Push the current branch and update PR #2**

Run `git push origin codex/editorial-mobile-frontend`; verify the PR head revision and checks.

- [ ] **Step 2: Snapshot the current production entry**

Record DNS CNAME, HTTPS certificate result, current EdgeOne project/domain environment, old Docusaurus revision, build command and output directory in the cutover record.

- [ ] **Step 3: Configure the EdgeOne project through the logged-in browser**

Set repository `NCUHOME/ncubook`, root `mobile-web`, Next.js preset, install/build commands and the approved environment matrix. Disable arbitrary preview-branch auto deployments. Enter the approved existing DeepSeek Key only in the encrypted server variable field without copying it into files or logs.

- [ ] **Step 4: Create a fixed-revision preview and verify**

Validate `/`, one section, one document, `/search`, `/api/search`, `/api/ask`, citation anchors, assets, admin fail-closed behavior and 360/390/430 interactions.

Inspect browser-visible response headers/bodies and EdgeOne function logs using secret-safe file-name/count or boolean checks. Record only pass/fail; do not print a matched Key value.

- [ ] **Step 5: Configure and verify EdgeOne platform rate limiting**

Apply `10 requests / minute / EdgeOne-resolved client IP` to `/api/ask`. Temporarily set preview `AI_RATE_LIMIT_PER_MINUTE=100`, verify the first 10 requests reach the application and request 11 returns 429 within the same minute, and capture the EdgeOne WAF hit record/response marker proving the rejection occurred at the platform layer. Then prove `/api/search`, a document route and a hashed static asset still return 2xx, and restore the application limit to 10. Use EdgeOne's platform client-IP matcher rather than trusting a caller-supplied header.

- [ ] **Step 6: Run the real DeepSeek smoke**

Keep `AI_ANSWER_MODE=shadow` until retrieval recall passes. Temporarily run the approved production-mode smoke on preview for answerable and unanswerable cases, then create two more preview deployments of the identical revision so each deployment's first ask supplies one of the three cold-start samples. Record the non-secret report.

### Task 7: Rehearse rollback and switch production

**Files:**
- Modify: `docs/specs/2026-07-edgeone-production-cutover/acceptance.md`
- Modify: `docs/operations/mobile-web-cutover.md`

- [ ] **Step 1: Rehearse B→A→B on temporary domains**

Deploy the new revision, rebuild/deploy the saved Docusaurus revision, then redeploy the identical new revision. Time both direction changes and verify HTTPS/core routes each time.

- [ ] **Step 2: Stop on any failed gate**

If content, search, citations, AI, rate limiting, HTTPS or rollback fails, leave `book.ncuos.com` on the old deployment and document the failure.

- [ ] **Step 3: Merge the verified PR and deploy production**

Merge only after GitHub and preview gates pass. Confirm EdgeOne production build uses the verified commit.

- [ ] **Step 4: Keep the existing domain and verify production**

Bind/retain `book.ncuos.com`, verify HTTPS and all core routes, then observe for 30 minutes. Roll back immediately on any core-route 5xx, broken search/citation/assets, provider failure, unsupported factual claim, or warm AI p95 above 5 seconds.

- [ ] **Step 5: Finalize evidence**

Record production deployment ID, revision, contentVersion, smoke report, DNS/certificate snapshot, rate-limit evidence and rollback timings. Commit and push the completed acceptance record.
