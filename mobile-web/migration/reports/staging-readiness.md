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

## Remaining release work

1. Commit the first real staging content version and verify page, block, asset and search integrity.
2. Complete parity, citation and rollback rehearsal before marking T3.4 complete.
