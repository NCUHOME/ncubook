# Notion Block-Tree Publication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish approved Notion page trees into the public site as versioned Page/Block/Asset/SearchIndex data without a Markdown intermediate.

**Architecture:** Add a server-only publication pipeline inside `mobile-web/`: a narrow Notion client reads source pages, pure mappers produce the frozen published schema, an asset mirror stores durable files, and one transactional publisher advances the active content version only after every required validation succeeds. Readers query only the active version; failed pages keep their last successful version.

**Tech Stack:** Next.js 15 server routes, TypeScript, Notion REST API, Supabase Postgres/Storage, Vitest.

---

## Scope and invariants

- The source of stable IDs is Notion `page.id` and `block.id`; titles, slugs and array positions are never identity.
- The pipeline never calls `markdownToNotionBlocks` or `notionBlocksToMarkdown`; the existing root scripts remain untouched until cutover.
- Notion temporary asset URLs never enter published records.
- A publication run is immutable. The active pointer moves only after pages, blocks, assets and search entries validate together.
- Unknown blocks fail that page and preserve its previous published version.

## File map

- Create `mobile-web/supabase/published-content.sql`: version, page, block, asset, search-entry, failure and active-pointer tables plus read policies.
- Create `mobile-web/lib/publishing/notion-client.ts`: paginated source API adapter.
- Create `mobile-web/lib/publishing/notion-types.ts`: minimal source response types used by the mapper.
- Create `mobile-web/lib/publishing/map-rich-text.ts`: source rich-text to published `RichText`.
- Create `mobile-web/lib/publishing/map-block-tree.ts`: exhaustive source block mapper.
- Create `mobile-web/lib/publishing/mirror-assets.ts`: download, checksum and Supabase Storage upload.
- Create `mobile-web/lib/publishing/build-search-index.ts`: deterministic entries from mapped blocks.
- Create `mobile-web/lib/publishing/publish-run.ts`: validate, persist and atomically activate a version.
- Create `mobile-web/lib/content/load-published-snapshot.ts`: asynchronously read one complete active-version snapshot.
- Modify `mobile-web/lib/content/published-repository.ts`: pure selector factory over an injected snapshot.
- Modify App Router page/API loaders under `mobile-web/app/`: await a snapshot before calling selectors.
- Create `mobile-web/app/api/publish/notion/route.ts`: authenticated manual/cron boundary.
- Create tests under `mobile-web/tests/publishing/` and fixtures under `mobile-web/tests/fixtures/notion/`.
- Modify `mobile-web/README.md`: environment, dry-run, publish and rollback instructions.

### Task 1: Add versioned publication storage

**Files:**
- Create: `mobile-web/supabase/published-content.sql`
- Create: `mobile-web/tests/publishing/schema.test.ts`

- [ ] Write a failing schema test asserting tables `content_versions`, `published_pages`, `published_blocks`, `published_assets`, `published_search_entries`, `publication_failures`, and singleton `active_content_version` exist.
- [ ] Assert uniqueness on `(content_version, source_page_id)` and `(content_version, source_block_id)`, and a foreign key from the active pointer to a successful version.
- [ ] Run `npm test -- publishing/schema.test.ts`; expect failure because the migration is absent.
- [ ] Implement the migration with `status in ('building','published','failed')`, JSONB block payloads, immutable version rows and service-role-only writes.
- [ ] Add an RPC `activate_content_version(version_id)` that rejects non-`published` versions and changes only the pointer.
- [ ] Re-run the test and a disposable Supabase migration check; expect pass.
- [ ] Commit: `feat: add versioned published content storage`.

### Task 2: Read Notion pages without flattening

**Files:**
- Create: `mobile-web/lib/publishing/notion-types.ts`
- Create: `mobile-web/lib/publishing/notion-client.ts`
- Create: `mobile-web/tests/publishing/notion-client.test.ts`

- [ ] Write failing tests for paginated database queries, paginated child blocks, recursive children, rate-limit retry using `Retry-After`, and injected `fetch`.
- [ ] Run the test; expect missing-module failure.
- [ ] Implement `NotionClient` with `queryPages()`, `getPage()`, `getBlockChildren()` and bounded retry; accept token/database ID only in the constructor.
- [ ] Prove the client returns raw block objects and never imports the root `scripts/notion-content-sync.mjs` conversion helpers.
- [ ] Re-run tests; expect pass.
- [ ] Commit: `feat: add paginated notion source client`.

### Task 3: Map the frozen rich-content contract

**Files:**
- Create: `mobile-web/lib/publishing/map-rich-text.ts`
- Create: `mobile-web/lib/publishing/map-block-tree.ts`
- Create: `mobile-web/tests/publishing/block-mapper.test.ts`
- Create: `mobile-web/tests/fixtures/notion/rich-page.json`

