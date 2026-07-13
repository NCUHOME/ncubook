# Real Content Migration and Cutover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the first approved NCU content set into the new publication system, validate parity and trust paths, then cut student traffic from Docusaurus to `mobile-web` with a tested rollback.

**Architecture:** Treat existing Docusaurus Markdown/assets and approved Notion pages as migration inputs, never as the runtime format. Build an auditable inventory and import bridge that produces the same published schema as the Notion pipeline, run both products in parallel, verify routes/content/anchors/assets/search/AI, then switch traffic behind a reversible deployment flag. Do not delete the Docusaurus source during this plan.

**Tech Stack:** TypeScript migration scripts, Docusaurus, Next.js 15, Supabase, Vitest, Playwright, JSON/CSV audit reports.

---

## File map

- Create `mobile-web/scripts/migration/inventory-docusaurus.ts`: page/asset/link inventory.
- Create `mobile-web/scripts/migration/import-markdown-source.ts`: one-time source parser to published block input; not a runtime renderer.
- Create `mobile-web/scripts/migration/route-map.ts`: legacy-to-new route registry.
- Create `mobile-web/scripts/migration/validate-content-parity.ts`: structural and link checks.
- Create `mobile-web/scripts/migration/validate-assets.ts`: durable asset audit.
- Create `mobile-web/scripts/migration/publish-batch.ts`: dry-run/publish selected page IDs.
- Create `mobile-web/migration/manifest.json`: reviewed source ownership and target mapping.
- Create generated, reviewable reports under `mobile-web/migration/reports/`.
- Modify `mobile-web/next.config.ts`: approved permanent redirects only after parity acceptance.
- Create `docs/runbooks/mobile-cutover.md`: deploy, monitoring and rollback.
- Extend `mobile-web/e2e/mobile-journeys.spec.ts` with real-content smoke paths.

### Task 1: Freeze migration scope and ownership

**Files:**
- Create: `mobile-web/migration/manifest.json`
- Create: `mobile-web/scripts/migration/inventory-docusaurus.ts`
- Create: `mobile-web/tests/migration/inventory.test.ts`

- [ ] Write a failing inventory test for front matter, sidebar hierarchy, local images/files, internal links, external sources and duplicate slugs.
- [ ] Implement a read-only inventory over `docs/**/*.md` and `docs/**/*.mdx`; do not alter source files.
- [ ] Generate a manifest entry with `legacyPath`, `sourceKind`, `notionPageId?`, `targetSection`, `targetSlug`, `owner`, `riskLevel`, `migrationStatus`.
- [ ] Have the project owner approve the first batch explicitly; recommended batch is onboarding plus campus transport before the rest of campus life.
- [ ] Commit: `chore: inventory first real content migration batch`.

### Task 2: Build the one-time legacy import bridge

**Files:**
- Create: `mobile-web/scripts/migration/import-markdown-source.ts`
- Create: `mobile-web/tests/migration/legacy-import.test.ts`
- Create: `mobile-web/tests/fixtures/migration/legacy-rich-page.md`

- [ ] Write failing tests for headings, paragraphs, nested lists, quotes, tables, images, files, JSX/MDX rejection and stable migration IDs.
- [ ] Implement a source parser that emits the published `Page`/`Block` input shape only for initial import into Notion/publication staging.
- [ ] Mark unsupported MDX as a blocking report item; never execute JSX or flatten it to plain text.
- [ ] Generate deterministic migration-only IDs for dry-run comparison only. Import reviewed content into Notion, then publish with Notion IDs; temporary IDs must never enter public routes, search entries or AI citations.
- [ ] Prove no student route imports this parser.
- [ ] Commit: `feat: add auditable legacy content import bridge`.

### Task 3: Establish the reviewed route map

**Files:**
- Create: `mobile-web/scripts/migration/route-map.ts`
- Create: `mobile-web/tests/migration/route-map.test.ts`
- Modify later: `mobile-web/next.config.ts`

- [ ] Write failing tests for every manifest page, unique target routes, query preservation, unchanged browser fragments and no redirect loops; changed legacy anchors require an explicit client-side anchor map.
- [ ] Map old `/docs/...` and known Docusaurus aliases to new section/document routes.
- [ ] Keep the mapping as data consumed by tests and deployment config; do not scatter redirects across pages.
- [ ] Do not enable permanent redirects until Task 7 approval.
- [ ] Commit: `feat: define reviewed legacy route map`.

### Task 4: Migrate and verify durable assets

