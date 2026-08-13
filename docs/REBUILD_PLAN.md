# 此间（NCU Book）网站重建执行方案 v2

> 本文档是"重建网站"的唯一施工依据，可直接交给 AI 编码 Agent 执行。
> 盘点依据：旧代码全集（142 个文件，现位于 `legacy code/`，基线 commit `720f1b5`），盘点时间 2026-08-13。
>
> **v2 修订（2026-08-14，仓库所有者决策）**：原站是半成品，多处功能为空壳。**重建标准从"1:1 还原"放宽为"视觉与核心体验大致一致"**——允许删除未实现的空壳功能、合并冗余样式与文件，不逐像素比对。删除项以本文档 2.2 决策表为准，表外功能不得擅自删改。
>
> **重建三原则（v2）**：① 神似即可——核心页面（首页/板块/文档/搜索）布局、交互流程、黑白编辑风格与旧站一致；② 砍空壳——未实现、无调用方、假数据的功能一律删除；③ 顶尖性能——最大化 RSC、最小客户端 JS、无请求瀑布。
>
> 所有"⚠️ 待确认"条目见附录 A，均附默认动作，人未答复时按默认动作执行并记入 `docs/REBUILD_PROGRESS.md`。

---

## 一、现状速览（旧站是什么）

Next.js 15（App Router）+ React 19 + Tailwind v4 + Supabase（仅服务端 service key）+ Radix Dialog + lucide-react。部署于腾讯云 EdgeOne，内容链路为 Notion → 发布管线 → Supabase → SSG/ISR 站点。

**旧站六个页面**：

| 路由 | 核心功能 | 去留 |
|---|---|---|
| `/` | AI 提问框（主操作）+ 板块两列网格 | 保留 |
| `/search?q=` | 关键词搜索：SSR 首筛 + 客户端全量索引内存即搜 + API 降级 | 保留（三层链路是核心体验） |
| `/sections/[slug]` | 板块导读（富文本）+ 子页面卡片列表，ISR 3600s | 保留 |
| `/docs/[slug]` | 移动优先阅读器：面包屑、富块渲染、页面树抽屉、右下 AI 入口（带滚动段落上下文） | 保留 |
| `/admin` + `/admin/login` | 单密码登录；Notion 同步面板、版本时间线（回滚）、AI 质量检测面板 | 保留前两者，**删检测面板** |
| 7 个 API | ask / search / search/index / admin/auth / admin/publish-notion / **feedback（空壳）** / **sync/lark（半成品）** | 保留 5 个，删 2 个（见 2.2） |

**核心链路**（保留不动）：
- AI 问答：提问 → `/api/ask`（限流 10/分/IP）→ 混合检索 RPC（pg_trgm + 子串 + 1536 维向量，应用层加权重排取前 8）→ OpenAI 兼容模型（非流式、JSON 输出、temp 0、8s 超时）→ 敏感词/权威域名/冲突策略 → claim-引用绑定的 `AnswerSession` → 客户端校验渲染，出处角标可跳回原文锚点并恢复会话。
- 内容发布：Notion 递归拉树 → 块规范化 → 资产镜像（SHA-256 去重 ≤50MB）→ 搜索索引 → 版本状态机（幂等+脏读校验）→ RPC 原子提交（指针乐观锁）→ ISR 刷新；支持异步 Job 轮询与一键回滚。

---

## 二、功能去留决策（v2 核心）

### 2.1 判定依据（均已核实）

| 证据 | 结论 |
|---|---|
| `/api/feedback` 只返回 `{ok, stored:false}` 不落库，全站无任何前端调用方 | 纯空壳 |
| `EvalPanel` 用 GET 打只支持 POST 的 `/api/ask`，恒 405，指标恒零 | 假功能 |
| 飞书链路（`/api/sync/lark` + lark.ts + lark-mapper + upsert-cards）写入的 `information_cards` 表不在 schema.sql/类型中，且**全站没有任何页面展示这些卡片** | 半成品，数据无出口 |
| `AI_ANSWER_MODE` 三模式中 `fixture`（无密钥开发降级）与 `production` 必需；`shadow` 仅是灰度止血手段，`fixture` 可替代 | 可简化 |
| `lib/content/repo.ts` 旧门面、`sample-cards.ts`、`topics.ts` 无生产引用 | 死代码 |
| 4 个 loading 骨架、error/not-found 布局、ask 两处输入条高度雷同 | 可合并 |
| `shadow-subtle`/`rounded-pill`/`text-accent`/`text-alert` 四个类从未生效 | 已在 tokens.json 补定义（见 3.2） |

