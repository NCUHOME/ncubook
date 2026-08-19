# 核心业务领域与算法库设计说明 (lib/)

本文档全面阐述「此间 (NCU Book)」底层核心业务领域模块、AI 可溯源问答引擎、Notion 远程发布管线、内容读取层与强类型契约。

---

## 1. 核心架构设计原则

`lib/` 承载了全站所有纯业务逻辑、算法实现与外部服务适配，严格遵循领域驱动设计与无状态函数式原则。

```text
外部数据源 (Notion API) ──► lib/publishing (抓取/转换/资源镜像/暂存/切线)
                                       │
                                       ▼ (PostgreSQL 强类型入库)
前端页面渲染 (App Router) ◄── lib/content (SSG 数据提取 / 全文搜索 SDK)
                                       ▲
                                       │ (知识检索粗召回)
学生自然语言提问 ────────────► lib/ai (滑动窗口限流 / 粗召回 / Grounding / 出处归因)
                                       │
                                       ▼
                             第三方大模型 (OpenAI API)
```

1. **确定性与可溯源性**：AI 问答绝不依赖模型自由发散，必须通过“粗召回 ➔ Prompt 注入 ➔ 结构化断言生成 ➔ Grounding 事实证据链校验”四重流水线后才向学生输出；
2. **发布容错与高可用**：Notion 远程发布引擎具备 403/404 外链透明占位图降级、分块暂存（Chunk Staging）与僵尸任务自愈机制，杜绝因单张历史死图阻塞全站发版；
3. **严格的强类型推导**：以 `database.types.ts` 作为数据库操作与业务模型的核心契约，杜绝 `any` 类型绕过检查；
4. **单向无环依赖**：`lib/` 内部各子模块严格单向流动，外部只向 `app/` 和 `src/` 提供干净的接口函数。

---

## 2. 核心模块体系字典

### 2.1 AI 可溯源问答引擎 (`lib/ai/`)

| 模块文件 | 导出方法 / 契约 | 职责与技术实现 |
| :--- | :--- | :--- |
| **`ask.ts`** | `createAskHandler`<br>`createProductionAnswerService`<br>`createMinuteRateLimiter` | **问答总控管线**。串联滑动窗口限流器、知识检索、模型调用、事实归因与短时精确问答 LRU 缓存。 |
| **`retrieve.ts`** | `createSupabaseRetrievalRepository`<br>`retrieveCandidates` | **知识检索与粗召回**。结合提问语义与当前页面上下文，从 Supabase 提取相关段落切片并计算融合排序分。 |
| **`prompt.ts`** | `buildGroundedPrompt` | **Prompt 模板工程**。注入严格的事实归因约束、结构化输出格式契约（Claim + Citation 数组）与主动拒答准则。 |
| **`ground.ts`** | `verifyGroundedAttribution`<br>`extractClaims` | **事实归因与防幻觉校验**。严格核实模型生成的每一个 Claim 是否均有召回切片支持，剔除无依据断言与虚构内容。 |
| **`policy.ts`** | `evaluateRiskPolicy`<br>`isRefusalRequired` | **安全与风控策略**。拦截医疗处方、系统 Prompt 探针注入与越界提问，触发主动免责拒答。 |
| **`provider.ts`** | `createOpenAICompatibleProvider` | **大模型客户端适配器**。适配 DeepSeek / OpenAI 标准接口，支持超时中断与降级。 |
| **`eval.ts`** | `runEvaluationSuite`<br>`calculateMetrics` | **质量评测计算引擎**。基于 `evals/test.json` 自动化评测 6 大核心指标，输出标准报告。 |
| **`session.ts`** | `validateAnswerSession`<br>`type AnswerSession` | **会话契约定义**。定义单次问答的数据结构与 Zod / 运行时类型校验。 |

### 2.2 Notion 发布与同步引擎 (`lib/publishing/`)

