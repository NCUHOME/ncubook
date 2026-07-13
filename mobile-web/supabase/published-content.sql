create extension if not exists pgcrypto;
create extension if not exists vector;
create extension if not exists pg_trgm;

create table if not exists content_versions (
  id text primary key,
  schema_version integer not null default 1 check (schema_version = 1),
  source_root_id text not null,
  status text not null default 'pending' check (status in ('pending', 'published', 'failed')),
  notion_last_edited_time timestamptz,
  started_at timestamptz not null default now(),
  published_at timestamptz,
  checksum text,
  summary jsonb not null default '{}'::jsonb,
  check ((status = 'published' and published_at is not null) or status <> 'published')
);

create table if not exists published_pages (
  id bigint generated always as identity primary key,
  content_version text not null references content_versions(id) on delete cascade,
  source_page_id text not null,
  parent_source_page_id text,
  title text not null,
  slug text not null,
  status text not null default 'published' check (status in ('published', 'failed')),
  last_edited_time timestamptz not null,
  last_published_at timestamptz not null,
  metadata jsonb not null,
  unique (content_version, source_page_id),
  unique (content_version, slug)
);

create table if not exists published_blocks (
  id bigint generated always as identity primary key,
  content_version text not null,
  source_page_id text not null,
  source_block_id text not null,
  anchor text not null,
  ordinal integer not null check (ordinal >= 0),
  block_type text not null,
  block jsonb not null,
  unique (content_version, source_page_id, source_block_id),
  unique (content_version, source_page_id, anchor),
  foreign key (content_version, source_page_id)
    references published_pages(content_version, source_page_id) on delete cascade,
  check (anchor = 'b-' || source_block_id)
);

