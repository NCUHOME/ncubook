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
- Chat model credentials: either `OPENAI_COMPATIBLE_API_KEY` or `DEEPSEEK_API_KEY`
- Embedding credentials: `GOOGLE_GENERATIVE_AI_API_KEY`, unless the relay also
  supports embeddings and `OPENAI_COMPATIBLE_EMBEDDING_MODEL` is configured
- `ADMIN_TOKEN`

Optional environment variables:

- `OPS_READ_TOKEN`
- `CRON_SECRET`
- `LARK_APP_ID`
- `LARK_APP_SECRET`
- `LARK_FEEDBACK_BASE_TOKEN`
- `LARK_FEEDBACK_TABLE_ID`
- `LARK_FEEDBACK_SYNC_ENABLED`

## Model Provider

By default, the API can still use Gemini for embeddings and DeepSeek for chat.
To use an OpenAI-compatible relay for chat, configure:

```bash
OPENAI_COMPATIBLE_BASE_URL=https://your-relay.example.com/v1
OPENAI_COMPATIBLE_API_KEY=your-relay-api-key
OPENAI_COMPATIBLE_CHAT_MODEL=gpt-5.4
OPENAI_COMPATIBLE_WIRE_API=responses
```

`OPENAI_COMPATIBLE_WIRE_API` can be `responses` or `chat`. Use `responses` only
if the relay supports the OpenAI Responses API; otherwise set it to `chat`.

If the relay does not support embedding models, leave
`OPENAI_COMPATIBLE_EMBEDDING_MODEL` unset and embeddings continue to use Gemini.
Do not use a chat model as the embedding model. The current Supabase vector
schema expects 3072-dimensional embeddings, so if you later switch embeddings,
use a 3072-dimensional embedding model such as `text-embedding-3-large` or an
equivalent relay-provided model.

After changing the embedding provider or embedding model, rebuild the document
index:

```bash
npm run ingest
```

Embeddings from different models are not comparable even when the vector
dimension is the same, so old document vectors must be regenerated.

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
npm run test:health
npm run test:source-filter
npm run build
```

## Launch Health Check

```bash
npm run test:health
curl https://your-api-domain.example.com/api/health
```

`GET /api/health` returns a redacted configuration snapshot for launch checks.
It verifies whether Supabase, chat model, embedding model, admin protection,
ops protection, cron protection, and Feishu sync flags are configured without
exposing secret values.

The endpoint returns:

- `200` with `status: "ok"` when required launch dependencies are configured.
- `503` with `status: "degraded"` when required dependencies such as Supabase,
  chat model credentials, or embedding credentials are missing.

## Admin Workflow

```bash
npm run check:admin
npm run demo:admin
```

`check:admin` only verifies environment variables and required Supabase tables.
`demo:admin` runs the crawl-to-draft-to-approval demo flow and may write rows to
the admin tables.

## Eval Workflow

```bash
npm run eval
npm run eval:candidates
npm run test:eval-analysis
npm run test:eval-candidates
```

`npm run eval` runs the fixed campus QA regression set and writes a timestamped
JSON result under `evals/results/`.

`npm run eval:candidates` reads recent query logs, not-helpful feedback, and
knowledge gaps from Supabase, then exports a candidate pool under
`evals/candidates/`. Treat this output as raw operational data: review and
sanitize it before turning any item into a formal eval case or portfolio report.

## Feedback Sync

Production Lark/Feishu sync is disabled by default. To mirror Supabase feedback
records into Feishu from a local authenticated environment:

```bash
npm run sync:feishu
```