| 模块文件 | 导出方法 / 契约 | 职责与技术实现 |
| :--- | :--- | :--- |
| **`pipeline.ts`** | `runNotionPublicationCommand` | **发布主调度管线**。编排 5 阶段生命周期（扫描目录 ➔ 读取页面 ➔ 格式校验 ➔ 资源镜像与分块暂存 ➔ 原子切线）。 |
| **`client.ts`** | `createNotionClient`<br>`batchMap` | **Notion API 客户端**。封装并发受控（Concurrency=3）与网络重试的 Block 树递归读取。 |
| **`blocks.ts`** | `normalizeNotionBlocks` | **富文本块标准化**。将 Notion 复杂的嵌套 Block 转换为纯净 Block 树，赋予稳定锚点 `b-xxx`。 |
| **`page.ts`** | `normalizeNotionPage` | **页面元数据转换**。计算物化路由 `routePath` 与页面树层级路径 `treePath`。 |
| **`assets.ts`** | `mirrorNotionAssets`<br>`downloadAsset` | **媒体资源镜像存储**。将 Notion 图片转存至 Supabase Storage，对 403/404 失效外链提供透明 PNG 占位图秒级降级。 |
| **`store.ts`** | `createSupabasePublicationStore` | **数据库发布持久化**。调用 `stage_published_chunk` 与 `commit_published_content_version` 存储过程。 |
| **`version.ts`** | `publishVersion`<br>`rollbackPublishedVersion` | **版本切线与回滚**。执行前置校验、版本提交、指针切换与 CDN 缓存即时刷新。 |
| **`job-store.ts`** | `createPersistentJob`<br>`findActiveRunningJob` | **任务状态与分布式锁**。管理 `sync_jobs` 互斥锁与流式保序日志，支持超时自愈与手动解锁。 |
| **`auth.ts`** | `authenticateAdminRequest`<br>`verifyAdminSessionToken` | **管理后台鉴权中间件**。校验 Cookie 会话签名与 Bearer Token。 |

### 2.3 内容读取与渲染层 (`lib/content/`)

| 模块文件 | 导出方法 / 契约 | 职责与技术实现 |
| :--- | :--- | :--- |
| **`server.ts`** | `fetchPageBySlug`<br>`fetchContentVersionsFromSupabase` | **服务端取数接口**。供 Next.js 页面在编译期（Build）或 ISR 运行时高效按需提取文章正文与版本。 |
| **`search.ts`** | `searchPublishedContent` | **客户端检索 SDK**。封装 `/api/search` 调用与防抖搜索请求。 |
| **`schema.ts`** | `validatePublishedPage`<br>`validatePublishedBlock` | **内容契约校验**。确保从数据库拉取的数据符合前端组件渲染规范。 |
| **`fixture.ts`** | `FIXTURE_PAGES`<br>`FIXTURE_BLOCKS` | **离线测试数据源**。在无网络或未配置 Supabase 的开发环境下提供确定性保底数据。 |

---

## 3. 系统能力矩阵（领域层能做什么）

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        领域层核心能力全景                              │
├──────────────────┬──────────────────┬──────────────────────────────────┤
│ 业务场景         │ 核心底层实现     │ 业务表现与用户体验               │
├──────────────────┼──────────────────┼──────────────────────────────────┤
│ 1. 极致防幻觉问答│ Grounding 校验器 │ 杜绝 AI 凭空编造，事实必须有出处 │
│ 2. 知识库极速同步│ Assets 镜像降级  │ 30~45秒完成43篇全量发布入库      │
│ 3. 毫秒级灾备回滚│ 乐观锁指针切换   │ 1秒恢复至任意指定历史版本        │
│ 4. 离线开发与测试│ Fixture 数据底座 │ 无需联网即可跑通全套 UI 与问答   │
│ 5. 分布式防刷保护│ IP 哈希滑动窗口  │ 自动隔离高频恶意请求，保护算力   │
│ 6. 自动化质量评测│ Eval 6大指标引擎 │ 36题黄金事实集量化回归评估       │
└──────────────────┴──────────────────┴──────────────────────────────────┘
```

---

## 4. 开发调试与操作指南

### 4.1 运行领域单测
```bash
# 运行 AI 问答引擎测试
npx vitest run tests/lib/ai/

# 运行 Notion 发布引擎测试
npx vitest run tests/lib/publishing/

# 运行内容模型与检索测试
npx vitest run tests/lib/content/
```

### 4.2 本地运行命令行发布
```bash
# 本地直接发起全量发布（直连真实 Notion 与 Supabase）
npm run publish:all

# 预检模式（仅转换格式与校验，不写库）
npm run publish:dry
```

---

## 5. 类型契约与防漂移架构门禁

[`lib/database.types.ts`](file:///c:/chengxu/ncubook/lib/database.types.ts) 是全库类型系统事实标准。
CI 门禁测试 `tests/lib/database.schema-drift.test.ts` 会自动解析并双向断言它与 `supabase/schema.sql`，杜绝任何字段与签名漂移。
