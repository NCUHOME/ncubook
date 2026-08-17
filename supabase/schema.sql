-- ============================================================================
-- 此间 (NCU Book) - Supabase Schema v2
-- 原则：渲染按页取数 / SQL 全文检索 / 分块暂存+短事务切线 / 任务与版本分家
-- ============================================================================

-- 0. 扩展
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- 1. 通用 updated_at 触发器
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- 2. 内容版本表（纯版本语义，禁止存放任务日志）
create table if not exists content_versions (
  id text primary key,
  schema_version integer not null default 2 check (schema_version = 2),
  source_root_id text not null,
  status text not null default 'pending'
    check (status in ('pending', 'staging', 'published', 'failed')),
  started_at timestamptz not null default now(),
  published_at timestamptz,
  failed_at timestamptz,
  fail_stage text check (fail_stage is null or fail_stage in
    ('fetch','transform','mirror-assets','search-index','commit')),
  fail_reason text,
  checksum text,
  summary jsonb not null default '{}'::jsonb,
  check ((status = 'published' and published_at is not null)
      or (status = 'failed' and failed_at is not null)
      or status in ('pending','staging'))
);

-- 3. 发布页面表（强类型探针列 + 物化路由）
create table if not exists published_pages (
  id bigint generated always as identity primary key,
  content_version text not null references content_versions(id) on delete cascade,
  source_page_id text not null,
  parent_source_page_id text,
  title text not null,
  slug text not null,
  -- 物化完整路由（如 /docs/campus-shuttle），渲染端免二次解析
  route_path text not null,
  -- 物化页面树路径：[{sourcePageId,title,slug}]，JSON 索引即得，树查询零递归
  tree_path jsonb not null default '[]'::jsonb,
  school text not null default 'ncu' check (school = 'ncu'),
  risk_level text not null default 'normal'
    check (risk_level in ('normal','needs-verification','sensitive')),
  source_urls jsonb not null default '[]'::jsonb,
  last_edited_time timestamptz not null,
  last_published_at timestamptz not null,
  metadata jsonb not null default '{}'::jsonb, -- 仅存松散扩展位
  unique (content_version, source_page_id),
  unique (content_version, slug)
);

-- 4. 正文块表
create table if not exists published_blocks (
  id bigint generated always as identity primary key,
  content_version text not null,
  source_page_id text not null,
  source_block_id text not null,
  anchor text not null check (anchor = 'b-' || source_block_id),
  ordinal integer not null check (ordinal >= 0),
  block_type text not null,
  block jsonb not null,
  unique (content_version, source_page_id, source_block_id),
  unique (content_version, source_page_id, anchor),
  foreign key (content_version, source_page_id)
    references published_pages(content_version, source_page_id) on delete cascade
);

-- 5. 资源表
create table if not exists published_assets (
  id bigint generated always as identity primary key,
  content_version text not null,
  source_page_id text not null,
  source_block_id text not null,
  asset_id text not null,
  kind text not null check (kind in ('image','file')),
  public_url text not null,
  checksum text not null,
  alt text,
  media_type text,
  byte_size bigint check (byte_size is null or byte_size >= 0),
  unique (content_version, asset_id),
  unique (content_version, source_block_id),
  foreign key (content_version, source_page_id)
    references published_pages(content_version, source_page_id) on delete cascade
);

-- 6. 搜索段表（tsvector 生成列真正投入使用）
create table if not exists published_search_segments (
  id bigint generated always as identity primary key,
  content_version text not null,
  source_page_id text not null,
  source_block_id text not null,
  page_title text not null,
  section_path text[] not null default '{}',
  anchor text not null check (anchor = 'b-' || source_block_id),
  plain_text text not null,
  block_type text not null check (block_type in
    ('paragraph','heading','quote','callout','table','page-link')),
  search_vector tsvector generated always as
    (to_tsvector('simple', page_title || ' ' || plain_text)) stored,
  unique (content_version, source_page_id, source_block_id),
  foreign key (content_version, source_page_id)
    references published_pages(content_version, source_page_id) on delete cascade
);