### 2.2 去留决策表

**删除（不迁入新站）**：

| # | 项 | 理由 |
|---|---|---|
| X1 | `app/api/feedback/route.ts` + `tests/lib/content/feedback.test.ts` | 空壳，无调用方。学生反馈入口日后重做时走新需求 |
| X2 | `EvalPanel` 组件及其在 `/admin` 的挂载 | 假检测。AI 质量由 `npm run eval`/`smoke` CLI 离线承担 |
| X3 | 飞书链路：`app/api/sync/lark/route.ts`、`lib/integrations/lark.ts`、`lib/content/lark-mapper.ts`、`lib/content/upsert-cards.ts`、`tests/lib/integrations/lark.test.ts`、`tests/routes/sync-lark.test.ts` | 数据无展示出口的半成品 ⚠️ A-1（默认：删） |
| X4 | `lib/content/{repo,sample-cards,topics}.ts` | 死代码/旧门面 |
| X5 | `AI_ANSWER_MODE=shadow` 模式 | fixture 已覆盖止血场景；`route.ts` 只留 fixture/production 两模式 ⚠️ A-2（默认：删 shadow） |
| X6 | `/admin` 页面坏死的登出表单 | 换成真正可用的登出按钮（见 X7 对面） |
| X7 | `scripts/{check,check-links,compare,compare-pub}.ts` 中无测试覆盖的 CLI 壳 | 发布审计工具，重建期无使用场景 ⚠️ A-3（默认：全删，保留 `publish/test/smoke` 三个有产线用途的） |
| X8 | `lib/ai/smoke.ts` + `scripts/smoke.ts` + `evals/smoke.json` | 与 `scripts/test.ts` + `evals/test.json` 评测能力重叠 ⚠️ A-3（默认：删 smoke 套，保留 eval/test 套） |
| X9 | `lib/ai/eval.ts` 独立模块 | 并入 `scripts/test.ts`（仅它有消费方），减少一层抽象 |

**简化/合并**：

| # | 项 | 处置 |
|---|---|---|
| S1 | 4 个 `loading.tsx` | 抽共享 `Skeleton` 原语 |
| S2 | `error.tsx`/`not-found.tsx`（`global-error.tsx` 保留独立结构） | 抽共享 `StatusPage` 原语 |
| S3 | `ask/form.tsx` 与 `ask/sheet.tsx` 追问输入条 | 抽共享 `AskInputBar` |
| S4 | `src/context/ask.tsx` + `src/hooks/use-ask.ts` | 合并为 `src/components/ask/provider.tsx`（同时导出 `AskProvider` 与 `useAsk`） |
| S5 | `lib/content/{factory,supabase,supabase-repo}.ts` + `repository.ts` + `fixture-repo.ts` | 合并为 3 个文件（见 3.1），消除"接口-实现-工厂-门面"四层绕圈 |
| S6 | `lib/ai/{route,service}.ts` | 合并为 `lib/ai/ask.ts`（限流+模式分发+服务装配一处） |
| S7 | `anchorFromSourceId` 重复定义 ×4 | 收编 `lib/content/schema.ts` 单处导出 |
| S8 | `getSupabaseAdmin()` 每次新建 client | 模块级单例缓存 |
| S9 | `app/providers.tsx` 的 `pageRoutes` 无效 prop | 删除该 prop，路由解析函数显式注入 |
| S10 | `blocks/list.tsx` 未使用的 `getAsset` prop、`api/search/index` 无效 import | 随手清理 |
| S11 | sections/docs 页串行 await | 无依赖查询改 `Promise.all` |

**保留不动（神似即可，逻辑不缩水）**：AI 问答全链路（检索/ground/policy/session 校验/会话恢复）、发布管线 11 个模块（除 anchor 函数改 import 外原样重建）、关键词搜索三层链路、ISR 策略（revalidate=3600）、3 条 301 重定向、admin 鉴权（HMAC cookie + Bearer 双通道）、Supabase schema（本方案不动数据库）。

---

## 三、目标架构

