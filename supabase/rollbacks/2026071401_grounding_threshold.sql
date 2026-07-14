create or replace function public.retrieve_published_sources(
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

revoke all on function public.retrieve_published_sources(text, vector, integer) from public, anon, authenticated;
grant execute on function public.retrieve_published_sources(text, vector, integer) to service_role;

