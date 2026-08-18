# 此间 (NCU Book) 数据库模式与迁移说明

## 1. 架构原则

- **唯一事实源**：`supabase/schema.sql` 包含生产基线全套 DDL、RLS 行级安全策略与 RPC 存储过程；
- **纯版本语义**：`content_versions` 仅记录版本生命周期与状态（`pending`, `staging`, `published`, `failed`）；任务互斥与日志独立落库在 `sync_jobs` / `sync_job_logs`；
- **分块暂存 + 短事务切线**：长发布流程通过 `stage_published_chunk` 分块暂存，发布完成时通过 `commit_published_content_version` 瞬时切线，大幅降低行锁持有时间；
- **自动留存 6 版本**：每次成功发布自动保留最近 6 个发布版本，超出 6 个的更早历史版本及失败记录自动级联清理，杜绝数据库空间膨胀；
- **全文检索 SQL 化**：`published_search_segments` 结合 `tsvector`（简单分词全文检索）与 `pg_trgm`（三元组模糊匹配），替代 Node 内存线性扫描。

---

## 2. 常用运维与重置流程

### 2.1 全新初始化 (Fresh Setup)
在全新的 Supabase 实例上，进入 **SQL Editor** 直接执行 `supabase/schema.sql` 全文。
基线 DDL 具备完全幂等性（包含 `if not exists` / `drop trigger if exists` / `create or replace function`），可安全重放。

### 2.2 清空重置历史数据 (Clean Reset / Truncate)
若需要清理历史失败记录或从零开始，在 **SQL Editor** 中执行：
```sql
-- 级联清空所有文章版本、快照数据与历史日志（保留表结构与函数）
TRUNCATE TABLE 
  published_content_pointer,
  content_versions,
  sync_jobs,
  rate_limit_buckets
CASCADE;
```

### 2.3 导入评测题库种子 (Seed Evals)
清库或初始化后，在本地终端执行：
```bash
npm run seed:evals
```

### 2.4 同步发版 Notion 内容 (Publish Content)
- **方式一（Web 界面）**：访问 `https://book.ncuos.com/admin` 点击 **「▷ 一键同步 Notion 文章」**；
- **方式二（本地/CI 直连）**：执行 `npm run publish:all`。

---

## 3. 类型契约与防漂移门禁

本项目维护 `lib/database.types.ts` 作为应用层 TypeScript 类型契约。
CI 门禁测试 `tests/lib/database.schema-drift.test.ts` 会自动解析 `schema.sql` 与 `database.types.ts` 的表名、字段名及 RPC 函数签名并进行双向断言，防止类型漂移。