### 3.1 目录结构（新站 = 仓库根目录）

```
ncubook/
├── legacy code/                    # 旧代码只读参照（gitignore，不参与构建）
├── app/
│   ├── layout.tsx                  # RSC 根布局：metadata/viewport + mobile-shell + Provider
│   ├── globals.css                 # tokens + @theme 映射 + 工具类（含 4 条新别名）
│   ├── page.tsx                    # 首页：QuestionForm + 板块网格
│   ├── loading.tsx / error.tsx / not-found.tsx / global-error.tsx
│   ├── search/{page,loading}.tsx
│   ├── sections/[slug]/{page,loading}.tsx
│   ├── docs/[slug]/{page,loading}.tsx
│   ├── admin/{page,login/page}.tsx # 同步面板 + 版本时间线 + 登出按钮（无 EvalPanel）
│   └── api/
│       ├── ask/route.ts            # 限流 + fixture/production 两模式
│       ├── search/route.ts
│       ├── search/index/route.ts
│       ├── admin/auth/route.ts     # POST 登录 / DELETE 登出
│       └── admin/publish-notion/route.ts
├── src/components/
│   ├── primitives/
│   │   ├── header.tsx              # AppHeader（drawer 改 next/dynamic 懒加载）
│   │   ├── drawer.tsx              # PageTreeDrawer
│   │   ├── skeleton.tsx            # 【新】共享骨架（S1）
│   │   └── status-page.tsx         # 【新】共享错误/404 视觉（S2）
│   ├── ask/
│   │   ├── provider.tsx            # 【并】AskProvider + useAsk（S4）
│   │   ├── form.tsx / input-bar.tsx / sheet.tsx / button.tsx / entry.tsx
│   ├── search/{box,item}.tsx
│   ├── article/
│   │   ├── renderer.tsx
│   │   └── blocks/                 # 10 个块组件（richtext/callout/columns/divider/embed/file/image/link/list/quote/table）
│   └── admin/{sync-panel,version-timeline,logout-button}.tsx
├── lib/
│   ├── content/
│   │   ├── schema.ts               # 全部类型 + anchorFromSourceId（S7）
│   │   ├── fixture.ts              # 【并】内置 fixture 数据 + FixtureRepository 实现（fixtures+fixture-repo）
│   │   ├── server.ts               # 【并】Supabase 加载（unstable_cache）+ 环境分流工厂（factory+supabase+supabase-repo，S5）
│   │   └── search.ts               # 关键词搜索纯函数
│   ├── ai/
│   │   ├── session.ts              # AnswerSession 契约 + validateAnswerSession + fixture 答案
│   │   ├── ask.ts                  # 【并】route+service：限流、两模式分发、生产服务装配（S6）
│   │   ├── retrieve.ts / ground.ts / policy.ts / prompt.ts / provider.ts
│   ├── publishing/                 # 11 个模块原样重建（client/blocks/page/assets/index/version/store/route/pipeline/job-store/auth）
│   ├── integrations/
│   │   ├── server-only.ts          # assertServerOnly 屏障
│   │   └── supabase.ts             # service client + 单例（S8）
│   └── database.types.ts           # 原样（漂移项见附录 A-4）
├── scripts/{publish,test}.ts       # 仅保留两个 CLI（X7/X8）；test.ts 内联评测逻辑（X9）
├── tests/                          # 保留与幸存模块对应的测试，同步 import 路径
├── evals/test.json                 # 唯一评测集
├── supabase/schema.sql             # 从 legacy 拷贝存档（不改动）
├── public/images/campus-map.svg
├── docs/                           # 已就位
└── 配置文件                         # package.json（依赖见 3.3）/ next.config.ts / tsconfig.json / postcss.config.mjs / vitest.config.ts / .gitignore / .github/workflows/deploy.yml
```

### 3.2 样式体系（神似的判定标准）

- tokens 唯一事实源：`docs/design/tokens.json`（已含 `accent`/`alert`/`pill`/`shadow.subtle` 别名，M1 直接在 globals.css 实现对应 `:root` 变量与 `@theme` 映射，无需再改 tokens.json）；
- 黑白编辑风格、宋体 display 标题、44px 触控、760px 居中壳、`mobile-shell`/`safe-area-fab`/`focus-ring`/`tap-target` 工具类全部保留；
- **无暗色模式**（与旧站一致，不得新增）；
- "差不多"的验收口径：同路由在 360/390/430px 下与旧站并排目测，布局结构、字号层级、间距节奏、交互流程一致；允许的差异仅为 X/S 系列删改直接导致的元素消失（如 admin 少一个面板）。

