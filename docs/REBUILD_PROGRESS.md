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
