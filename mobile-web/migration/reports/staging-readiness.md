# Staging readiness — 2026-07-13

## Supabase

- Project: `ufvzfrmyrnvzfnsbltla` (`Poworred's Project`), restored to `ACTIVE_HEALTHY`.
- Existing legacy tables were preserved. All four legacy tables were empty at inspection time.
- Applied the versioned publication schema and permission hardening migrations.
- Created the public-read, server-write `published-content` Storage bucket.
- Verified privileged publication RPCs are executable by `service_role` only. The public current-version helper remains intentionally executable by `anon` and `authenticated` because read policies depend on it.
- Ran an atomic one-page publication smoke test inside a transaction; the version pointer, page, block and search entry were committed together, then the transaction was rolled back.

## Notion

- The connected workspace can read the editorial root and its 37-page descendant inventory.
- Re-fetched the three divider-affected pages and confirmed the observed count remains 10: `写在前面` (8), `新生必看` (1), `校园跑&体测` (1).
- `写在前面` contains a callout with a nested list. The publisher now fails explicitly on callout children instead of silently discarding them.

## Remaining release blockers

1. The frozen Block schema has no `divider` and no nested-callout representation. Publication remains blocked until a separately approved schema amendment is implemented.
2. The connected Notion app does not expose raw block UUIDs as a server runtime token. The authoritative publisher dry-run still requires a read-only Notion Integration token configured outside Git.
3. The Supabase connector cannot export a service-role runtime credential. Deployment still needs that secret configured outside Git.
4. Legacy table `public.documents` has RLS disabled. It is outside this migration's ownership and was not modified; it must not be exposed with a client key until an owner chooses its read/write policies.