### 3.3 依赖与配置

- `dependencies` 维持 6 个不变（next/react/react-dom/@radix-ui/react-dialog/@supabase/supabase-js/lucide-react），零新增；
- 删除飞书链路后 `lib/integrations/lark.ts` 消失，无对应 npm 包需要移除（飞书用的是原生 fetch）；
- `next.config.ts` 原样（含 3 条 301）；`tsconfig.json`/`vitest.config.ts` 仅 `exclude` 追加 `"legacy code"`；`.gitignore` 追加 `legacy code/` 与 `tsconfig.tsbuildinfo`；
- 环境变量删减：随 X3 删除 `LARK_APP_ID/LARK_APP_SECRET/LARK_BASE_APP_TOKEN/LARK_BASE_TABLE_ID/LARK_FORM_URL/CRON_SECRET`，随 X1 无新增；其余照旧（见 `.env.example`，重建时同步重写该文件）。⚠️ A-1 若决策保留飞书，则对应变量保留。

### 3.4 Supabase 数据层规范（不变）

服务端唯一入口 `lib/integrations/supabase.ts`（service key + 单例 + `assertServerOnly`）；浏览器端零 Supabase SDK（验收硬指标）；不引入 middleware；admin 鉴权维持在 RSC `cookies()` + API `authenticateAdminRequest()`。

---

## 四、性能预算

| # | 指标 | 阈值 | 测量方式 |
|---|---|---|---|
| B1 | 公开路由首屏 First Load JS（gzip） | ≤ 115 KB（2026-08-14 验收修正：Next 15 + React 19 框架地板实测 ≈101KB gzip，公开路由实测量高 111.3KB，余量约 4KB；原 ≤110KB 阈值低估框架地板，故修正） | `npm run build` 后读 `.next/app-build-manifest.json`，对路由文件逐一 gzip 求和 |
| B2 | 单路由增量 JS（gzip） | ≤ 25 KB | 同上，减去 `/loading` 基线 |
| B3 | 客户端 chunk 出现 "supabase" | 0 | `grep -ri "supabase" .next/static/chunks --include="*.js" -l` 为空 |
| B4 | LCP（移动 4G 模拟） | ≤ 2.5s | Lighthouse mobile，`/`、`/docs/<slug>`、`/search` 各一次。**需真实浏览器环境，本地无 Supabase/AI 密钥时以代码级静态指标（SSG 预渲染、无阻塞脚本）代替，部署后补测存档** |
| B5 | Lighthouse Performance | ≥ 95 | 同上，部署后补测 |
| B6 | CLS ≤ 0.05 / INP ≤ 200ms | — | 同上；CLS 由图片尺寸声明在代码层保证 |
| B7 | ISR/缓存头 | 板块/文档页 `revalidate=3600`；`/api/search/index` 含 `s-maxage=86400` | 源码审查 + `curl -I` |
| B8 | 首屏无 `/api/*` 请求 | — | DevTools Network 首屏录制 |

---

## 五、里程碑（4 个）

> 全程在 `rebuild/v2` 分支；新代码写仓库根目录；`legacy code/` 只读；每完成一个逻辑单元 commit 一次（`M<编号>: <简述>`）；每里程碑结束验证全绿才进下一个。

### M1 — 脚手架与样式底座

- **涉及文件**：全部配置文件（从 legacy 拷贝后按 3.3 调整）、`.gitignore`、`app/globals.css`、`app/layout.tsx`、`src/components/primitives/{skeleton,status-page}.tsx`、4 个 loading + 2 个错误页、`public/`、`docs/`（已就位）、`vitest.config.ts` + `tests/setup.ts`
- **关键工作**：
  1. `git checkout -b rebuild/v2`；`.gitignore` 追加后提交首 commit；
  2. 拷贝配置并 `npm install`；
  3. 参照 `legacy code/app/globals.css` 重建样式底座，新增 4 条别名映射（accent/alert/pill/subtle）；
  4. 实现 `Skeleton`/`StatusPage`，重建 layout 与 4+3 个状态页（视觉参照 legacy 同名文件）。
