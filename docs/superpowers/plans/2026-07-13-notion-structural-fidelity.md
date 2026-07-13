# Notion Structural Fidelity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish all approved Notion descendants without losing divider or nested-callout structure, then verify the first real staging version.

**Architecture:** Extend the existing discriminated Block union before the first live content version. Normalize Notion recursively, render children through the same article block dispatcher, omit divider-only entries from search, and keep unknown structures fail-closed. Runtime credentials remain server-only and untracked.

**Tech Stack:** TypeScript, Vitest, React, Next.js 15, Tailwind v4 tokens, Notion API, Supabase Postgres/Storage.

---

### Task 1: Extend and normalize the block contract

**Files:**
- Modify: `mobile-web/lib/content/published-schema.ts`
- Modify: `mobile-web/lib/publishing/normalize-blocks.ts`
- Modify: `mobile-web/lib/publishing/build-search-index.ts`
- Test: `mobile-web/tests/publishing/normalize-blocks.test.ts`
- Test: `mobile-web/tests/publishing/build-search-index.test.ts`

- [ ] Add failing tests for divider identity, recursive callout children, and recursive search traversal.
- [ ] Run targeted tests and confirm the unsupported/failing behavior.
- [ ] Add `divider` and `callout.children` to the union and normalizer.
- [ ] Traverse callout children for searchable blocks while excluding divider itself.
- [ ] Run targeted tests and confirm they pass.

### Task 2: Render the approved mobile treatment

**Files:**
- Create: `mobile-web/src/components/article/DividerBlock.tsx`
- Modify: `mobile-web/src/components/article/CalloutBlock.tsx`
- Modify: `mobile-web/src/components/article/ArticleRenderer.tsx`
- Modify: `mobile-web/lib/content/published-fixtures.ts`
- Modify: `mobile-web/src/components/design/ReviewSamples.tsx`
- Test: `mobile-web/tests/article-renderer.test.tsx`

- [ ] Add failing renderer tests for an `<hr>` divider and callout child text.
- [ ] Run the renderer test and confirm failure.
- [ ] Add the token-only divider and recursive callout renderer.
- [ ] Add the structures to the isolated rich-content sample.
- [ ] Run renderer tests and capture 360/390/430px review screenshots without updating approved baselines automatically.

### Task 3: Prepare protected staging runtime access

**Files:**
- Local-only: `mobile-web/.env.local`
- Modify: Supabase project `ufvzfrmyrnvzfnsbltla`
- Modify: Notion internal integration permissions for root `24c7d60a0dda808baaf0c30129eeff3b`

- [ ] Enable RLS on the approved legacy `public.documents` table.
- [ ] Create or reuse a read-only Notion Integration and share only the editorial root.
- [ ] Obtain the Supabase server credential and write all runtime values to `.env.local` without printing or committing secrets.
- [ ] Verify `.env.local` remains ignored and the application can reach both services.

### Task 4: Execute real migration verification

**Files:**
- Modify: `mobile-web/migration/manifest.json`
- Modify: `mobile-web/migration/reports/staging-readiness.md`
- Modify: `docs/specs/2026-07-mobile-ai-knowledge-rebuild/tasks.md`

- [ ] Run the 37-page remote inventory check and authoritative `--dry-run --all`.
- [ ] Resolve every unknown block, asset and internal-link failure without flattening content.
- [ ] Publish one immutable staging content version.
- [ ] Run parity, link/asset, search-anchor and citation checks.
- [ ] Run a forward/rollback/forward content-pointer rehearsal and record the versions/checksums.

### Task 5: Full verification and commit

- [ ] Run `npm test` and require zero failures.
- [ ] Run `npm run typecheck` and require exit code 0.
- [ ] Run `npm run build` and require exit code 0.
- [ ] Run the approved E2E and visual checks; do not accept visual diffs automatically.
- [ ] Update T3.4 and acceptance only for checks supported by fresh evidence.
- [ ] Commit the verified implementation and reports.
