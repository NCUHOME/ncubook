# 此间（NCU Book）重建进度追踪表

## 里程碑 M1 执行记录 (2026-08-14)

### 1. 本次完成的里程碑与逻辑单元
- **里程碑**: M1 — 脚手架与样式底座
- **逻辑单元**:
  - `rebuild/v2` 分支初始化与 `.gitignore` 配置
  - 拷贝与修正工程配置文件（`package.json` / `tsconfig.json` / `vitest.config.ts` / `next.config.ts` / `postcss.config.mjs` / `.github/workflows/deploy.yml` / `.env.example`）
  - 安装全部生产与开发依赖（`npm install` 186 个包通过）
  - 重建全局样式底座 `app/globals.css`（定义设计令牌原生变量与 `@theme inline` / `@utility` 映射，包含 `accent`/`alert`/`pill`/`subtle` 4 条新增别名）
  - 实现基础组件原语 `Skeleton` (`src/components/primitives/skeleton.tsx`) 与 `StatusPage` (`src/components/primitives/status-page.tsx`)
  - 重建根布局 `app/layout.tsx` 及全局 Client Wrapper `app/providers.tsx`
  - 重建 4 个路由 Streaming 骨架屏组件 (`app/loading.tsx`, `app/search/loading.tsx`, `app/sections/[slug]/loading.tsx`, `app/docs/[slug]/loading.tsx`)
  - 重建 2 个路由错误/404 捕获边界 (`app/error.tsx`, `app/not-found.tsx`) 与 1 个根级崩塌边界 (`app/global-error.tsx`)
  - 拷贝 SVG 静态资源 (`public/images/campus-map.svg`) 与测试 setup (`tests/setup.ts`)
  - 搭建 M1 首页骨架 `app/page.tsx`

### 2. 修改 / 新建文件清单
- `[NEW] .gitignore`
- `[NEW] package.json`
- `[NEW] tsconfig.json`
- `[NEW] vitest.config.ts`
- `[NEW] next.config.ts`
- `[NEW] postcss.config.mjs`
- `[NEW] .github/workflows/deploy.yml`
- `[NEW] .env.example`
- `[NEW] public/images/campus-map.svg`
- `[NEW] tests/setup.ts`
- `[NEW] app/globals.css`
- `[NEW] app/layout.tsx`
- `[NEW] app/providers.tsx`
- `[NEW] app/page.tsx`
- `[NEW] src/components/primitives/skeleton.tsx`
- `[NEW] src/components/primitives/status-page.tsx`
- `[NEW] app/loading.tsx`
- `[NEW] app/search/loading.tsx`
- `[NEW] app/sections/[slug]/loading.tsx`
- `[NEW] app/docs/[slug]/loading.tsx`
- `[NEW] app/error.tsx`
- `[NEW] app/not-found.tsx`
- `[NEW] app/global-error.tsx`
- `[NEW] docs/REBUILD_PROGRESS.md`

### 3. 运行的验证指令及结果
- `npm run typecheck`: **PASS** (Zero errors)
- `npm run build`: **PASS** (Compiled successfully, static pages generated, First Load JS ~103 kB)
- `npm test`: **SKIPPED** (M1 阶段单元测试未迁入，按方案五 M1 验证规定跳过)

### 4. ⚠️ 待确认事项的实际处理
- **A-1** (飞书链路删除 X3): 已移除 `.env.example` 中的飞书环境变量配置范本。
- **A-2** (shadow 模式删除 X5): 已将 `.env.example` 中的 `AI_ANSWER_MODE` 注释简化为 `fixture | production`。
- **A-3** (审计 CLI 与 smoke 评测套删除 X7/X8): 已在 `package.json` 中移除 `smoke` / `compare` / `check` 等未覆盖脚本，仅保留 `publish` / `eval`。
- **A-5** (失效样式类别名映射): 已在 `app/globals.css` 集中实现 `accent`/`alert`/`pill`/`subtle` 映射，未修改 `tokens.json`。

### 5. 遗留问题与下一个里程碑入口
- **遗留问题**: 无
- **下一个里程碑入口**: **里程碑 M2 — 数据层与 AI 引擎**
  - 重建 `lib/content/` (完成 S5-S8 合并与 X4 死代码删除)
  - 重建 `lib/ai/` (完成 S6 route+service 合并与 X5/X8/X9 清理)
  - 重建 `lib/publishing/` (11 个模块原样平移)
  - 重建 `scripts/{publish,test}.ts` 与 `evals/test.json`
  - 迁移幸存模块单元测试 `tests/lib/**`

---

## 里程碑 M2 执行记录 (2026-08-14)

