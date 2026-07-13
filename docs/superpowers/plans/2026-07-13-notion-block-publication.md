# Notion Block-Tree Publication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish approved Notion page trees into the independent student site as versioned Page, Block, Asset, and SearchIndex data without using Markdown as an intermediate format.

**Architecture:** A server-only publisher reads Notion pages and recursive blocks, normalizes them into the frozen `published-schema.ts` contract, mirrors binary assets into controlled storage, and atomically advances a current-version pointer only after validation succeeds. Student reads remain independent of Notion and fall back to the previous successful content version on any page or publication failure.

**Tech Stack:** Next.js 15 server routes, TypeScript, Notion REST API, Supabase Postgres/Storage, Vitest, existing `mobile-web` content renderers.

---

## Scope and gate

This plan implements T1.2–T1.3 and the publication half of T3.3. Before execution, create and approve a dedicated requirements/design/tasks/acceptance package covering the Supabase migration, Notion integration access, supported writing conventions, and operational authorization. Do not delete or rewrite `scripts/notion-content-sync.mjs`; it remains a migration reference until production cutover.

## File map

- Create `mobile-web/supabase/published-content.sql`: immutable versions, pages, blocks, assets, search entries, failures, and current pointer.
- Create `mobile-web/lib/publishing/notion-client.ts`: paginated Notion API adapter only.
- Create `mobile-web/lib/publishing/normalize-page.ts`: Page/property mapping and slug validation.
- Create `mobile-web/lib/publishing/normalize-blocks.ts`: recursive Notion block to frozen Block union mapping.
- Create `mobile-web/lib/publishing/mirror-assets.ts`: download, checksum, upload, and stable Asset records.
- Create `mobile-web/lib/publishing/build-search-index.ts`: original-text index entries and heading paths.
- Create `mobile-web/lib/publishing/publish-version.ts`: validation, transaction, failure recording, and pointer promotion.
- Create `mobile-web/lib/content/supabase-published-repository.ts`: read current or explicitly requested successful version.
- Create `mobile-web/app/api/admin/publish-notion/route.ts`: authenticated publication trigger.
- Create `mobile-web/scripts/publish-notion.ts`: dry-run and operator CLI.
- Create fixtures/tests under `mobile-web/tests/publishing/`.

### Task 1: Freeze the writing convention and database migration

- [ ] Write `docs/product/notion-writing-convention.md` mapping every supported Notion block/property to `Page`, `Block`, `Asset`, or explicit failure; include page title, parent, slug, campus, audience, topics, source URLs, risk level, allowed embed, alt text, and unsupported-block examples.
- [ ] Write a failing SQL contract test in `mobile-web/tests/publishing/schema.test.ts` asserting immutable `content_versions`, unique `(content_version, source_page_id)`, a single `published_content_pointer`, failure records, and RLS that denies student writes.
- [ ] Run `npm test -- publishing/schema.test.ts`; expect failure because the migration does not exist.
- [ ] Add `mobile-web/supabase/published-content.sql` with `content_versions`, `published_pages`, `published_blocks`, `published_assets`, `published_search_entries`, `publication_failures`, and `published_content_pointer`.
- [ ] Re-run the schema test and apply the migration to a disposable Supabase database; expect pass and a reversible down script documented in `mobile-web/supabase/README.md`.
- [ ] Commit: `feat: add versioned published content schema`.

### Task 2: Add the paginated Notion read boundary

- [ ] Write failing `notion-client.test.ts` cases for pagination, recursive children, rate-limit retry using `Retry-After`, and redaction of authorization headers from errors.
- [ ] Implement `notion-client.ts` with injected `fetch`, `NOTION_TOKEN`, `NOTION_ROOT_PAGE_ID`, API version, bounded retry, and no browser import path.
- [ ] Verify `npm test -- publishing/notion-client.test.ts` passes.
- [ ] Commit: `feat: add server-only notion reader`.

### Task 3: Normalize pages, rich text, and recursive blocks

