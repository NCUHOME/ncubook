# 此间 (NCU Book) 数据库架构设计与功能全景说明

本文档全面阐述「此间 (NCU Book)」南昌大学校园 AI 知识库的数据库架构设计、核心数据表模型、RPC 存储过程、业务能力矩阵与运维操作指南。

---

## 1. 核心架构设计原则

本系统采用 **「版本化快照 (Immutable Snapshot) + 单一指针原子切线 (Singleton Pointer Atomic Switching)」** 的云原生知识库架构，彻底告别传统 CMS 边读边写导致的前后端数据不一致与发布半状态问题。

```text
Notion 知识源 ──► [分块暂存 stage_published_chunk] ──► staging 临时版本
                                                              │
                                                              ▼ [校验通过]
客户端 (学生端) ◄── [原子读 pointer] ◄── [commit_published_content_version 瞬时切线]
                                                              │
                                                              ▼
                                              自动裁剪保留最近 6 个发布版本
```

1. **唯一事实源 (Single Source of Truth)**：`supabase/schema.sql` 是生产基线全套 DDL、RLS 行级安全策略、索引与 RPC 存储过程的唯一代码源。
2. **纯版本语义与任务解耦**：`content_versions` 仅记录版本生命周期与状态（`pending`, `staging`, `published`, `failed`）；异步任务排队、互斥锁与详细运行日志独立落库在 `sync_jobs` 与 `sync_job_logs`。
3. **分块暂存 + 短事务切线 (Staging & Fast Switch)**：长达数十秒的 Notion 抓取与图片镜像在暂存态流式入库，最后仅通过一个 <5ms 的极短数据库事务完成指针切换，避免大事务长锁。
4. **版本不可变性 (Snapshot Immutability)**：已发布的文章正文、富文本块与资源元数据受触发器严格保护，禁止就地 `UPDATE` 篡改，确保历史快照的绝对真实性。
5. **6 版本自动生命周期与级联清理**：每次发版成功自动保留最新 6 个历史回滚版本，更早的旧版本及失败记录自动触发外键 `ON DELETE CASCADE` 级联粉碎，数据库体积永久维持在 50MB 级超轻量水平。
6. **SQL 内核级混合检索 (FTS + pg_trgm)**：`published_search_segments` 结合 `tsvector`（全文分词）与 `pg_trgm`（三元组模糊相似度）GIN 索引，在数据库内部完成极速召回，无需外部 Elasticsearch。
7. **分层行级安全 (RLS)**：前端匿名访问只能通过安全视图读取当前指针版本的内容，所有管理与写操作 RPC 全部 Revoke 并仅对 `service_role` 授权。

---

## 2. 数据表模型字典

数据库共设计 12 张核心表，划分为四大业务领域：

### 2.1 知识库与内容快照领域

| 表名 | 职责与设计特点 |
| :--- | :--- |
| **`content_versions`** | **发布版本总表**。记录每次发版的版本号（如 `content-20260818172621525`）、状态、起始/发布/失败时间、校验哈希与发版摘要。 |
| **`published_content_pointer`** | **线上唯一指针表（单例）**。仅允许存在一行（`singleton=true`），存储当前正在线上生效的版本号。学生端所有读取均以该指针为准。 |
| **`published_pages`** | **文章页面快照表**。包含文章标题、slug、物化路由（`route_path`）、物化面包屑树（`tree_path` JSONB，免递归查询）、所属校区与风险等级。 |
| **`published_blocks`** | **文章正文富文本块表**。按文章与序号（`ordinal`）存储 Notion 转换后的标准 Block 树（支持段落、各级标题、折叠列表、表格、代码块等），每个块自带前端精准定位锚点（`anchor: b-xxx`）。 |
| **`published_assets`** | **媒体资源镜像表**。记录文章中的图片与附件在 Supabase Storage（`published_assets` 桶）中的公网 URL、哈希值、尺寸与 alt 文本。 |
| **`published_search_segments`** | **全文搜索与 AI 召回切片表**。物化存储每个文本段落的纯文本，自带 `to_tsvector('simple', ...)` 自动生成列与三元组索引。 |
| **`publication_failures`** | **发版失败审计日志表**。结构化记录抓取、格式转换、图片镜像或索引构建等失败阶段的具体原因与错误堆栈。 |