### 1. 本次完成的里程碑与逻辑单元
- **里程碑**: M2 — 数据层与 AI 引擎
- **逻辑单元**:
  - `lib/integrations/`: `server-only.ts` (`assertServerOnly` 隔断)、`supabase.ts` (S8 单例缓存)
  - `lib/database.types.ts`: Supabase Schema 数据库 TS 类型定义
  - `lib/content/`: `schema.ts` (S7 `anchorFromSourceId` 单点导出)、`fixture.ts` (S5 合并 `fixtures.ts` + `fixture-repo.ts`)、`server.ts` (S5 合并 `factory`/`supabase`/`supabase-repo`/`repository`)、`search.ts`
  - `lib/ai/`: `session.ts` (数据契约与反序列化校验)、`ask.ts` (S6 合并 `route` + `service`，X5 移除 shadow 模式)、`retrieve.ts` (混合检索)、`ground.ts` (事实归因)、`policy.ts` (敏感词保护)、`prompt.ts`、`provider.ts`
  - `lib/publishing/`: 重建全套 11 个模块 (`client.ts`, `blocks.ts`, `page.ts`, `assets.ts`, `index.ts`, `version.ts`, `store.ts`, `route.ts`, `pipeline.ts`, `job-store.ts`, `auth.ts`)，更新 `anchorFromSourceId` 统一向 `schema.ts` 导入
  - `supabase/`: 包含完整 `supabase/schema.sql` SQL 契约文件（7 张核心表、索引、RLS 策略与事务 RPC）
  - `scripts/`: `publish.ts` (CLI 发版工具)、`test.ts` (X9 合并 `eval.ts` AI 评测脚本)
  - `evals/`: `test.json` (防幻觉评测用例集)
  - `tests/lib/`: 迁移全套 18 个幸存单元测试文件（86 个测试用例，覆盖 content, ai, publishing 领域 logic）

### 2. 修改 / 新建文件清单
- `[NEW] lib/integrations/server-only.ts`
- `[NEW] lib/integrations/supabase.ts`
- `[NEW] lib/database.types.ts`
- `[NEW] lib/content/schema.ts`
- `[NEW] lib/content/fixture.ts`
- `[NEW] lib/content/server.ts`
- `[NEW] lib/content/search.ts`
- `[NEW] lib/ai/session.ts`
- `[NEW] lib/ai/ask.ts`
- `[NEW] lib/ai/retrieve.ts`
- `[NEW] lib/ai/ground.ts`
- `[NEW] lib/ai/policy.ts`
- `[NEW] lib/ai/prompt.ts`
- `[NEW] lib/ai/provider.ts`
- `[NEW] lib/publishing/*.ts` (11 个模块)
- `[NEW] supabase/schema.sql`
- `[NEW] scripts/publish.ts`
- `[NEW] scripts/test.ts`
- `[NEW] evals/test.json`
- `[NEW] tests/lib/**/*.test.ts` (18 个单测文件)
- `[DELETE] legacy code` 中已被清理的废弃模块 (X3 飞书, X4 废弃 content 门面, X5 shadow 模式, X8/X9 smoke/eval 旧文件)

### 3. 运行的验证指令及结果
- `npm run typecheck`: **PASS** (Zero TS errors)
- `npm test`: **PASS** (18 test files, 86 tests passed in 2.45s)
- `npm run build`: **PASS** (Compiled successfully, static pages generated, First Load JS ~103 kB)

### 4. ⚠️ 待确认事项的实际处理
- **X3** (飞书清理): 彻底移除 `lib/integrations/lark.ts`, `lark-mapper.ts`, `upsert-cards.ts` 等死代码。
- **X4** (废弃 content 门面): 清理 `repo.ts`, `sample-cards.ts`, `topics.ts` 等二次维护摘要，统一使用 `schema.ts`, `fixture.ts`, `server.ts` 3 清洁文件。
- **X5** (shadow 模式移除): `AnswerMode` 仅保留 `fixture` 与 `production`。
- **S7** (`anchorFromSourceId` 巩固): 统一在 `lib/content/schema.ts` 导出，`lib/publishing` 中其它模块均更新向其导入。
- **S8** (Supabase 单利化): `getSupabaseAdmin()` 在 `lib/integrations/supabase.ts` 实现模块级内存单例缓存。

### 5. 遗留问题与下一个里程碑入口
- **遗留问题**: 无
- **下一个里程碑入口**: **里程碑 M4 — 管理后台、API 与性能收尾**
  - 重建 `app/admin/**` 管理后台 (同步面板、版本时间线、登出)
  - 全仓性能指标测量 (B1-B8) 与 Lighthouse 审计

---

## 里程碑 M3 执行记录 (2026-08-14)

