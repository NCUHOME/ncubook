create extension if not exists pgcrypto;

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

create index if not exists published_pages_parent_idx
  on published_pages (content_version, parent_source_page_id);
create index if not exists published_blocks_page_order_idx
  on published_blocks (content_version, source_page_id, ordinal);
create index if not exists published_search_entries_vector_idx
  on published_search_entries using gin (search_vector);

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