### 2.2 异步同步与任务调度领域

| 表名 | 职责与设计特点 |
| :--- | :--- |
| **`sync_jobs`** | **Notion 同步任务表**。充当分布式任务互斥锁，记录当前是否有任务正在运行（`running`）、命令类型（`publish`/`rollback`）与任务状态。 |
| **`sync_job_logs`** | **任务实时日志表**。按序号 `seq` 严格保序记录同步过程中的阶段进度与详细日志，供管理后台轮询流式渲染终端。 |

### 2.3 AI 评测与质量基准领域

| 表名 | 职责与设计特点 |
| :--- | :--- |
| **`evaluation_cases`** | **黄金事实基准题库表**。沉淀 36 题真实南大校园问题（校内出行、选课重修、生活服务、医疗边界、防越界防攻击等），包含预期事实、出处要求与风控等级。 |
| **`evaluation_runs`** | **评测历史报告表**。持久化每次运行全量评测的六大指标得分（归因合规率、拒答率、事实符合率、P95延迟等）与详情快照。 |

### 2.4 安全风控与限流领域

| 表名 | 职责与设计特点 |
| :--- | :--- |
| **`rate_limit_buckets`** | **滑动窗口限流桶表**。基于 IP/设备指纹按分钟粒度进行原子递增限流计数，自动清理过期时间窗口，防止 AI 接口被恶意刷量。 |

---

## 3. 核心功能与 RPC 存储过程

数据库内部封装了高内聚的 PL/pgSQL 存储过程，将核心业务逻辑下沉至数据库引擎：

### 3.1 `stage_published_chunk(...)`
- **功能**：分块暂存批量文章、正文块、媒体资源与搜索段落；
- **特性**：仅允许向处于 `pending` 或 `staging` 状态的版本写入数据；支持多次分批提交，避免单次请求报文超限。

### 3.2 `commit_published_content_version(...)`
- **功能**：原子提交并发布新版本；
- **特性**：
  1. 校验版本中是否存在有效文章数据；
  2. 将版本状态更新为 `published`，记录发布时间；
  3. 原子将 `published_content_pointer` 指向该新版本（瞬间生效）；
  4. **自动清理机制**：自动保留最近 6 个已发布版本，超出 6 个的更早历史版本及过渡状态版本自动级联删除。

### 3.3 `rollback_published_content_version(...)`
- **功能**：一键秒级切线回滚；
- **特性**：带乐观锁指针冲突校验（`p_expected_current_version`），核实目标版本必须处于 `published` 状态，原子更新指针完成毫秒级灾备切换。

### 3.4 `reject_published_version_mutation()`
- **功能**：版本不可变与防误删触发器；
- **特性**：
  - 阻断对任何 `status = 'published'` 版本的 `UPDATE` 操作（确保快照只读）；
  - 阻断对当前线上在用版本的 `DELETE` 操作（保护线上站点）；
  - 允许对非当前的历史旧版本进行物理 `DELETE`。

### 3.5 `search_published_segments(...)`
- **功能**：学生端关键词搜索；
- **特性**：仅搜索当前指针版本的切片；结合全文 `ts_rank_cd` 与 `similarity` 综合加权排序，返回高匹配文章段落与锚点。

### 3.6 `match_published_segments(...)`
- **功能**：AI 问答检索增强 (RAG) 粗召回；
- **特性**：根据提问语义在当前线上版本中过滤南大校区（`school = 'ncu'`）内容，按相关性输出候选段落与外部来源链接。

### 3.7 `consume_ask_rate_limit(...)`
- **功能**：分布式分钟级滑动窗口限流；
- **特性**：在单个原子事务中完成计数递增、旧窗口清理与配额返回。

