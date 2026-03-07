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
