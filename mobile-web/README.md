# 此间 Mobile Web

从零重构的 mobile-first 校园信息站。它不是 Docusaurus 文档站，而是以飞书多维表格信息卡片为内容真源的独立 Web，可以直接访问，也可以嵌入 App WebView。

## Local Development

```bash
npm install
npm run dev
```

## Environment

Optional for local fallback data:

```bash
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
LARK_APP_ID=
LARK_APP_SECRET=
LARK_BASE_APP_TOKEN=
LARK_BASE_TABLE_ID=
CRON_SECRET=
```

Without Supabase and Feishu credentials, the app uses sample published cards so the mobile UI and search flow remain usable.

## Data Flow

1. 飞书多维表格维护结构化信息卡片。
2. `POST /api/sync/lark` 拉取飞书记录并同步到 Supabase。
3. Public pages and `/api/search` only read `published` cards.
4. Search composes a short sourced answer from matched cards.
5. Weak/no source answers do not fabricate; feedback goes to `/api/feedback`.

## Checks

```bash
npm test
npm run typecheck
npm run build
```
