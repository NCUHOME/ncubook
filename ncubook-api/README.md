# ncubook-api

Next.js API service for 此间. It powers the public AI assistant, feedback collection,
ops summaries, and the internal official-content admin workflow.

## Local Setup

```bash
cd ncubook-api
cp .env.local.example .env.local
npm install
npm run dev
```

Required production-like environment variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_GENERATIVE_AI_API_KEY`
- `DEEPSEEK_API_KEY`
- `ADMIN_TOKEN`

Optional environment variables:

- `OPS_READ_TOKEN`
- `CRON_SECRET`
- `LARK_APP_ID`
- `LARK_APP_SECRET`
- `LARK_FEEDBACK_BASE_TOKEN`
- `LARK_FEEDBACK_TABLE_ID`
- `LARK_FEEDBACK_SYNC_ENABLED`

## Supabase Migrations

Run SQL in the Supabase SQL Editor unless you also have a direct Postgres
connection URL available locally.

Recommended order:

1. `supabase-agent-ops-migration.sql`
   - Creates Agent ops tables: query logs, knowledge gaps, and feedback.
   - Safe to rerun because it uses `create table if not exists`.

2. `supabase-official-content-admin-migration.sql`
   - Creates the official-source crawl and AI draft review tables.
   - Safe to rerun because it uses `create table if not exists`.

Historical migration:

- `supabase-migration.sql`
  - Changes `documents.embedding` to `vector(3072)` and truncates `documents`.
  - Do not run this during routine ops/admin setup unless you intentionally want
    to rebuild the document index afterward.

After running migrations:

```bash
npm run check:admin
npm run test:source-filter
npm run build
```

## Admin Workflow

```bash
npm run check:admin
npm run demo:admin
```

`check:admin` only verifies environment variables and required Supabase tables.
`demo:admin` runs the crawl-to-draft-to-approval demo flow and may write rows to
the admin tables.

## Feedback Sync

Production Lark/Feishu sync is disabled by default. To mirror Supabase feedback
records into Feishu from a local authenticated environment:

```bash
npm run sync:feishu
```
