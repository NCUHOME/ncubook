-- ============================================
-- Agent 运营闭环：问题日志、知识缺口、用户反馈
-- 安全说明：本文件只创建/补齐 Agent 运营表，不会清空 documents。
-- ============================================

create extension if not exists pgcrypto;

create table if not exists agent_query_logs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  current_path text,
  user_agent text,
  retrieval_state text not null check (retrieval_state in ('strong', 'partial', 'weak', 'none')),
  source_count int not null default 0,
  max_similarity float not null default 0,
  top_sources jsonb not null default '[]'::jsonb,
  should_create_gap boolean not null default false,
  gap_reason text,
  latency_ms int,
  created_at timestamptz not null default now()
);

create index if not exists agent_query_logs_created_at_idx
  on agent_query_logs (created_at desc);

create index if not exists agent_query_logs_retrieval_state_idx
  on agent_query_logs (retrieval_state);

create index if not exists agent_query_logs_current_path_idx
  on agent_query_logs (current_path);

create table if not exists agent_knowledge_gaps (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null unique,
  sample_question text not null,
  source_path text,
  trigger_reason text not null,
  status text not null default 'open' check (status in ('open', 'triaged', 'in_progress', 'resolved', 'ignored')),
  occurrence_count int not null default 1,
  latest_query_log_id uuid references agent_query_logs(id) on delete set null,
  owner text,
  resolution_note text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists agent_knowledge_gaps_status_idx
  on agent_knowledge_gaps (status);

create index if not exists agent_knowledge_gaps_last_seen_idx
  on agent_knowledge_gaps (last_seen_at desc);

create table if not exists agent_feedback (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('agent_answer', 'page')),
  query_log_id uuid references agent_query_logs(id) on delete set null,
  vote text not null check (vote in ('helpful', 'not_helpful')),
  page_path text,
  question text,
  answer_excerpt text,
  comment text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists agent_feedback_created_at_idx
  on agent_feedback (created_at desc);

create index if not exists agent_feedback_query_log_id_idx
  on agent_feedback (query_log_id);

create index if not exists agent_feedback_vote_idx
  on agent_feedback (vote);

create index if not exists agent_feedback_target_type_idx
  on agent_feedback (target_type);