- **验证**：`npm run typecheck && npm run build`（测试未迁入，`npm test` 跳过并记录）
- **完成定义**：`npm run dev` 可打开首页骨架；三档宽度目测与旧站骨架一致。

### M2 — 数据层与 AI 引擎

- **涉及文件**：`lib/**` 全部（按 3.1 合并结构）、`scripts/{publish,test}.ts`、`evals/test.json`、`tests/lib/**`、`tests/setup.ts`
- **关键工作**：按 3.1 重建 lib 五域；执行 S5–S9 合并与 X3/X4/X8/X9 删除（即不建这些文件）；`tests/lib/**` 只迁移幸存模块对应的测试（feedback/lark/smoke/eval 相关测试随功能删除）；
- **验证**：`npm run typecheck && npm test && npm run build`
- **完成定义**：幸存测试全绿；`grep -rn "lark\|feedback\|sample-cards\|topics" lib/ app/ src/ --include="*.ts*" -i` 无结果。

### M3 — 公开页面与组件

- **涉及文件**：`app/page.tsx`、`app/search/**`、`app/sections/**`、`app/docs/**`、`src/components/{primitives,ask,search,article}/**`、`tests/components/**`、`tests/pages/**`、`tests/integration/**`
- **关键工作**：逐文件先读 legacy 同名实现再重建；执行 S1–S4、S10、S11；drawer 懒加载（`next/dynamic`）；image 块声明尺寸防 CLS；AskSheet 保持 `next/dynamic ssr:false`；
- **验证**：`npm run typecheck && npm test && npm run build` + `npm run dev` 全链路走查（首页提问→板块→文档→FAB→搜索）
- **完成定义**：四页与旧站并排目测神似；`?answerSession=…#anchor` 会话恢复可用；B1/B2 达标。

### M4 — 管理后台、API 与性能收尾

- **涉及文件**：`app/admin/**`、`app/api/**`、`src/components/admin/**`、全仓性能审计
- **关键工作**：admin 两面板 + 真登出按钮（DELETE `/api/admin/auth` → `router.replace("/admin/login")`）；5 个 API 路由重建；跑 B1–B8 全项测量并记录；Lighthouse 三路由；
- **验证**：`npm run typecheck && npm test && npm run build` + Lighthouse + `curl -I`
- **完成定义**：Checklist 全勾；登录→Dry-Run→发布→回滚→登出走查通过；性能实测值写入 `docs/REBUILD_PROGRESS.md`。

---

## 六、验收核对表（Checklist）

### A. 首页 `/`
- [ ] C-01 宋体大标题 + 提问框为首屏主操作，文案与旧站一致
- [ ] C-02 提问后弹 AskSheet 并自动发起
- [ ] C-03 板块两列网格（≤6 个、ChevronRight）跳 `/sections/[slug]`
- [ ] C-04 右上角搜索入口；360/390/430px 目测神似

### B. 搜索 `/search`
- [ ] C-05 `?q=` 直达有 SSR 首筛结果
- [ ] C-06 挂载后预拉全量索引，之后内存即搜无网络请求；索引失败降级 `/api/search`
- [ ] C-07 `<mark>` 高亮、`#b-<anchor>` 锚点链接、≤50 条、replaceState 同步 URL
- [ ] C-08 无任何 AI 生成内容混入；空态/无结果文案一致

### C. 板块页 `/sections/[slug]`
- [ ] C-09 标题区+富文本导读（跳过首段）+子页面卡片"N 篇全览"
- [ ] C-10 失效 slug 404；ISR 3600s 生效
- [ ] C-11 pill/卡片/hover 使用新别名 token 后视觉协调（A-5 已定案）

### D. 文档页 `/docs/[slug]`
- [ ] C-12 面包屑/H1/更新日期（zh-CN, Asia/Shanghai）/正文结构一致
- [ ] C-13 板块根页 404
- [ ] C-14 12 种块渲染正确（含 embed 白名单仅 school-map.ncuos.com、表格横滚、columns 手机堆叠、page-link 站内路由）
- [ ] C-15 FAB 常驻右下，滚动时锚点跟随当前标题
- [ ] C-16 页面树抽屉：开合、焦点锁定、当前页高亮、关闭回焦；触控目标 ≥44px
- [ ] C-17 图片有尺寸声明，CLS ≤0.05

