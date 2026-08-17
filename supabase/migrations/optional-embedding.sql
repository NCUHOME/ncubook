-- ============================================================================
-- 此间 (NCU Book) - 可选向量召回扩展迁移
-- 注意：基线库默认不加载 vector 扩展与 embedding 索引；
-- 仅当生产环境明确配置向量模型并决定启用混合召回时执行本文件。
-- ============================================================================

create extension if not exists vector;

alter table published_search_segments
  add column if not exists embedding vector(1536);

create index if not exists segments_embedding_idx
  on published_search_segments using hnsw (embedding vector_cosine_ops);