- [ ] Create a source fixture covering paragraphs, H1–H3, nested lists, quote, callout, table, image, file, columns, child page link and allowlisted/non-allowlisted embeds.
- [ ] Write a failing exhaustive mapper test asserting `anchor === 'b-' + sourceBlockId`, internal links use `pageId`, column order is retained, and an unknown block produces a typed failure.
- [ ] Run the test; expect missing mapper.
- [ ] Implement pure mapping functions returning `{ blocks, assetRequests, failures }`; do not fetch or write inside mappers.
- [ ] Validate the result with the existing `Block` union in `lib/content/published-schema.ts` rather than creating a second published schema.
- [ ] Re-run tests; expect every supported block to pass and unknown blocks to fail explicitly.
- [ ] Commit: `feat: map notion rich blocks to publication schema`.

### Task 4: Mirror durable assets

**Files:**
- Create: `mobile-web/lib/publishing/mirror-assets.ts`
- Create: `mobile-web/tests/publishing/mirror-assets.test.ts`

- [ ] Write failing tests using injected download/storage adapters: checksum de-duplicates identical bytes, changed bytes create a new immutable object key, failed downloads abort the page, and no Notion URL is returned.
- [ ] Implement SHA-256 checksums and object keys `published/<sourceBlockId>/<checksum>/<filename>`.
- [ ] Require MIME/type and maximum-size validation before upload; record public Storage URLs only.
- [ ] Re-run tests; expect pass.
- [ ] Commit: `feat: mirror notion assets to durable storage`.

### Task 5: Build deterministic search entries

**Files:**
- Create: `mobile-web/lib/publishing/build-search-index.ts`
- Create: `mobile-web/tests/publishing/search-index-builder.test.ts`

- [ ] Write failing tests proving one entry per searchable source block, inherited heading path, original `plainText`, stable anchor, and exclusion of image/file/embed bodies.
- [ ] Implement a depth-first traversal over the published block tree; table rows get the table block anchor and original cell text.
- [ ] Ensure entry IDs are `${contentVersion}:${sourceBlockId}` and no summary/model module is imported.
- [ ] Re-run tests; expect pass.
- [ ] Commit: `feat: build versioned publication search index`.

### Task 6: Publish and atomically activate a version

**Files:**
- Create: `mobile-web/lib/publishing/publish-run.ts`
- Create: `mobile-web/tests/publishing/publish-run.test.ts`

- [ ] Write failing adapter-driven tests for dry-run, successful activation, one-page failure retaining its prior page version, first-publication failure staying hidden, and total failure leaving the active pointer unchanged.
- [ ] Implement phases `discover -> map -> mirror -> validate -> persist -> activate`; generate a content version from source edit watermark plus run timestamp.
- [ ] Persist per-page failures with source page/block IDs and never silently drop a block.
- [ ] When an edited page fails, copy its previous successful Page/Block/Asset/SearchIndex records into the new candidate version so one active snapshot never mixes version identifiers at read time.
- [ ] Activate only after all navigation roots and required assets are readable.
- [ ] Re-run tests; expect pass.
- [ ] Commit: `feat: publish validated notion content versions`.

### Task 7: Read the active version through existing selectors

**Files:**
- Create: `mobile-web/lib/content/load-published-snapshot.ts`
- Modify: `mobile-web/lib/content/published-repository.ts`
- Modify: `mobile-web/app/page.tsx`
- Modify: `mobile-web/app/sections/[slug]/page.tsx`
- Modify: `mobile-web/app/docs/[slug]/page.tsx`
- Modify: `mobile-web/app/search/page.tsx`
- Modify: `mobile-web/app/api/search/route.ts`
- Create: `mobile-web/tests/publishing/published-repository-adapter.test.ts`

- [ ] Write failing contract tests that load fixture/database snapshots, construct the same selector factory, and compare Page/Block/Asset/SearchIndex results.
- [ ] Refactor current selectors into `createPublishedRepository(snapshot)`; this factory stays synchronous and pure for components/tests.
- [ ] Implement async `loadPublishedSnapshot()` at the server boundary and update App Router loaders to await it; fixtures remain the explicit local/test fallback.
- [ ] Reject mixed content versions in one read and return the active version identifier with repository snapshots.
- [ ] Run all content, search and page-view tests; expect pass without changing presentational component props.
- [ ] Commit: `feat: read active published content versions`.

### Task 8: Secure operation, rollback and verification

**Files:**
- Create: `mobile-web/app/api/publish/notion/route.ts`
- Modify: `mobile-web/README.md`
- Create: `mobile-web/tests/publishing/publish-route.test.ts`

- [ ] Write failing route tests for missing/invalid bearer secret, dry-run, publish, and rollback to a specified previously published version.
- [ ] Implement a Node-runtime route with constant-time secret comparison and no secrets in response/log output.
- [ ] Document `NOTION_TOKEN`, `NOTION_DATABASE_ID`, Supabase service credentials, Storage bucket, dry-run and rollback commands.
- [ ] Run `npm test`, `npm run typecheck`, `npm run build`, and a staging dry-run followed by publish/rollback/publish.
- [ ] Confirm a browser without Notion access can read every published route and durable asset.
- [ ] Commit: `test: verify notion publication and rollback`.

## Release gate

- No unknown block, temporary URL, mixed version or partial activation is present.
- The rich fixture and one real private Notion page render identically in structure at 360/390/430px.
- Rollback restores the prior active version without a redeploy.
