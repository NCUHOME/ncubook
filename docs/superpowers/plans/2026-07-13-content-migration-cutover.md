# Real Content Migration and Production Cutover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the first approved NCU content set into the versioned publication system, validate parity and trust behavior, and switch the public entry to `mobile-web` with a tested rollback to Docusaurus.

**Architecture:** Docusaurus and current Notion material are read-only migration inputs. An inventory and staging import produce structured block trees through the same publication contract, automated and human parity reports gate each batch, and routing/DNS changes occur only after a release rehearsal proves both forward cutover and rollback.

**Tech Stack:** TypeScript migration scripts, Notion publisher, Docusaurus/MDX parsers used only at import time, Supabase, Next.js, Playwright, link/asset audit scripts.

---

## Scope and gate

This plan implements T3.4 and closes remaining acceptance items. It cannot start until the Notion publication plan has a successful staging version; production AI may remain disabled or insufficient-only during content cutover. Deleting Docusaurus content is explicitly out of scope.

## File map

- Create `mobile-web/scripts/migration/inventory.ts`: source pages, assets, links, owners, risk, and target mapping.
- Create `mobile-web/scripts/migration/import-docusaurus.ts`: one-time MD/MDX to frozen block contract importer.
- Create `mobile-web/scripts/migration/compare-publication.ts`: structural/text/link/asset/anchor parity report.
- Create `mobile-web/scripts/migration/check-links-assets.ts`: public logged-out link and asset audit.
- Create `mobile-web/migration/manifest.json`: reviewed source-to-target mapping and batch state.
- Create `mobile-web/migration/reports/`: generated machine-readable reports; only approved summaries are committed.
- Create `docs/operations/mobile-web-cutover.md`: deploy, monitoring, rollback, and ownership runbook.
- Modify routing/deployment configuration only after explicit cutover approval.

### Task 1: Inventory and classify the real corpus

- [ ] Write a failing inventory test that detects every file under `docs/`, referenced local asset, internal link, top-level Docusaurus route, source owner, risk level, and migration disposition.
- [ ] Implement `inventory.ts` and create `manifest.json` entries with `sourcePath`, `targetPageId`, `targetSlug`, `parentPageId`, `sourceKind`, `owner`, `riskLevel`, `status`, and `notes`.
- [ ] Mark duplicates, obsolete pages, private/unpublishable material, generated pages, and missing owners explicitly; never silently omit files.
- [ ] Have the project owner approve the first batch: onboarding, campus transport, and the chosen campus-life pages.
- [ ] Commit: `chore: inventory first content migration batch`.

### Task 2: Build a one-time Docusaurus import adapter

- [ ] Add fixtures covering Markdown headings, paragraphs, lists, tables, images, files, MDX components, HTML, duplicate headings, and unresolved imports.
- [ ] Write failing tests that preserve original text/order, derive stable migration source IDs from a checked-in mapping rather than headings, copy supported assets, and fail on unknown MDX/HTML.
- [ ] Implement `import-docusaurus.ts` as an offline adapter into the same `Page`/`Block` input accepted by the publisher; runtime publication must never depend on Markdown.
- [ ] Produce a dry-run JSON tree for each first-batch page and review unsupported constructs before any write.
- [ ] Commit: `feat: add audited docusaurus migration adapter`.

### Task 3: Establish Notion destinations and stable identity

- [ ] Create/review the target Notion page tree using the approved writing convention.
- [ ] Persist source-path to Notion `sourcePageId` and source-fragment to `sourceBlockId` mappings in the manifest; never regenerate IDs from titles.
- [ ] Import the batch into a non-production Notion root, then run the publisher dry-run and compare its normalized output with the offline import.
- [ ] Resolve differences in source content or documented mappings, not with renderer-specific page patches.
- [ ] Commit: `chore: map first batch to stable notion identities`.

### Task 4: Mirror and audit all assets

- [ ] Write tests that detect missing files, temporary Notion URLs, duplicate binaries, unsafe file types, missing alt text, oversized mobile images, and broken PDFs.
- [ ] Run the asset mirror for the first batch and generate checksums/public URLs.
- [ ] Manually inspect maps, route diagrams, long images, PDFs, captions, and multi-column reading order at 360px.
- [ ] Block publication on any unresolved asset rather than substituting a broken or unrelated resource.
- [ ] Commit: `chore: validate first batch publication assets`.

### Task 5: Generate and review parity reports

- [ ] Implement `compare-publication.ts` to compare normalized plain text, heading order, list/table counts, internal/external links, assets, source metadata, and anchors per page.
- [ ] Define explicit tolerances: zero lost text, zero broken internal links, zero missing assets, zero unknown blocks; presentation-only differences require a recorded human decision.
- [ ] Generate side-by-side 360/390/430 screenshots for long-form fixtures and each representative rich block.
- [ ] Record content-owner approval per manifest page; do not use a batch-level approval to hide page failures.
- [ ] Commit: `test: add content migration parity reports`.

### Task 6: Validate search and grounded-answer source paths

- [ ] Add real-content search cases for exact titles, common phrases, fees, locations, and zero-result terms; assert original excerpts and exact anchors.
- [ ] Add answer-source cases only if production AI is enabled; otherwise verify insufficient-only mode and citation route resolution against the real version.
- [ ] Test deleted/renamed blocks so old anchors show “内容已更新” and the nearest retained heading.
- [ ] Run logged-out tests proving pages, assets, search, and citations do not require Notion access.
- [ ] Commit: `test: validate real content search and citations`.

### Task 7: Rehearse deployment and rollback

- [ ] Write `docs/operations/mobile-web-cutover.md` with current/new hosting targets, environment variables, database pointer, cache purge, DNS/router ownership, health checks, alert thresholds, and exact rollback commands.
- [ ] Deploy `mobile-web` to a preview hostname with the approved content version pinned.
- [ ] Run smoke/E2E/visual/link/asset checks, advance a staging alias, then roll back to Docusaurus and measure recovery time.
- [ ] Re-advance to `mobile-web` only after both directions succeed and no content/database mutation is needed for rollback.
- [ ] Commit: `docs: add rehearsed mobile web cutover runbook`.

### Task 8: Production cutover

- [ ] Freeze content edits for the announced window and publish one final version; record its version, checksum summary, and Notion last-edited watermark.
- [ ] Run `npm test`, typecheck, build, functional E2E, visual regression, migration parity, link/asset audit, and any enabled AI evaluation.
- [ ] Obtain explicit release approval referencing the content version, implementation revision, reports, screenshots, and rollback rehearsal.
- [ ] Switch the public entry to `mobile-web`, monitor 404/5xx, search zero-results, asset failures, answer insufficiency/grounding, latency, and feedback.
- [ ] Roll back immediately on broken primary journeys, unavailable source pages/assets, mixed content versions, or citation corruption.
- [ ] Commit: `ops: record mobile web production cutover`.

### Task 9: Stabilize without deleting the old site

- [ ] Keep Docusaurus deployable and content frozen for the approved observation period.
- [ ] Triage failures against manifest/source ownership; fix publication data before considering UI exceptions.
- [ ] Publish a post-cutover report with success metrics, incidents, unresolved pages, rollback readiness, and the next migration batch.
- [ ] Request separate human approval before archiving routes or deleting any Docusaurus content.
- [ ] Commit: `docs: close first content migration batch`.

## Completion gate

Cutover is complete only when every first-batch manifest page has owner approval, parity reports show no lost text/broken links/missing assets/unknown blocks, logged-out access works, search and citation anchors resolve against one content version, the complete frontend gate passes, and a timed rollback to Docusaurus has succeeded.