create table if not exists published_assets (
  id bigint generated always as identity primary key,
  content_version text not null,
  source_page_id text not null,
  source_block_id text not null,
  asset_id text not null,
  kind text not null check (kind in ('image', 'file')),
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

create table if not exists published_search_entries (
  id bigint generated always as identity primary key,
  content_version text not null,
  source_page_id text not null,
  source_block_id text not null,
  page_title text not null,
  section_path text[] not null default '{}',
  anchor text not null,
  plain_text text not null,
  block_type text not null check (block_type in ('paragraph', 'heading', 'quote', 'callout', 'table', 'page-link')),
  updated_at timestamptz not null,
  search_vector tsvector generated always as (to_tsvector('simple', plain_text)) stored,
  unique (content_version, source_page_id, source_block_id),
  foreign key (content_version, source_page_id)
    references published_pages(content_version, source_page_id) on delete cascade,
  check (anchor = 'b-' || source_block_id)
);

alter table published_search_entries
  add column if not exists embedding vector(1536);

create index if not exists published_pages_parent_idx
  on published_pages (content_version, parent_source_page_id);
create index if not exists published_blocks_page_order_idx
  on published_blocks (content_version, source_page_id, ordinal);
create index if not exists published_search_entries_vector_idx
  on published_search_entries using gin (search_vector);
create index if not exists published_search_entries_embedding_idx
  on published_search_entries using hnsw (embedding vector_cosine_ops);

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

create table if not exists published_content_pointer (
  singleton boolean primary key default true check (singleton),
  content_version text not null references content_versions(id),
  updated_at timestamptz not null default now()
);

create or replace function commit_published_content_version(
  p_content_version text,
  p_expected_current_version text,
  p_checksum text,
  p_pages jsonb,
  p_blocks jsonb,
  p_assets jsonb,
  p_search_entries jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  locked_current_version text;
begin
  select content_version into locked_current_version
  from published_content_pointer
  where singleton = true
  for update;

  if locked_current_version is distinct from p_expected_current_version then
    raise exception 'published pointer conflict: expected %, found %', p_expected_current_version, locked_current_version
      using errcode = '40001';
  end if;

  if not exists (select 1 from content_versions where id = p_content_version and status = 'pending') then
    raise exception 'content version % is not pending', p_content_version;
  end if;

  insert into published_pages (
    content_version, source_page_id, parent_source_page_id, title, slug, status,
    last_edited_time, last_published_at, metadata
  )
  select
    p_content_version, value->>'sourcePageId', nullif(value->>'parentSourcePageId', ''),
    value->>'title', value->>'slug', 'published',
    (value->>'lastEditedTime')::timestamptz, (value->>'lastPublishedAt')::timestamptz,
    value->'metadata'
  from jsonb_array_elements(p_pages) value;

  insert into published_blocks (
    content_version, source_page_id, source_block_id, anchor, ordinal, block_type, block
  )
  select
    p_content_version, value->>'sourcePageId', value->>'sourceBlockId', value->>'anchor',
    (value->>'ordinal')::integer, value->>'blockType', value->'block'
  from jsonb_array_elements(p_blocks) value;

  insert into published_assets (
    content_version, source_page_id, source_block_id, asset_id, kind, public_url, checksum, alt
  )
  select
    p_content_version, value->>'sourcePageId', value->>'sourceBlockId', value->>'assetId',
    value->>'kind', value->>'publicUrl', value->>'checksum', nullif(value->>'alt', '')
  from jsonb_array_elements(p_assets) value;

  insert into published_search_entries (
    content_version, source_page_id, source_block_id, page_title, section_path,
    anchor, plain_text, block_type, updated_at
  )
  select
    p_content_version, value->>'sourcePageId', value->>'sourceBlockId', value->>'pageTitle',
    array(select jsonb_array_elements_text(value->'sectionPath')),
    value->>'anchor', value->>'plainText', value->>'blockType', (value->>'updatedAt')::timestamptz
  from jsonb_array_elements(p_search_entries) value;

  update content_versions
  set status = 'published', published_at = now(), checksum = p_checksum,
      summary = jsonb_build_object(
        'pages', jsonb_array_length(p_pages),
        'blocks', jsonb_array_length(p_blocks),
        'assets', jsonb_array_length(p_assets),
        'searchEntries', jsonb_array_length(p_search_entries)
      )
  where id = p_content_version;

  insert into published_content_pointer (singleton, content_version, updated_at)
  values (true, p_content_version, now())
  on conflict (singleton) do update
  set content_version = excluded.content_version, updated_at = excluded.updated_at;
end;
$$;

create or replace function rollback_published_content_version(
  p_target_version text,
  p_expected_current_version text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  locked_current_version text;
begin
  select content_version into locked_current_version
  from published_content_pointer
  where singleton = true
  for update;
  if locked_current_version is distinct from p_expected_current_version then
    raise exception 'published pointer conflict: expected %, found %', p_expected_current_version, locked_current_version
      using errcode = '40001';
  end if;
  if not exists (select 1 from content_versions where id = p_target_version and status = 'published') then
    raise exception 'target content version % is not published', p_target_version;
  end if;
  update published_content_pointer
  set content_version = p_target_version, updated_at = now()
  where singleton = true;
end;
$$;

create or replace function fail_published_content_version(
  p_content_version text,
  p_source_page_id text,
  p_source_block_id text,
  p_stage text,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update content_versions set status = 'failed'
  where id = p_content_version and status = 'pending';
  insert into publication_failures (
    content_version, source_page_id, source_block_id, stage, reason
  ) values (
    p_content_version, p_source_page_id, p_source_block_id, p_stage, p_reason
  );
end;
$$;

create or replace function unreferenced_published_asset_urls(
  p_retention interval default interval '30 days'
)
returns table (public_url text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select distinct asset.public_url
  from published_assets asset
  join content_versions version on version.id = asset.content_version
  where asset.content_version is distinct from (select content_version from published_content_pointer where singleton = true)
    and version.published_at < now() - p_retention
$$;

revoke all on function commit_published_content_version(text, text, text, jsonb, jsonb, jsonb, jsonb) from public;
revoke all on function rollback_published_content_version(text, text) from public;
revoke all on function fail_published_content_version(text, text, text, text, text) from public;
revoke all on function unreferenced_published_asset_urls(interval) from public;
grant execute on function commit_published_content_version(text, text, text, jsonb, jsonb, jsonb, jsonb) to service_role;
grant execute on function rollback_published_content_version(text, text) to service_role;
grant execute on function fail_published_content_version(text, text, text, text, text) to service_role;
grant execute on function unreferenced_published_asset_urls(interval) to service_role;

create or replace function retrieve_published_sources(
  p_question text,
  p_query_embedding vector(1536),
  p_limit integer default 24
)
returns table (
  source_id text,
  page_id text,
  page_title text,
  anchor text,
  section_path text[],
  exact_text text,
  risk_level text,
  school text,
  content_version text,
  lexical_score double precision,
  vector_score double precision,
  source_urls jsonb
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    entry.source_block_id,
    entry.source_page_id,
    entry.page_title,
    entry.anchor,
    entry.section_path,
    entry.plain_text,
    coalesce(page.metadata->>'riskLevel', 'normal'),
    page.metadata->>'school',
    entry.content_version,
    greatest(
      similarity(lower(entry.plain_text), lower(p_question)),
      case when position(lower(p_question) in lower(entry.plain_text)) > 0 then 1.0 else 0.0 end
    )::double precision,
    case when p_query_embedding is null or entry.embedding is null then 0.0
      else (1 - (entry.embedding <=> p_query_embedding))::double precision end,
    coalesce(page.metadata->'sourceUrls', '[]'::jsonb)
  from published_search_entries entry
  join published_pages page
    on page.content_version = entry.content_version and page.source_page_id = entry.source_page_id
  where entry.content_version = (
      select pointer.content_version
      from published_content_pointer pointer
      join content_versions version on version.id = pointer.content_version and version.status = 'published'
      where pointer.singleton = true
    )
    and page.metadata->>'school' = 'ncu'
  order by
    (greatest(similarity(lower(entry.plain_text), lower(p_question)), case when position(lower(p_question) in lower(entry.plain_text)) > 0 then 1.0 else 0.0 end)
      + case when p_query_embedding is null or entry.embedding is null then 0.0 else 2 * (1 - (entry.embedding <=> p_query_embedding)) end) desc,
    entry.source_block_id asc
  limit least(greatest(p_limit, 1), 50)
$$;

revoke all on function retrieve_published_sources(text, vector, integer) from public;
grant execute on function retrieve_published_sources(text, vector, integer) to service_role;

create or replace function current_published_content_version()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
set row_security = off
as $$
  select pointer.content_version
  from published_content_pointer pointer
  join content_versions version on version.id = pointer.content_version
  where pointer.singleton = true and version.status = 'published'
$$;

grant execute on function current_published_content_version() to anon, authenticated;

create or replace function reject_published_version_mutation()
returns trigger
language plpgsql
as $$
declare
  target_version text;
  target_status text;
begin
  target_version := case when tg_table_name = 'content_versions' then old.id else old.content_version end;
  select status into target_status from content_versions where id = target_version;
  if target_status = 'published' then
    raise exception 'Published content version % is immutable', target_version;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists content_versions_immutable on content_versions;
create trigger content_versions_immutable
before update or delete on content_versions
for each row execute function reject_published_version_mutation();

drop trigger if exists published_pages_immutable on published_pages;
create trigger published_pages_immutable
before update or delete on published_pages
for each row execute function reject_published_version_mutation();

drop trigger if exists published_blocks_immutable on published_blocks;
create trigger published_blocks_immutable
before update or delete on published_blocks
for each row execute function reject_published_version_mutation();

drop trigger if exists published_assets_immutable on published_assets;
create trigger published_assets_immutable
before update or delete on published_assets
for each row execute function reject_published_version_mutation();

drop trigger if exists published_search_entries_immutable on published_search_entries;
create trigger published_search_entries_immutable
before update or delete on published_search_entries
for each row execute function reject_published_version_mutation();

alter table content_versions enable row level security;
alter table published_pages enable row level security;
alter table published_blocks enable row level security;
alter table published_assets enable row level security;
alter table published_search_entries enable row level security;
alter table publication_failures enable row level security;
alter table published_content_pointer enable row level security;

drop policy if exists current_version_is_public on content_versions;
create policy current_version_is_public on content_versions
for select using (
  status = 'published'
  and id = current_published_content_version()
);

drop policy if exists current_pages_are_public on published_pages;
create policy current_pages_are_public on published_pages
for select using (
  content_version = current_published_content_version()
);

drop policy if exists current_blocks_are_public on published_blocks;
create policy current_blocks_are_public on published_blocks
for select using (
  content_version = current_published_content_version()
);

drop policy if exists current_assets_are_public on published_assets;
create policy current_assets_are_public on published_assets
for select using (
  content_version = current_published_content_version()
);

drop policy if exists current_search_is_public on published_search_entries;
create policy current_search_is_public on published_search_entries
for select using (
  content_version = current_published_content_version()
);

drop policy if exists current_pointer_is_public on published_content_pointer;
create policy current_pointer_is_public on published_content_pointer
for select using (
  content_version = current_published_content_version()
);