### 1. 本次完成的里程碑与逻辑单元
- **里程碑**: M3 — 公开页面与组件 (全局搜索与文档阅读器 UI 组装)
- **逻辑单元**:
  - `src/components/primitives/`: `header.tsx` (`AppHeader` 整合 `next/dynamic` 抽屉懒加载)、`drawer.tsx` (`PageTreeDrawer` 左侧树状抽屉)
  - `src/components/ask/`: S4 合并 `provider.tsx` (`AskProvider` + `useAsk`)、`sheet.tsx` (`AskSheet` S10 动态加载)、`button.tsx` (`FloatingAskButton` 浮动 FAB)、`entry.tsx` (`DocumentAskEntry` IntersectionObserver 锚点追踪)、`form.tsx` (`QuestionForm` 提问表单)
  - `src/components/search/`: `box.tsx` (`SearchExperience` 客户端 5ms 零延迟打字即搜 + 预拉索引 + API 降级)、`item.tsx` (`SearchResultItem` `<mark>` 关键词高亮与锚点链接)
  - `src/components/article/`: `renderer.tsx` (`ArticleRenderer` 主块树分发) 及 `blocks/` 11 个原子块渲染组件 (`richtext`, `callout`, `columns`, `divider`, `embed`, `file`, `image`, `link`, `list`, `quote`, `table`)
  - `app/api/`: `/api/ask/route.ts`, `/api/search/route.ts`, `/api/search/index/route.ts` 核心公开 API 路由
  - `app/`: 重建 4 个公开页面路由 `app/page.tsx`, `app/search/page.tsx`, `app/sections/[slug]/page.tsx`, `app/docs/[slug]/page.tsx`
  - `app/providers.tsx`: 全局挂载 `AskProvider` 并注入页面路由解析逻辑
  - `tests/`: 迁移全套 UI 组件、页面与集成测试 (`tests/components/**`, `tests/pages/**`, `tests/integration/citation.test.ts`)，共 27 个测试文件、104 个测试用例全绿通过

### 2. 修改 / 新建文件清单
- `[NEW] src/components/primitives/header.tsx`
- `[NEW] src/components/primitives/drawer.tsx`
- `[NEW] src/components/ask/provider.tsx`
- `[NEW] src/components/ask/sheet.tsx`
- `[NEW] src/components/ask/button.tsx`
- `[NEW] src/components/ask/entry.tsx`
- `[NEW] src/components/ask/form.tsx`
- `[NEW] src/components/search/box.tsx`
- `[NEW] src/components/search/item.tsx`
- `[NEW] src/components/article/renderer.tsx`
- `[NEW] src/components/article/blocks/*.tsx` (11 个块组件)
- `[NEW] app/api/ask/route.ts`
- `[NEW] app/api/search/route.ts`
- `[NEW] app/api/search/index/route.ts`
- `[NEW] app/search/page.tsx`
- `[NEW] app/sections/[slug]/page.tsx`
- `[NEW] app/docs/[slug]/page.tsx`
- `[MODIFY] app/page.tsx`
- `[MODIFY] app/providers.tsx`
- `[NEW] tests/components/**/*.tsx` (5 个组件测试文件)
- `[NEW] tests/pages/**/*.tsx` (3 个页面测试文件)
- `[NEW] tests/integration/citation.test.ts`

### 3. 运行的验证指令及结果
- `npm run typecheck`: **PASS** (Zero TS errors)
- `npm test`: **PASS** (27 test files, 104 tests passed in 3.04s)
- `npm run build`: **PASS** (Compiled successfully, static pages generated: 13/13 prerendered, First Load JS ~103 - 114 kB, revalidate=3600)

### 4. ⚠️ 待确认事项的实际处理
- **S4** (AskProvider + useAsk 合并): 统一定义在 `src/components/ask/provider.tsx` 中，避免孤立 hook。
- **S10** (AskSheet 懒加载): 在 `AskProvider` 中保持 `next/dynamic` 配合 `ssr: false` 打包隔断。
- **S11** (PageTreeDrawer 懒加载): 在 `AppHeader` 中对 `PageTreeDrawer` 使用 `next/dynamic` 按需加载。
- **图片 CLS 声明**: `ImageBlock` 采用 `h-auto w-full` 与原生 `loading="lazy"` / `decoding="async"` 控制。

### 5. 遗留问题与下一个里程碑入口
- **遗留问题**: 无
- **下一个里程碑入口**: **里程碑 M4 — 管理后台、API 与性能收尾**
  - 重建 `app/admin/**` 管理后台与认证 / 登出逻辑
  - 跑 B1–B8 全项性能预算与 Lighthouse 测量