**Files:**
- Create: `mobile-web/scripts/migration/validate-assets.ts`
- Create: `mobile-web/tests/migration/assets.test.ts`
- Create generated: `mobile-web/migration/reports/assets.json`

- [ ] Write failing tests for missing files, case-sensitive path mismatch, duplicate checksum, oversized files, absent alt text and PDFs.
- [ ] Import assets through the same durable mirror used by Notion publication; never copy Notion signed URLs.
- [ ] Produce counts and blocking issues per page; require zero missing assets in the first batch.
- [ ] Manually inspect route maps/transport images and one PDF on a phone-sized browser.
- [ ] Commit: `chore: migrate and audit first batch assets`.

### Task 5: Validate structural content parity

**Files:**
- Create: `mobile-web/scripts/migration/validate-content-parity.ts`
- Create: `mobile-web/tests/migration/content-parity.test.ts`
- Create generated: `mobile-web/migration/reports/content-parity.json`

- [ ] Define measurable parity: page count/title, heading order, paragraph/list/table count, internal link target, asset count, source URL and risk metadata.
- [ ] Write failing tests showing missing blocks, reordered columns, changed table cells and broken links are blocking differences.
- [ ] Compare normalized source inventory with staged published records; textual normalization may ignore whitespace only, not rewrite wording.
- [ ] Require a human review note for every intentional difference.
- [ ] Commit: `test: add structural content migration parity checks`.

### Task 6: Validate search and grounded-answer trust paths

**Files:**
- Create: `mobile-web/tests/migration/search-citation-parity.test.ts`
- Extend: `mobile-web/evals/cases/grounded-qa-v1.json`

- [ ] Add real questions for each migrated high-value page with expected page ID and anchor.
- [ ] Assert keyword results use original migrated paragraphs and exact anchors without `/api/ask`.
- [ ] Assert grounded claims cite the active real content version; changed/deleted anchors follow the content-updated fallback rule.
- [ ] Run deterministic grounded evaluations and record failures by page owner.
- [ ] Commit: `test: validate migrated search and citation paths`.

### Task 7: Run parallel acceptance

**Files:**
- Modify: `mobile-web/e2e/mobile-journeys.spec.ts`
- Create: `mobile-web/migration/reports/acceptance.md`
- Update only after approval: visual baselines for real content routes.

- [ ] Add 360/390/430 journeys for onboarding, campus transport, long rich content, page tree, keyword anchor and AI citation return.
- [ ] Crawl the staged new site and legacy Docusaurus routes; require no unexpected 4xx/5xx, broken internal links or missing assets.
- [ ] Test without a Notion session and with network access to Notion blocked.
- [ ] Have the project owner review real-content screenshots separately from the already approved shell baseline.
- [ ] Record acceptance revision and remaining deferred pages.
- [ ] Commit: `test: approve first real content migration batch`.

### Task 8: Prepare cutover and rollback

**Files:**
- Create: `docs/runbooks/mobile-cutover.md`
- Modify: `mobile-web/next.config.ts`
- Modify deployment configuration only after explicit authorization.

- [ ] Document preflight, DNS/routing target, environment variables, health URLs, active content version, monitoring window and named rollback owner.
- [ ] Define rollback as routing traffic back to Docusaurus plus restoring the prior active content version; neither step requires deleting data.
- [ ] Add redirects from the reviewed route map and test status codes/query behavior; separately test unchanged fragments and every explicit changed-anchor mapping in a real browser.
- [ ] Rehearse cutover and rollback in staging; capture timestamps and results.
- [ ] Commit: `docs: add reversible mobile cutover runbook`.

### Task 9: Cut traffic and observe

**Files:**
- Update: `mobile-web/migration/reports/acceptance.md`
- Do not delete: Docusaurus `docs/`, `src/`, `static/` or deployment configuration.

- [ ] Obtain explicit production-cutover approval; Gate B shell approval alone is not cutover authorization.
- [ ] Run the complete frontend, publication, migration and grounded-answer gates against the release revision.
- [ ] Switch traffic during the agreed window and monitor 4xx/5xx, search zero-results, ask failures, citation validation failures and feedback.
- [ ] Roll back immediately if hard trust checks fail; otherwise record the release and active content version.
- [ ] Keep Docusaurus read-only and deployable until a later, separately approved retirement plan.
- [ ] Commit: `chore: record first mobile content cutover`.

## Release gate

- First-batch content and assets pass structural parity with every intentional difference approved.
- Public reading, search and AI evidence work without Notion access.
- Every legacy route is mapped or explicitly deferred.
- Staging cutover and rollback both succeed before production traffic changes.
