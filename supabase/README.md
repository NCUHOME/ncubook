# 此间 (NCU Book) 数据库模式与迁移说明

## 1. 架构原则

- **唯一事实源**：`supabase/schema.sql` 包含生产基线全套 DDL、RLS 行级安全策略与 RPC 存储过程；
- **纯版本语义**：`content_versions` 仅记录版本生命周期与状态（`pending`, `staging`, `published`, `failed`）；任务互斥与日志独立落库在 `sync_jobs` / `sync_job_logs`；
- **分块暂存 + 短事务切线**：长发布流程通过 `stage_published_chunk` 分块暂存，发布完成时通过 `commit_published_content_version` 瞬时切线，大幅降低行锁持有时间；
- **全文检索 SQL 化**：`published_search_segments` 结合 `tsvector`（简单分词全文检索）与 `pg_trgm`（三元组模糊匹配），替代 Node 内存线性扫描。

---

## 2. 初始化与重建库流程

在全新的 Supabase 实例或重置数据库时，使用 `postgres` 或 `service_role` 权限在 SQL Editor 中执行：

```bash
# 执行基线 DDL
supabase/schema.sql
```

基线 DDL 具备完全幂等性（包含 `if not exists` / `drop trigger if exists` / `create or replace function`），可安全重放。

---

## 3. 可选扩展：向量检索 (Optional Embedding)

基线模式默认**不加载** `pgvector` 扩展与 HNSW 索引，以节省写入成本与云端资源。

如需启用向量粗召回能力，请执行：

```bash
supabase/migrations/optional-embedding.sql
```

---

## 4. 类型契约与防漂移门禁

本项目维护 `lib/database.types.ts` 作为应用层 TypeScript 类型契约。
CI 门禁测试 `tests/lib/database.schema-drift.test.ts` 会自动解析 `schema.sql` 与 `database.types.ts` 的表名、字段名及 RPC 函数签名并进行双向断言，防止类型漂移。
