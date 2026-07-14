-- ============================================
-- 修复向量维度不匹配问题
-- 将 documents 表和函数的 embedding 维度从 768 改为 3072
-- ============================================

-- 1. 删除旧索引 (如果存在)
drop index if exists documents_embedding_idx;

-- 2. 删除旧的函数 (因为参数签名变了)
drop function if exists match_documents(vector(768), float, int);
drop function if exists match_documents(vector(3072), float, int);

-- 3. 清空 documents 表中的旧数据，否则无法修改列类型
truncate documents;

-- 4. 修改列类型为 3072 维
alter table documents alter column embedding type vector(3072);

-- 5. 重新创建向量检索函数，参数改为 vector(3072)
create or replace function match_documents(
  query_embedding vector(3072),
  match_threshold float default 0.3,
  match_count int default 5
)
returns table (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    documents.id,
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where 1 - (documents.embedding <=> query_embedding) > match_threshold
  order by documents.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- 6. 创建索引 (pgvector 对 >2000 维的向量建议不要建立普通向量索引，
-- 对于小数据集，直接扫描速度非常快。所以我们这边暂时不建 ivfflat 索引，直接扫描即可，
-- 35篇文档的切片总数很少，不需要索引加速。)

-- ============================================
-- Agent 运营闭环：问题日志与知识缺口
-- 用于记录每次问答的检索质量，并自动沉淀待补知识点
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
