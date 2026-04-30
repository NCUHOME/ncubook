# ncubook One Week Launch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a public, portfolio-ready ncubook AI knowledge operations MVP within one week.

**Architecture:** Keep the public Docusaurus site as the student-facing entry, keep `ncubook-api` as the RAG / feedback / ops backend, and use `portfolio/` for job-seeking evidence. The launch version must prove the closed loop: user question -> RAG answer -> source display -> feedback -> knowledge gap -> eval / ops review.

**Tech Stack:** Docusaurus, React, Next.js API routes, Supabase, Gemini embeddings, OpenAI-compatible / DeepSeek chat provider, TypeScript, eval scripts.

---

## Launch Scope

The one-week launch is not a final research system. It is a credible AI product operations MVP that can be shown to interviewers and tested by real users.

Must be live by launch:

1. Student can ask questions and see source / retrieval metadata.
2. Student can give helpful / not helpful feedback.
3. Ops page can show real data when the API is configured, with honest fallback when data is not ready.
4. API has health checks and deployment runbook.
5. Eval can run and produce a badcase report.
6. Project README and portfolio docs explain value without claiming model training.

Out of scope for this week:

1. Full multi-agent system with separate model calls for each role.
2. SFT / RLHF / model training.
3. Polished marketing site.
4. Fake production metrics.

## File Structure

- `ncubook-api/app/api/health/route.ts`: redacted launch health endpoint.
- `ncubook-api/lib/health.ts`: pure health snapshot builder for tests.
- `ncubook-api/scripts/test-health.ts`: health snapshot regression test.
- `ncubook-api/README.md`: deployment and API operations runbook.
- `src/pages/index.tsx`: public entry and launch positioning.
- `src/pages/ops.tsx`: honest ops dashboard and gap workflow display.
- `src/components/AiAssistant/index.jsx`: student Q&A, source metadata, feedback UX.
- `portfolio/ai-model-ops-learning-tracker.md`: learning progress and project capability tracker.
- `portfolio/ai-ops-job-project-brief.md`: job-seeking project brief.
- `README.md`: top-level launch and demo instructions.

## Day 0: Launch Foundation

**Files:**
- Create: `ncubook-api/lib/health.ts`
- Create: `ncubook-api/app/api/health/route.ts`
- Create: `ncubook-api/scripts/test-health.ts`
- Modify: `ncubook-api/package.json`
- Modify: `ncubook-api/app/page.tsx`
- Modify: `ncubook-api/README.md`

- [x] **Step 1: Write health snapshot test**

Run:

```bash
cd ncubook-api
npx tsx scripts/test-health.ts
```

Expected before implementation: FAIL because `../lib/health` does not exist.

- [x] **Step 2: Implement health snapshot and API route**

Expose `GET /api/health` with no secrets, only boolean configuration status and provider labels.

- [x] **Step 3: Verify health test passes**

Run:

```bash
cd ncubook-api
npm run test:health
```

Expected: PASS.

- [x] **Step 4: Run API build**

Run:

```bash
cd ncubook-api
npm run build
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/plans/2026-04-30-one-week-launch.md ncubook-api
git commit -m "feat(api): add launch health check"
```

## Day 1: Student Q&A MVP

**Files:**
- Modify: `src/components/AiAssistant/index.jsx`
- Modify: `src/components/AiAssistant/styles.module.css`
- Modify: `src/pages/index.tsx`

- [ ] Verify the floating assistant opens on desktop and mobile.
- [ ] Verify homepage quick prompts open the assistant and submit the query.
- [ ] Improve low-confidence answer display so weak / none retrieval is obvious to users.
- [ ] Keep source preview visible and clickable.
- [ ] Run `pnpm typecheck` and `pnpm build`.
- [ ] Commit.

## Day 2: Ops Dashboard Credibility

**Files:**
- Modify: `src/pages/ops.tsx`
- Modify: `src/css/CijianMobile.module.css`
- Modify: `ncubook-api/app/api/ops/summary/route.ts` if needed.

- [ ] Ensure fallback data is clearly labeled as sample data, not real usage.
- [ ] Add an empty state for no production data.
- [ ] Add metric explanations for weak / no retrieval, negative feedback, open gaps, latency.
- [ ] Verify `/ops` loads when API is available and when API is unavailable.
- [ ] Run `pnpm typecheck` and `pnpm build`.
- [ ] Commit.

## Day 3: Eval / Benchmark Evidence

**Files:**
- Modify: `ncubook-api/evals/cases/campus-qa-v1.json`
- Modify: `ncubook-api/scripts/run-eval.ts`
- Create or modify: `portfolio/*eval*`

- [ ] Keep hand-written eval cases as regression smoke tests.
- [ ] Document that real eval candidates should come from query logs, feedback, and knowledge gaps.
- [ ] Run baseline eval against deployed API.
- [ ] Export a sanitized badcase report.
- [ ] Commit scripts/docs, not raw candidate exports.

## Day 4: Agent Workflow / Trust Boundary

**Files:**
- Modify: `ncubook-api/app/api/chat/route.ts`
- Modify: `portfolio/xiaojiayuan-trust-eval-ops-v1.md`
- Modify: `README.md`

- [ ] Document the lightweight Agent flow: Retriever -> Source Filter -> Answer Generator -> Risk Boundary -> Telemetry.
- [ ] Add or verify high-risk terms trigger official verification language.
- [ ] Keep multi-agent wording honest: implemented as staged workflow unless separate agents are actually coded.
- [ ] Run API tests and build.
- [ ] Commit.

## Day 5: Content and UI / UX Polish

**Files:**
- Modify: `src/pages/index.tsx`
- Modify: `src/pages/xiaojiayuan.tsx`
- Modify: `docs/**`

- [ ] Make first screen communicate the actual product, not a marketing shell.
- [ ] Ensure student paths are clear: ask, browse source, submit feedback.
- [ ] Remove stale or misleading copy.
- [ ] Run `pnpm typecheck` and `pnpm build`.
- [ ] Commit.

## Day 6: Deployment Readiness

**Files:**
- Modify: `README.md`
- Modify: `ncubook-api/README.md`
- Modify: `.env.local.example` files if needed.

- [ ] Verify all required production env vars.
- [ ] Run `GET /api/health` on deployed API.
- [ ] Run `POST /api/chat` smoke test with one low-risk and one high-risk question.
- [ ] Run `GET /api/ops/summary`.
- [ ] Run Docusaurus build.
- [ ] Commit.

## Day 7: Portfolio Package

**Files:**
- Modify: `portfolio/ai-ops-job-project-brief.md`
- Modify: `portfolio/ai-model-ops-learning-tracker.md`
- Modify: `README.md`

- [ ] Finalize README.
- [ ] Finalize project review document.
- [ ] Write resume project version with no fake data.
- [ ] Write 2-minute interview script.
- [ ] Capture screenshots: student Q&A, source display, feedback, ops, gaps, eval output.
- [ ] Commit.

## Verification Commands

Run before launch:

```bash
pnpm typecheck
pnpm build
cd ncubook-api
npm run test:health
npm run test:chat-model-config
npm run test:eval-analysis
npm run test:eval-candidates
npm run test:source-filter
npm run build
```