-- 7. 发布失败记录（保留，结构化）
create table if not exists publication_failures (
  id uuid primary key default gen_random_uuid(),
  content_version text not null references content_versions(id) on delete cascade,
  source_page_id text,
  source_block_id text,
  stage text not null,
  reason text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- 8. 指针表
create table if not exists published_content_pointer (
  singleton boolean primary key default true check (singleton),
  content_version text not null references content_versions(id),
  updated_at timestamptz not null default now()
);

-- 9. 同步任务与任务日志（取代 failure_reason 寄生存储）
create table if not exists sync_jobs (
  id uuid primary key default gen_random_uuid(),
  content_version text references content_versions(id) on delete set null,
  command text not null check (command in ('publish','rollback')),
  status text not null default 'running'
    check (status in ('running','succeeded','failed','released')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  fail_reason text,
  updated_at timestamptz not null default now()
);

create table if not exists sync_job_logs (
  id bigint generated always as identity primary key,
  job_id uuid not null references sync_jobs(id) on delete cascade,
  seq integer not null,
  level text not null default 'info' check (level in ('info','warn','error')),
  event text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (job_id, seq)
);

-- 10. 评测运行记录（取代文件系统存储）
create table if not exists evaluation_runs (
  id uuid primary key default gen_random_uuid(),
  mode text not null check (mode in ('fixture','shadow','production')),
  summary jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists evaluation_cases (
  id text primary key,
  question text not null,
  page_context jsonb,
  expectations jsonb not null default '{}'::jsonb,
  enabled boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

-- 11. 限流计数桶（沿用）
create table if not exists rate_limit_buckets (
  bucket_key text primary key,
  minute_window bigint not null,
  request_count integer not null default 1 check (request_count >= 1),
  updated_at timestamptz not null default now()
);

-- 12. 索引
-- 渲染按页取数
create index if not exists pages_version_parent_idx
  on published_pages (content_version, parent_source_page_id);
create index if not exists pages_version_route_idx
  on published_pages (content_version, route_path);
create index if not exists blocks_page_order_idx
  on published_blocks (content_version, source_page_id, ordinal);
-- 关键词搜索：GIN 全文 + trgm 中文短查询
create index if not exists segments_fts_idx
  on published_search_segments using gin (search_vector);
create index if not exists segments_plain_text_trgm_idx
  on published_search_segments using gin (plain_text gin_trgm_ops);
create index if not exists segments_page_title_trgm_idx
  on published_search_segments using gin (page_title gin_trgm_ops);
create index if not exists segments_page_idx
  on published_search_segments (content_version, source_page_id);
-- AI 粗召回过滤面
create index if not exists pages_version_school_idx
  on published_pages (content_version, school);

-- 13. updated_at 触发器统一挂载
drop trigger if exists pointer_updated_at on published_content_pointer;
create trigger pointer_updated_at before update on published_content_pointer
  for each row execute function set_updated_at();
drop trigger if exists sync_jobs_updated_at on sync_jobs;
create trigger sync_jobs_updated_at before update on sync_jobs
  for each row execute function set_updated_at();
drop trigger if exists evaluation_cases_updated_at on evaluation_cases;
create trigger evaluation_cases_updated_at before update on evaluation_cases
  for each row execute function set_updated_at();
drop trigger if exists rate_limit_buckets_updated_at on rate_limit_buckets;
create trigger rate_limit_buckets_updated_at before update on rate_limit_buckets
  for each row execute function set_updated_at();

-- 14. RPC：安全校验辅助
create or replace function current_published_content_version()
returns text language sql stable security definer
set search_path = public, pg_temp set row_security = off as $$
  select pointer.content_version
  from published_content_pointer pointer
  join content_versions version on version.id = pointer.content_version
  where pointer.singleton = true and version.status = 'published'
$$;
grant execute on function current_published_content_version() to anon, authenticated;

-- 15. RPC：分块暂存（发布写入阶段，可多次调用）
create or replace function stage_published_chunk(
  p_content_version text,
  p_pages jsonb, p_blocks jsonb, p_assets jsonb, p_segments jsonb
) returns void language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  if not exists (
    select 1 from content_versions
    where id = p_content_version and status in ('pending','staging')
  ) then
    raise exception 'content version % is not stageable', p_content_version;
  end if;
  update content_versions set status = 'staging' where id = p_content_version;

  insert into published_pages (
    content_version, source_page_id, parent_source_page_id, title, slug,
    route_path, tree_path, school, risk_level, source_urls,
    last_edited_time, last_published_at, metadata
  ) select
    p_content_version, v->>'sourcePageId', nullif(v->>'parentSourcePageId',''),
    v->>'title', v->>'slug', v->>'routePath', coalesce(v->'treePath','[]'::jsonb),
    coalesce(v->>'school','ncu'), coalesce(v->>'riskLevel','normal'),
    coalesce(v->'sourceUrls','[]'::jsonb),
    (v->>'lastEditedTime')::timestamptz, (v->>'lastPublishedAt')::timestamptz,
    coalesce(v->'metadata','{}'::jsonb)
  from jsonb_array_elements(p_pages) v;

  insert into published_blocks (
    content_version, source_page_id, source_block_id, anchor, ordinal, block_type, block
  ) select
    p_content_version, v->>'sourcePageId', v->>'sourceBlockId', v->>'anchor',
    (v->>'ordinal')::integer, v->>'blockType', v->'block'
  from jsonb_array_elements(p_blocks) v;

  insert into published_assets (
    content_version, source_page_id, source_block_id, asset_id, kind,
    public_url, checksum, alt
  ) select
    p_content_version, v->>'sourcePageId', v->>'sourceBlockId', v->>'assetId',
    v->>'kind', v->>'publicUrl', v->>'checksum', nullif(v->>'alt','')
  from jsonb_array_elements(p_assets) v;

  insert into published_search_segments (
    content_version, source_page_id, source_block_id, page_title,
    section_path, anchor, plain_text, block_type
  ) select
    p_content_version, v->>'sourcePageId', v->>'sourceBlockId', v->>'pageTitle',
    array(select jsonb_array_elements_text(coalesce(v->'sectionPath', '[]'::jsonb))),
    v->>'anchor', v->>'plainText', v->>'blockType'
  from jsonb_array_elements(p_segments) v;
end;
$$;

-- 16. RPC：原子切线（独立短事务，唯一写指针的入口）
create or replace function commit_published_content_version(
  p_content_version text,
  p_expected_current_version text,
  p_checksum text,
  p_summary jsonb
) returns void language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  locked_current text;
begin
  select content_version into locked_current
  from published_content_pointer where singleton = true for update;

  if locked_current is distinct from p_expected_current_version then
    raise exception 'published pointer conflict: expected %, found %',
      p_expected_current_version, locked_current using errcode = '40001';
  end if;
  if not exists (
    select 1 from content_versions where id = p_content_version and status = 'staging'
  ) then
    raise exception 'content version % is not staged', p_content_version;
  end if;
  if not exists (
    select 1 from published_pages
    where content_version = p_content_version and school = 'ncu'
  ) then
    raise exception 'content version % has no stageable pages', p_content_version;
  end if;

  update content_versions
  set status = 'published', published_at = now(),
      checksum = p_checksum, summary = p_summary
  where id = p_content_version;

  insert into published_content_pointer (singleton, content_version)
  values (true, p_content_version)
  on conflict (singleton) do update
  set content_version = excluded.content_version;
end;
$$;

-- 17. RPC：回滚 / 失败标记
create or replace function rollback_published_content_version(
  p_target_version text, p_expected_current_version text
) returns void language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  locked_current text;
begin
  select content_version into locked_current
  from published_content_pointer where singleton = true for update;
  if locked_current is distinct from p_expected_current_version then
    raise exception 'published pointer conflict: expected %, found %',
      p_expected_current_version, locked_current using errcode = '40001';
  end if;
  if not exists (
    select 1 from content_versions where id = p_target_version and status = 'published'
  ) then
    raise exception 'target content version % is not published', p_target_version;
  end if;
  update published_content_pointer
  set content_version = p_target_version where singleton = true;
end;
$$;

create or replace function fail_published_content_version(
  p_content_version text, p_source_page_id text, p_source_block_id text,
  p_stage text, p_reason text
) returns void language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  update content_versions
  set status = 'failed', failed_at = now(), fail_stage = p_stage, fail_reason = p_reason
  where id = p_content_version and status in ('pending','staging');
  insert into publication_failures (content_version, source_page_id, source_block_id, stage, reason)
  values (p_content_version, p_source_page_id, p_source_block_id, p_stage, p_reason);
end;
$$;

-- 18. RPC：关键词搜索（SQL 单一事实源，替代 Node 内存扫描）
create or replace function search_published_segments(
  p_query text, p_limit integer default 20
) returns table (
  source_page_id text, page_title text, section_path text[],
  anchor text, block_type text, plain_text text,
  ts_rank double precision, trgm_score double precision
) language sql stable security definer
set search_path = public, pg_temp as $$
  select
    seg.source_page_id, seg.page_title, seg.section_path,
    seg.anchor, seg.block_type, seg.plain_text,
    ts_rank_cd(seg.search_vector, websearch_to_tsquery('simple', p_query))::double precision,
    greatest(
      similarity(seg.plain_text, p_query),
      similarity(seg.page_title, p_query)
    )::double precision
  from published_search_segments seg
  where seg.content_version = current_published_content_version()
    and (
      seg.search_vector @@ websearch_to_tsquery('simple', p_query)
      or seg.plain_text % p_query
      or seg.page_title % p_query
    )
  order by
    greatest(
      ts_rank_cd(seg.search_vector, websearch_to_tsquery('simple', p_query)),
      similarity(seg.plain_text, p_query),
      similarity(seg.page_title, p_query)
    ) desc,
    seg.id asc
  limit least(greatest(p_limit, 1), 50)
$$;

-- 19. RPC：AI 粗召回（只返回带原始分数的候选，融合排序归应用层）
create or replace function match_published_segments(
  p_question text, p_limit integer default 24
) returns table (
  source_id text, page_id text, page_title text, anchor text,
  section_path text[], exact_text text, risk_level text, school text,
  content_version text, lexical_score double precision, source_urls jsonb
) language sql stable security definer
set search_path = public, pg_temp as $$
  select
    seg.source_block_id, seg.source_page_id, seg.page_title, seg.anchor,
    seg.section_path, seg.plain_text, page.risk_level, page.school,
    seg.content_version,
    greatest(
      ts_rank_cd(seg.search_vector, websearch_to_tsquery('simple', p_question)),
      similarity(seg.plain_text, p_question)
    )::double precision,
    page.source_urls
  from published_search_segments seg
  join published_pages page
    on page.content_version = seg.content_version
   and page.source_page_id = seg.source_page_id
  where seg.content_version = current_published_content_version()
    and page.school = 'ncu'
    and (
      seg.search_vector @@ websearch_to_tsquery('simple', p_question)
      or seg.plain_text % p_question
    )
  order by
    greatest(
      ts_rank_cd(seg.search_vector, websearch_to_tsquery('simple', p_question)),
      similarity(seg.plain_text, p_question)
    ) desc,
    seg.source_block_id asc
  limit least(greatest(p_limit, 1), 50)
$$;

-- 20. RPC：限流
create or replace function consume_ask_rate_limit(
  p_bucket_key text, p_minute_window bigint
) returns integer language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  new_count integer;
begin
  insert into rate_limit_buckets (bucket_key, minute_window, request_count)
  values (p_bucket_key, p_minute_window, 1)
  on conflict (bucket_key) do update
  set request_count = case
        when rate_limit_buckets.minute_window = excluded.minute_window
          then rate_limit_buckets.request_count + 1 else 1 end,
      minute_window = excluded.minute_window
  returning request_count into new_count;
  delete from rate_limit_buckets where minute_window < p_minute_window;
  return new_count;
end;
$$;

-- 21. 已发布版本不可变触发器
create or replace function reject_published_version_mutation()
returns trigger language plpgsql set search_path = public, pg_temp as $$
declare
  target_version text; target_status text;
begin
  if tg_table_name = 'content_versions' then target_version := old.id;
  else target_version := old.content_version; end if;
  select status into target_status from content_versions where id = target_version;
  if target_status = 'published' then
    raise exception 'Published content version % is immutable', target_version;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;
drop trigger if exists content_versions_immutable on content_versions;
create trigger content_versions_immutable before update or delete on content_versions
  for each row execute function reject_published_version_mutation();
drop trigger if exists published_pages_immutable on published_pages;
create trigger published_pages_immutable before update or delete on published_pages
  for each row execute function reject_published_version_mutation();
drop trigger if exists published_blocks_immutable on published_blocks;
create trigger published_blocks_immutable before update or delete on published_blocks
  for each row execute function reject_published_version_mutation();
drop trigger if exists published_assets_immutable on published_assets;
create trigger published_assets_immutable before update or delete on published_assets
  for each row execute function reject_published_version_mutation();
drop trigger if exists published_search_segments_immutable on published_search_segments;
create trigger published_search_segments_immutable before update or delete on published_search_segments
  for each row execute function reject_published_version_mutation();

-- 22. RLS（产品红线：anon 只读当前指针版本）
alter table content_versions enable row level security;
alter table published_pages enable row level security;
alter table published_blocks enable row level security;
alter table published_assets enable row level security;
alter table published_search_segments enable row level security;
alter table publication_failures enable row level security;
alter table published_content_pointer enable row level security;
alter table sync_jobs enable row level security;
alter table sync_job_logs enable row level security;
alter table evaluation_runs enable row level security;
alter table evaluation_cases enable row level security;
alter table rate_limit_buckets enable row level security;

drop policy if exists current_pages_are_public on published_pages;
create policy current_pages_are_public on published_pages
  for select using (content_version = current_published_content_version());
drop policy if exists current_blocks_are_public on published_blocks;
create policy current_blocks_are_public on published_blocks
  for select using (content_version = current_published_content_version());
drop policy if exists current_assets_are_public on published_assets;
create policy current_assets_are_public on published_assets
  for select using (content_version = current_published_content_version());
drop policy if exists current_segments_are_public on published_search_segments;
create policy current_segments_are_public on published_search_segments
  for select using (content_version = current_published_content_version());
drop policy if exists current_pointer_is_public on published_content_pointer;
create policy current_pointer_is_public on published_content_pointer
  for select using (content_version = current_published_content_version());
drop policy if exists current_version_is_public on content_versions;
create policy current_version_is_public on content_versions
  for select using (status = 'published' and id = current_published_content_version());

-- 23. RPC 执行权限：管理级全部 revoke，仅 service_role
revoke all on function stage_published_chunk(text, jsonb, jsonb, jsonb, jsonb) from public, anon, authenticated;
revoke all on function commit_published_content_version(text, text, text, jsonb) from public, anon, authenticated;
revoke all on function rollback_published_content_version(text, text) from public, anon, authenticated;
revoke all on function fail_published_content_version(text, text, text, text, text) from public, anon, authenticated;
revoke all on function match_published_segments(text, integer) from public, anon, authenticated;
revoke all on function consume_ask_rate_limit(text, bigint) from public, anon, authenticated;
grant execute on function stage_published_chunk(text, jsonb, jsonb, jsonb, jsonb) to service_role;
grant execute on function commit_published_content_version(text, text, text, jsonb) to service_role;
grant execute on function rollback_published_content_version(text, text) to service_role;
grant execute on function fail_published_content_version(text, text, text, text, text) to service_role;
grant execute on function match_published_segments(text, integer) to service_role;
grant execute on function consume_ask_rate_limit(text, bigint) to service_role;
revoke all on function search_published_segments(text, integer) from public;
grant execute on function search_published_segments(text, integer) to anon, authenticated, service_role;
