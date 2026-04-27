-- ============================================
-- 官网筛选 + AI 初稿审核中台 v1
-- 安全说明：只新增内容中台表，不修改/清空 documents 与 Agent 运营表。
-- ============================================

create extension if not exists pgcrypto;

create table if not exists official_sources (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  name text not null,
  department text not null,
  category text not null,
  url text not null,
  is_enabled boolean not null default true,
  last_crawled_at timestamptz,
  last_status text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists official_sources_enabled_idx
  on official_sources (is_enabled);

create table if not exists official_snapshots (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references official_sources(id) on delete cascade,
  url text not null,
  title text not null,
  content_excerpt text not null,
  content_hash text not null,
  published_at text,
  fetched_at timestamptz not null default now(),
  raw_text text,
  unique (source_id, content_hash)
);

create index if not exists official_snapshots_source_fetched_idx
  on official_snapshots (source_id, fetched_at desc);

create table if not exists official_candidate_events (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references official_sources(id) on delete cascade,
  snapshot_id uuid references official_snapshots(id) on delete set null,
  event_hash text not null unique,
  source_name text not null,
  department text not null,
  title text not null,
  source_url text not null,
  published_at text,
  content_excerpt text not null,
  status text not null default 'candidate'
    check (status in ('ignored', 'watching', 'candidate', 'drafted', 'approved', 'rejected', 'exported')),
  risk_level text not null default 'low'
    check (risk_level in ('low', 'medium', 'high')),
  filter_reason text not null,
  matched_keywords text[] not null default '{}',
  ignored_keywords text[] not null default '{}',
  suggested_doc_path text,
  suggested_action text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists official_candidate_events_status_idx
  on official_candidate_events (status);

create index if not exists official_candidate_events_risk_idx
  on official_candidate_events (risk_level);

create index if not exists official_candidate_events_created_idx
  on official_candidate_events (created_at desc);

create table if not exists content_drafts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references official_candidate_events(id) on delete cascade,
  title text not null,
  target_doc_path text,
  ai_markdown text not null,
  edited_markdown text,
  export_markdown text,
  source_links jsonb not null default '[]'::jsonb,
  status text not null default 'drafted'
    check (status in ('drafted', 'approved', 'rejected', 'exported')),
  review_note text,
  approved_at timestamptz,
  exported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id)
);

create index if not exists content_drafts_status_idx
  on content_drafts (status);

create index if not exists content_drafts_updated_idx
  on content_drafts (updated_at desc);

create table if not exists content_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor text not null default 'admin',
  action text not null,
  entity_type text not null,
  entity_id uuid,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists content_audit_logs_created_idx
  on content_audit_logs (created_at desc);
