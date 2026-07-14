# Supabase migrations

Apply `schema.sql` first, then `published-content.sql` in a disposable project before production.

`published-content.sql` is additive. Rollback does not delete published data automatically:

1. Point `published_content_pointer` back to the last verified version.
2. Deploy the previous application revision and verify student reads.
3. Only after backup and explicit approval, drop the new policies, triggers, functions, indexes, and tables in reverse dependency order.

Never drop `content_versions` or an active version as part of an application rollback.