- [ ] Add JSON fixtures for paragraphs, headings, nested lists, quotes, callouts, tables, columns, images, files, child pages, internal links, and one unsupported block.
- [ ] Write failing tests asserting IDs use Notion UUIDs, anchors are `b-<sourceBlockId>`, internal links use `pageId`, columns preserve order, table headers remain intact, and unsupported blocks return a typed publication failure rather than fallback text.
- [ ] Implement `normalize-page.ts` and exhaustive `normalize-blocks.ts`; use `never` checks and the existing `published-schema.ts` types.
- [ ] Run `npm test -- publishing/normalize-page.test.ts publishing/normalize-blocks.test.ts` and `npm run typecheck`.
- [ ] Commit: `feat: map notion pages to published block trees`.

### Task 4: Mirror assets and enforce embed policy

- [ ] Write failing tests for expiring Notion URLs, checksum deduplication, file-size/type rejection, missing alt text warning, allowed `school-map.ncuos.com` embeds, and external-link degradation for every other embed.
- [ ] Implement `mirror-assets.ts` using an injected downloader and Supabase Storage adapter; store content-addressed objects and never persist the Notion signed URL.
- [ ] Add cleanup rules that remove only unreferenced objects older than the rollback retention window.
- [ ] Verify asset tests and an integration upload against a disposable bucket.
- [ ] Commit: `feat: mirror notion assets into controlled storage`.

### Task 5: Build deterministic search entries

- [ ] Write failing tests that each searchable source block creates one entry, heading paths update as traversal proceeds, table rows receive stable anchors, captions may contribute text, and old/new versions never mix.
- [ ] Implement `build-search-index.ts` from normalized blocks only; excerpts remain a read-time slice of `plainText` and are never generated summaries.
- [ ] Run `npm test -- publishing/build-search-index.test.ts search-blocks.test.ts`.
- [ ] Commit: `feat: build version-scoped document search entries`.

### Task 6: Publish atomically and preserve rollback

- [ ] Write failing transaction tests for successful promotion, one-page failure, first-publication failure, partial asset failure, stale `lastEditedTime`, idempotent rerun, and rollback to the previous version.
- [ ] Implement `publish-version.ts`: create a pending version, normalize all selected pages, upload assets, insert complete version rows, validate internal links/search anchors, mark success, then move the pointer in one transaction.
- [ ] On failure, record page/block/reason, leave the pointer unchanged, and retain the previous published version.
- [ ] Run publication tests and verify a deliberate unsupported block leaves the previous site readable.
- [ ] Commit: `feat: publish validated content versions atomically`.

### Task 7: Replace fixture reads behind the repository boundary

- [ ] Write contract tests that run the same selectors against fixtures and a seeded Supabase version.
- [ ] Implement `supabase-published-repository.ts` and make `published-repository.ts` choose it only when publication configuration and a current pointer exist; keep fixtures as local/test fallback, not silent production fallback.
- [ ] Add cache tags keyed by `contentVersion` and ensure student routes never call Notion.
- [ ] Run all unit, type, build, functional E2E, and visual tests; approved screenshots must remain unchanged for equivalent content.
- [ ] Commit: `feat: read published block trees from supabase`.

### Task 8: Add an authenticated dry-run and operator path

- [ ] Write route tests for missing/invalid admin token, dry-run without writes, publish summary, and structured failure output.
- [ ] Implement `POST /api/admin/publish-notion` and `scripts/publish-notion.ts` with `--dry-run`, `--page`, `--all`, and `--rollback <version>`.
- [ ] Document environment variables, key rotation, scheduling, monitoring, and recovery in `mobile-web/README.md`.
- [ ] Run a dry-run against a non-production Notion root, publish to staging, remove Notion credentials from the browser environment, and verify public pages while logged out of Notion.
- [ ] Commit: `feat: add controlled notion publication workflow`.

## Completion gate

Run `npm test`, `npm run typecheck`, `npm run build`, `npm run test:e2e`, and `npm run test:visual`. Additionally publish a staging version containing every supported block, prove the public site works without Notion access, inject one unsupported block, and prove the pointer remains on the previous successful version.