---

## 4. 系统能力矩阵（数据库能做什么）

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        此间数据库核心能力全景                          │
├──────────────────┬──────────────────┬──────────────────────────────────┤
│ 业务场景         │ 核心底层支撑     │ 业务表现与用户体验               │
├──────────────────┼──────────────────┼──────────────────────────────────┤
│ 1. 零停机同步发版│ 暂存表 + 原子指针│ 同步期间网站正常访问，切线无白屏 │
│ 2. 灾备一键回滚  │ 历史版本快照留存 │ 遭遇误删或排版错误，1秒恢复历史  │
│ 3. 历史版本管理  │ 自动留存6版+手删 │ 自动清理多余版本，支持手动双清   │
│ 4. 毫秒全文搜索  │ FTS + trgm GIN   │ 43篇校园指南输入即搜，高亮直达   │
│ 5. 可溯源 AI 问答│ 结构化段落锚点   │ 每个事实观点精准绑定 b-xxx 锚点  │
│ 6. 自动化质量评测│ evaluation_cases │ 36题基准库开箱即跑，监控幻觉红线 │
│ 7. 防刷与恶意攻击│ rate_limit_buckets│ 数据库级滑动窗口防御，拦截高频刷量│
└──────────────────┴──────────────────┴──────────────────────────────────┘
```

---

## 5. 常用运维与管理指南

### 5.1 全新初始化 (Fresh Setup)
在全新的 Supabase 实例上，进入 **SQL Editor** 直接执行 `supabase/schema.sql` 全文。
基线 DDL 具备完全幂等性（包含 `if not exists` / `drop trigger if exists` / `create or replace function`），可安全反复执行。

### 5.2 导入 36 题评测基准种子 (Seed Evals)
初始化数据库后，在项目根目录执行：
```bash
npm run seed:evals
```
脚本会将 `evals/test.json` 中的 36 个基准测试用例同步写入 `evaluation_cases` 表。

### 5.3 同步发版 Notion 内容 (Publish Content)
- **管理后台界面**：登录 `https://book.ncuos.com/admin`，在「内容发布与版本」面板点击 **「▷ 同步 Notion 文章」**；
- **CLI 命令行**：在本地执行 `npm run publish:all`（支持预检模式 `npm run publish:dry`）。

### 5.4 历史版本彻底删除（Database + Storage 双清）
- **自动清理**：每次发版成功时，系统自动保留最新的 6 个版本，更早的旧版本会自动删除；
- **手动删除**：在管理后台「版本历史与恢复」列表中，点击任意历史版本旁的 **「删除此版本」**，系统会调用服务端接口：
  1. 递归删除该版本在 Supabase Storage（`published_assets` 桶）中的物理图片文件；
  2. 删除 `content_versions` 表记录，级联删除所有关联的文章、富文本块与搜索切片。

### 5.5 数据清空与重置 (Clean Reset / Truncate)
若需要重置所有内容数据与任务日志，在 **SQL Editor** 中执行：
```sql
TRUNCATE TABLE 
  published_content_pointer,
  content_versions,
  sync_jobs,
  rate_limit_buckets
CASCADE;
```

---

## 6. 类型契约与防漂移架构门禁

本仓库通过严密的自动化门禁防止代码与数据库结构脱节：

1. **TypeScript 契约**：[`lib/database.types.ts`](file:///c:/chengxu/ncubook/lib/database.types.ts) 严格定义了所有数据表行类型与 RPC 入参返回值；
2. **防漂移门禁测试**：[`tests/lib/database.schema-drift.test.ts`](file:///c:/chengxu/ncubook/tests/lib/database.schema-drift.test.ts) 会在 CI/CD 中自动解析 `supabase/schema.sql` 与 `lib/database.types.ts`，对表名、字段名、类型与 RPC 签名进行双向比对断言，杜绝 Schema 漂移。