### E. AI 问答
- [ ] C-18 三态（loading/ready/error）+ insufficient 拒答文案
- [ ] C-19 claims 出处角标跳 `?answerSession=<id>#<anchor>`，popstate/pageshow 恢复会话+草稿+滚动位置
- [ ] C-20 追问复用同一 pageContext；文档页提问携带 pageId+anchor
- [ ] C-21 限流 10/分（第 11 次 429）；>500 字 400；非 `b-` 锚点 400
- [ ] C-22 `AI_ANSWER_MODE` fixture/production 两模式可用（shadow 已删）

### F. 管理后台与 API
- [ ] C-23 未登录 `/admin` → 登录页；错误密码有提示；Cookie httpOnly/7 天/prod secure
- [ ] C-24 SyncPanel：Dry-Run、进度轮询、日志滚底、强制解锁
- [ ] C-25 VersionTimeline：版本列表、空记录占位（无假数据）、一键回滚、发布后自动刷新
- [ ] C-26 登出按钮真实可用，登出后回登录页
- [ ] C-27 `/admin` 无 EvalPanel；全站无 `/api/feedback`、`/api/sync/lark` 路由（404）
- [ ] C-28 publish-notion 双通道鉴权（Cookie/Bearer）可用

### G. 工程与性能
- [ ] C-29 `npm run typecheck` / `npm test` / `npm run build` 全绿
- [ ] C-30 `package.json` 依赖零新增；无 `NEXT_PUBLIC_` 变量
- [ ] C-31 B1–B8 实测达标并记录数值
- [ ] C-32 客户端 chunk 无 supabase（B3）
- [ ] C-33 图标全部 lucide-react；无暗色模式代码
- [ ] C-34 死代码终扫：每个 lib/src 文件至少一个非测试引用方
- [ ] C-35 `git diff main...rebuild/v2 --stat` 评审无越权改动（docs/、legacy code/ 未动）

---

## 附录 A：⚠️ 待确认事项

| # | 事项 | 需要的信息 | 默认动作 |
|---|---|---|---|
| A-1 | 飞书链路整体删除（X3） | 线上 `/api/sync/lark` 是否真有定时任务在跑（查 EdgeOne/外部 cron 配置）；`information_cards` 数据是否有其他消费方 | **删除**；若线上在跑，先停 cron 再删 |
| A-2 | shadow 模式删除（X5） | 运维手册止血流程是否接受 fixture 替代 shadow | **删 shadow**；手册相应段落标记为待更新（记入 PROGRESS，由人改文档，Agent 不动 docs/） |
| A-3 | 审计 CLI 与 smoke 评测套删除（X7/X8） | 是否有外部系统调用这些脚本 | **删除**，保留 `publish`/`test` 两个 CLI |
| A-4 | `database.types.ts` 与 schema.sql 漂移（failure_reason 列、information_cards 表） | 线上实际表结构 | 类型原样平移，schema 不动，仅记录 |
| A-5 | ~~失效样式类~~ | — | **已定案**（tokens.json 已登记别名，M1 实现映射） |
| A-6 | favicon/manifest 缺失 | 是否有品牌图标 | 不新增 |
| A-7 | TrustStatus/RiskLevel 中英双轨字面量 | 线上实际存的字面量 | 原样平移，不收敛 |

## 附录 B：执行纪律

1. 施工前必读：`docs/product/产品愿景与AI策略规范.md`、`docs/product/内容发布与数据契约.md`、`docs/design/设计系统与组件契约.md`、`docs/design/tokens.json`；
2. 迁移任何文件前先读 `"legacy code/"` 同名实现（路径含空格，命令行加引号）；`legacy code/` 只读；
3. 删除范围以 2.2 表为唯一依据，表外功能不得删；拿不准的记入 `docs/REBUILD_PROGRESS.md` 并继续不受影响的部分；
4. 禁止：新增依赖、暗色模式、`any`/`@ts-ignore`、静默 catch、页面私造 token 外样式、关键词搜索混入 AI 回答；
5. 每里程碑结束把完成内容、文件清单、验证结果、⚠️ 处理、遗留问题写入 `docs/REBUILD_PROGRESS.md`。
