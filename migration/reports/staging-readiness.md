# Staging readiness — 2026-07-14

## Supabase

- Project: `ufvzfrmyrnvzfnsbltla` (`Poworred's Project`), restored to `ACTIVE_HEALTHY`.
- Existing legacy tables were preserved. All four legacy tables were empty at inspection time.
- Applied the versioned publication schema and permission hardening migrations.
- Created the public-read, server-write `published-content` Storage bucket.
- Verified privileged publication RPCs are executable by `service_role` only. The public current-version helper remains intentionally executable by `anon` and `authenticated` because read policies depend on it.
- Enabled RLS on the empty legacy `public.documents` table after Gate C approval.
- Ran an atomic one-page publication smoke test inside a transaction; the version pointer, page, block and search entry were committed together, then the transaction was rolled back.

## Notion

- The connected workspace can read the editorial root and its 37-page descendant inventory.
- Re-fetched the three divider-affected pages and confirmed the observed count remains 10: `写在前面` (8), `新生必看` (1), `校园跑&体测` (1).
- `写在前面` contains a callout with a nested list. Gate C added recursive callout children and `divider` to the first-release Block schema, normalizer, renderer and search traversal.
- Unit, type, production-build, mobile journey and approved visual-baseline checks pass after the extension.
- A read-only Notion integration was restricted to the `南大生存手册` root, with user-information and comment capabilities disabled.
- The authoritative 37-page dry-run passed as content version `content-20260714023145078`. It reported 95 non-blocking editorial warnings; no publication transaction was committed in dry-run mode.
- Real source content required and now has explicit support for ZIP and legacy Word attachments, Unicode filenames, bookmark links, empty embed placeholders and nested callout search anchors. Large source images remain lossless and are lazy-loaded in the reader.

## Runtime credentials

- A dedicated modern Supabase publisher key and the read-only Notion token are configured in an ignored, mode-600 local environment file. No runtime secret is stored in Git.

## Gate D staging result

1. The authoritative Gate D dry-run passed as `content-20260714052208220`: 37 pages and 48 non-blocking editorial warnings. The warnings remain 47 missing image alt texts and one skipped empty Notion embed placeholder.
2. Staging version `content-20260714052438077` is published and is the current pointer: 37 pages, 848 stored top-level blocks, 92 mirrored assets and 1,069 search entries. All 92 asset URLs are reachable, all search anchors resolve, and the manifest, hierarchy, page links and referenced assets have no audit issues.
3. The two PDFs nested in quote `2467d60a-0dda-809e-99c9-d5dfc89311bd` now render inside that quote. Their source block IDs are `2467d60a-0dda-80f5-b9ab-f909b0443fe9` and `2467d60a-0dda-803f-a040-f9ae759efb97`, with sibling indices 0 and 1 respectively.
4. A deterministic answer model used real Supabase retrieval against version B and produced a grounded citation whose exact document anchor returned HTTP 200. The same check passed again after restoration.
5. The persistent rollback rehearsal completed B → A → B: the pointer moved from `content-20260714052438077` to legacy `content-20260714030315891`, the schema-v1 quote decoded with empty children and all legacy invariants passed, then the pointer returned to B and repeated the structure, asset and citation checks with no issues.
6. The complete local gate passed: 120 unit/component tests, strict typecheck, production build, mobile E2E and all approved visual baselines. Gate D's 360/390/430px screenshots are recorded in `approval.md`.

## Remaining release work

- Gate D content staging is complete. Production hostname/DNS cutover and enabling production AI remain separately approved operations; Docusaurus stays deployable until that cutover is authorized.
