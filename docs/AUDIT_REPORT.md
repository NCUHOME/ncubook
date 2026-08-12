# 南昌大学 AI 知识产品（NCU Book / 此间）取证式代码审计与重构规划报告

> **审计执行时间**：2026-08-12  
> **项目技术栈**：Next.js App Router (v15.3.0) + Supabase (v2.49.0) + TypeScript (v5.8.0) + Vitest (v3.2.0)  
> **审计属性**：取证式代码审计与架构重构规划（只读）  
> **原则声明**：严格遵守 `AGENTS.md` 宪法。未经用户确认，未修改任何项目业务代码。

---

## 第 0 阶段：基线确认报告

在启动代码审计前，我们首先在干净的本地环境（`c:\chengxu\ncubook`）执行了基线测试与命令校验。

### 1.1 Git 工作区状态 (`git status`)
- **执行命令**：`git status`
- **执行结果**：
  ```
  On branch main
  Your branch is up to date with 'origin/main'.
  nothing to commit, working tree clean
  ```
- **结论**：当前 Git 工作区完全干净，不存在未提交的暂存或未追踪修改。

### 1.2 自动化构建与测试基线结果
依次运行 package.json 中配置的标准构建、类型检查与测试脚本：

| 校验项 | 执行命令 | 真实输出结果 | 基线判定 |
| :--- | :--- | :--- | :---: |
| **TypeScript 类型检查** | `npx tsc --noEmit` | Exit code: `0`（无类型错误） | **PASS** |
| **Vitest 单元与组件测试** | `npm test` (`vitest run`) | `33 passed, 1 skipped (34 test files)`, `120 passed, 1 skipped (121 tests)` | **PASS** |
| **Next.js 生产构建** | `npm run build` (`next build`) | `Compiled successfully in 2.5s`, `51/51 static pages generated` | **PASS** |

### 1.3 基线问题清单与防护红线
- **通过项**：`tsc --noEmit` 0 错误；`vitest` 120/120 活跃测试通过；`next build` 51/51 SSG 静态页面编译成功。
- **跳过项**：`tests/integration/citation.test.ts` 因缺少 `EXPECTED_CONTENT_VERSION` 环境变量在本地被 `it.skip` 优雅跳过。
- **基线防护红线**：后续所有重构 Task 均不得破坏现有 120 项测试全绿及 zero-type-error 编译指标。

---

## 第 1 阶段：取证式审计详细发现

针对项目的 6 大核心领域进行了逐行查验。每条发现均附带精确文件路径、行号、代码片段与风险评估。

### 1. 结构与配置

#### Finding 1.1 [INFO/PASS] 根目录 `app/` 与 `src/` 划分符合规范
- **文件路径**：`app/` vs `src/`
- **问题说明**：项目根目录 `app/` 为唯一 Next.js App Router 生产路由入口，`src/` 存放 `components/`, `context/`, `hooks/` 组件逻辑，不存在 `src/app` 废弃路由。符合 `AGENTS.md` 规定。

#### Finding 1.2 [INFO/PASS] 版本库未错误提交敏感文件或编译产物
- **文件路径**：`.gitignore` / `git ls-files`
- **代码验证**：`git ls-files` 输出中仅包含 `.env.example` 范本，未提交 `.env.production`、`tsconfig.tsbuildinfo` 或 `.next`。`.gitignore` 包含了完整的忽略规则。

---

### 2. 安全（最高优先级）

#### Finding 2.1 [HIGH / BLOCKER] 控制台登录 Cookie Session 采用硬编码字符串，存在未授权伪造越权风险
- **文件路径**：[app/api/admin/auth/route.ts](file:///c:/chengxu/ncubook/app/api/admin/auth/route.ts#L28-L35) 与 [app/admin/page.tsx](file:///c:/chengxu/ncubook/app/admin/page.tsx#L20-L24)
- **代码片段**：
  ```ts
  // app/api/admin/auth/route.ts:28-35
  const cookieStore = await cookies();
  cookieStore.set("admin_session", "authenticated", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  // app/admin/page.tsx:20-24
  const session = cookieStore.get("admin_session")?.value;
  if (session !== "authenticated") {
    redirect("/admin/login");
  }
  ```
- **问题说明**：管理员登录成功后直接设置 Cookie `admin_session=authenticated`。页面端仅判断 Cookie 值是否等于明文字符串 `"authenticated"`，未进行签名、Token 校验或 HMAC 哈希。任何攻击者只需在浏览器手动注入 `admin_session=authenticated`，即可直接越权访问 `/admin` 开发者控制台。
- **严重程度**：**高（阻断项）**

#### Finding 2.2 [HIGH / BLOCKER] 管理端发布接口 GET 请求完全无鉴权，且 POST 接口可被伪造 Session 越权触发
- **文件路径**：[app/api/admin/publish-notion/route.ts](file:///c:/chengxu/ncubook/app/api/admin/publish-notion/route.ts#L21-L65)
- **代码片段**：
  ```ts
  // app/api/admin/publish-notion/route.ts:21-27
  export async function GET(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const action = url.searchParams.get("action");
    if (action === "versions") {
      const versions = await fetchContentVersionsFromSupabase();
      return Response.json({ ok: true, versions }, { status: 200 });
    }
    // ... 无任何 authentication 检查
  }

  // app/api/admin/publish-notion/route.ts:53-65
  const isAuthenticatedByCookie = session === "authenticated";
  // ...
  if (!isAuthenticatedByCookie && !isAuthenticatedByToken) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  ```
- **问题说明**：`GET /api/admin/publish-notion` 缺乏任何鉴权校验，外部任何人均可查询线上发版 Job 日志与版本历史。POST 端点因依赖 Finding 2.1 中的静态字符串 Cookie 校验，攻击者伪造 Cookie 后可直接触发发版、强行解除锁 (`forceUnlock`) 或执行版本回滚。
- **严重程度**：**高（阻断项）**

#### Finding 2.3 [HIGH] 飞书同步接口 (`/api/sync/lark`) 缺少 CRON_SECRET 配置时降级为公开访问
- **文件路径**：[app/api/sync/lark/route.ts](file:///c:/chengxu/ncubook/app/api/sync/lark/route.ts#L13-L18)
- **代码片段**：
  ```ts
  const expectedSecret = process.env.CRON_SECRET;
  const providedSecret = req.headers.get("x-cron-secret") || req.nextUrl.searchParams.get("secret");

  if (expectedSecret && providedSecret !== expectedSecret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  ```
- **问题说明**：当生产环境变量 `CRON_SECRET` 未配置时，`expectedSecret` 为 `undefined`，`expectedSecret && ...` 表达式直接评估为 `false`，导致判断被静默跳过，接口变成任何未经身份验证的请求均可触发飞书数据同步并写入数据库。
- **严重程度**：**高**

#### Finding 2.4 [MEDIUM] 生产配置文件 `.env.production` 存有真实密钥明文
- **文件路径**：[.env.production](file:///c:/chengxu/ncubook/.env.production#L2)
- **代码片段**：
  ```env
  SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpX...
  AI_PROVIDER_API_KEY=sk-76175b4d93194554ae66dfbd38874d9c
  ```
- **问题说明**：虽然 `.env.production` 已被 `.gitignore` 忽略且未提交入 git，但本地工作区存有真实的生产环境 `SUPABASE_SERVICE_ROLE_KEY` 与 DeepSeek `AI_PROVIDER_API_KEY` 明文。建议在本地开发使用 `.env.local` 并在生产平台（如 Vercel/EdgeOne）配置环境变量。
- **严重程度**：**中**

---

### 3. 架构与 Next.js 最佳实践

#### Finding 3.1 [LOW] RAG 检索存在冗余的版本号独立查询
- **文件路径**：[lib/ai/retrieve.ts](file:///c:/chengxu/ncubook/lib/ai/retrieve.ts#L55-L64)
- **代码片段**：
  ```ts
  const contentVersion = await repository.getCurrentVersion(); // 独立发起 1 次网络查询
  if (!contentVersion) return [];
  const candidates = await repository.searchCurrentVersion({ ... }); // 内部 rpc 再次查询 pointer
  ```
- **问题说明**：PostgreSQL 中的 RPC 函数 `retrieve_published_sources` 内部已经包含了 `where entry.content_version = (select pointer.content_version from published_content_pointer ...)` 的版本自动联表逻辑，应用层在调用 RPC 前先单独发起一次 `getCurrentVersion()` 增加了 1 次不必要的网络 RTT。
- **严重程度**：**低**

---

### 4. TypeScript 类型安全

#### Finding 4.1 [MEDIUM] 缺乏 Supabase 自动生成数据库 Schema 类型定义 (`Database`)
- **文件路径**：[lib/integrations/supabase.ts](file:///c:/chengxu/ncubook/lib/integrations/supabase.ts#L19-L24) 与 [lib/content/supabase-repo.ts](file:///c:/chengxu/ncubook/lib/content/supabase-repo.ts#L67)
- **代码片段**：
  ```ts
  export function getSupabaseAdmin() {
    return createClient(url, key, { ... }); // 缺少 <Database> 泛型
  }

  // lib/content/supabase-repo.ts:67
  return optionalString(asRecord(pointerResult.data).content_version) ?? null;
  ```
- **问题说明**：`getSupabaseAdmin()` 创建 SupabaseClient 时未传入类型生成的 `Database` 契约，导致所有 SQL 表查询返回 `any` / `unknown`，依赖大量手动书写的 `asRecord`、`parsePageRow` 等运行时类型拆解函数，失去了 TypeScript 编译期对数据库列名变更的自动推导与校验。
- **严重程度**：**中**

#### Finding 4.2 [LOW] 测试代码中存在非空断言操作符 (`!`)
- **文件路径**：[tests/integration/citation.test.ts](file:///c:/chengxu/ncubook/tests/integration/citation.test.ts#L15) 与 [tests/pages/doc.test.tsx](file:///c:/chengxu/ncubook/tests/pages/doc.test.tsx#L27)
- **代码片段**：
  ```ts
  const retrieval = createSupabaseRetrievalRepository(supabase!);
  const contentBlocks = view!.blocks[0]?.type === "paragraph" ? view!.blocks.slice(1) : view!.blocks;
  ```
- **问题说明**：全库生产代码（`app/`, `lib/`, `src/`）实现零 `!` 断言，但在 `tests/` 下存在 18 处非空断言 `!`。若 Mock 或 Setup 返回 `null` 时抛出无法直观排查的 TypeError。
- **严重程度**：**低**

---

### 5. 数据层与 Supabase

#### Finding 5.1 [HIGH / BLOCKER] 生产 API 接口 `POST /api/feedback` 引用的 `student_feedback` 数据库表在 SQL Schema 中缺失
- **文件路径**：[app/api/feedback/route.ts](file:///c:/chengxu/ncubook/app/api/feedback/route.ts#L40-L46) 与 [supabase/schema.sql](file:///c:/chengxu/ncubook/supabase/schema.sql)
- **代码片段**：
  ```ts
  // app/api/feedback/route.ts:40-46
  const { error } = await supabase.from("student_feedback").insert({
    page_path: payload.pagePath || null,
    question: payload.question || null,
    comment: payload.comment || null,
    card_slug: payload.cardSlug || null,
    status: "new",
  });
  ```
- **问题说明**：`app/api/feedback/route.ts` 尝试向 `student_feedback` 表写入学生反馈，但查验 `supabase/schema.sql`，该表中完全未定义 `student_feedback` 表及对应 RLS 策略。一旦在配置了 Supabase 的生产环境中调用该接口，将触发 Postgres `42P01` (relation "student_feedback" does not exist) 异常，导致学生反馈提交功能直接崩溃。
- **严重程度**：**高（阻断项）**

#### Finding 5.2 [MEDIUM] 仓储 Fallback 加载版本回溯循环存在 N+1 串行查询
- **文件路径**：[lib/content/supabase-repo.ts](file:///c:/chengxu/ncubook/lib/content/supabase-repo.ts#L40-L48)
- **代码片段**：
  ```ts
  for (const row of versions) {
    try {
      const candidate = await loadVersionFixture(row.id); // 内部包含 4 次串行 select
      if (candidate && candidate.pages.length > 0) return candidate;
    } catch {}
  }
  ```
- **问题说明**：在指针失效的回滚降级模式下，循环遍历最多 10 个历史版本，每个版本调用 `loadVersionFixture` 依次执行 4 次数据库查询 (`published_pages`, `published_blocks`, `published_assets`, `published_search_entries`)，最多产生 40 次串行数据库 Roundtrips。
- **严重程度**：**中**

---

### 6. 测试质量与覆盖率

#### Finding 6.1 [MEDIUM] 飞书同步模块 (`lib/integrations/lark.ts`) 与同步路由 (`/api/sync/lark`) 缺失单元与路由测试
- **文件路径**：[lib/integrations/lark.ts](file:///c:/chengxu/ncubook/lib/integrations/lark.ts) 与 [app/api/sync/lark/route.ts](file:///c:/chengxu/ncubook/app/api/sync/lark/route.ts)
- **问题说明**：`tests/` 目录中缺乏对 `lib/integrations/lark.ts` API 转换逻辑及 `POST /api/sync/lark` 鉴权与 HTTP 状态码响应的测试用例。
- **严重程度**：**中**

#### Finding 6.2 [LOW] 真实 Citation 集成测试默认被 Skip，缺乏 Mock 备用断言
- **文件路径**：[tests/integration/citation.test.ts](file:///c:/chengxu/ncubook/tests/integration/citation.test.ts#L9)
- **代码片段**：
  ```ts
  const expectedVersion = process.env.EXPECTED_CONTENT_VERSION;
  const liveTest = expectedVersion ? it : it.skip;
  ```
- **问题说明**：`citation.test.ts` 强依赖外部 Supabase 环境变量，未配置时完全跳过测试，导致在常规 `npm test` 中该集成链路的打通状态无法得到自动验证。
- **严重程度**：**低**

---

## 第 2 阶段：诊断问题汇总与阻断项清单

按严重程度【高/中/低】排序如下，标记 **[阻断项]** 的问题必须在第 3 阶段优先修复：

| 编号 | 发现分类 | 严重程度 | 问题简述 | 影响面与后果 | 阻断标记 |
| :---: | :--- | :---: | :--- | :--- | :---: |
| **F-01** | 安全 / 鉴权 | **HIGH** | 控制台 Admin Cookie 采用明文字符串 `admin_session=authenticated` | 攻击者可在浏览器直接注入 Cookie 绕过控制台登录守卫 | **[阻断项]** |
| **F-02** | 安全 / 鉴权 | **HIGH** | `GET /api/admin/publish-notion` 无鉴权；POST 可被伪造 Cookie 越权调用 | 越权查看发布日志、触发 Notion 同步发版、强制解锁与回滚 | **[阻断项]** |
| **F-03** | 数据层 / Migration | **HIGH** | `POST /api/feedback` 写入的 `student_feedback` 数据库表在 SQL Schema 中不存在 | 线上学生提交反馈与勘误时触发 Postgres 42P01 数据库崩溃 | **[阻断项]** |
| **F-04** | 安全 / 鉴权 | **HIGH** | `/api/sync/lark` 接口在未配置 `CRON_SECRET` 时降级为允许公开未授权访问 | 外部任意请求可触发飞书卡片同步写入数据库 | **[阻断项]** |
| **F-05** | 数据层 / 性能 | **MEDIUM** | `fetchPublishedFixtureFromSupabase` Fallback 循环存在 N+1 (最多 40 次) 串行 SQL 查询 | 在指针失效时导致 HTTP 响应延迟增加几秒 | 非阻断修补 |
| **F-06** | TS 类型安全 | **MEDIUM** | `getSupabaseAdmin()` 未使用 Supabase 自动生成的 `Database` 类型定义 | 全局数据库查询无法在编译期校验字段变更 | 非阻断修补 |
| **F-07** | 测试覆盖率 | **MEDIUM** | `lib/integrations/lark.ts` 及 `/api/sync/lark` 路由缺失单测 | 飞书数据同步逻辑变更缺乏回归测试保障 | 非阻断修补 |
| **F-08** | 安全 / 配置 | **MEDIUM** | `.env.production` 本地文件存有生产环境私钥明文 | 需引导规范使用 `.env.local` 与平台 Secrets 管理 | 非阻断修补 |
| **F-09** | 架构 / 性能 | **LOW** | `retrieveGroundingSources` 在 RPC 执行前多发了一次 `getCurrentVersion()` 查询 | 产生 1 次冗余的网络 RTT | 优化项 |
| **F-10** | TS 类型安全 | **LOW** | `tests/` 目录中存在 18 处非空断言 `!` | 异常情况下可能引发无法直观判定的测试崩溃 | 优化项 |
| **F-11** | 测试质量 | **LOW** | `citation.test.ts` 强依赖环境变量默认 Skip | 本地 CI 环境下测试被跳过，缺少 Mock 断言防护 | 优化项 |

---

## 第 3 阶段：分步重构实施计划

重构计划严格遵循**“阻断项 → 无破坏性修补 → 数据层 → 组件与测试”**的先后顺序，划分为独立的、可单步验证的 Task。每个 Task 完成后必须执行 `npm run build` + `npm test` + `npx tsc --noEmit` 三重验证。

---

### Task 1: 修复控制台与发布 API 的 Session/Token 安全鉴权漏洞 (对应 F-01, F-02)

- **改动范围**：
  - [app/api/admin/auth/route.ts](file:///c:/chengxu/ncubook/app/api/admin/auth/route.ts)
  - [app/api/admin/publish-notion/route.ts](file:///c:/chengxu/ncubook/app/api/admin/publish-notion/route.ts)
  - [app/admin/page.tsx](file:///c:/chengxu/ncubook/app/admin/page.tsx)
  - [lib/publishing/auth.ts](file:///c:/chengxu/ncubook/lib/publishing/auth.ts) [NEW] (抽出统一 HMAC 动态 Token 校验逻辑)
- **改动内容**：
  1. 使用基于 `ADMIN_PASSWORD` 与 Node.js `crypto` 生成带 HMAC 签名的时间戳 Session Token，替换明文字符串 `"authenticated"`。
  2. 为 `GET /api/admin/publish-notion` 添加统一的 Cookie / Authorization Token 鉴权校验。
  3. `app/admin/page.tsx` 校验 Session Token 的签名有效性与过期时间。
- **验收标准**：
  - `npx tsc --noEmit` 零错误。
  - `npm test` 全部通过。
  - 伪造 `admin_session=authenticated` 的请求在 GET/POST `/api/admin/publish-notion` 及 `/admin` 页面均被拒绝 (401/307)。
- **风险与回滚方式**：
  - **风险**：已登录管理员的旧 Cookie 失效需要重新登录。
  - **回滚**：`git checkout` 恢复上述 4 个文件。

---

### Task 2: 补充 `student_feedback` 数据库 Schema 定义与 RLS 策略 (对应 F-03)

- **改动范围**：
  - [supabase/schema.sql](file:///c:/chengxu/ncubook/supabase/schema.sql)
  - [tests/lib/content/feedback.test.ts](file:///c:/chengxu/ncubook/tests/lib/content/feedback.test.ts) [NEW]
- **改动内容**：
  1. 在 `supabase/schema.sql` 中新增 `student_feedback` 数据库表定义（包含 `id`, `page_path`, `question`, `comment`, `card_slug`, `status`, `created_at`）。
  2. 启用 RLS (`alter table student_feedback enable row level security`)，配置 `service_role` 专属读写策略，严禁 `anon` 直接查询他人反馈。
  3. 增加 `/api/feedback` 的单元路由测试。
- **验收标准**：
  - `supabase/schema.sql` 语法正确。
  - `npx tsc --noEmit` 0 错误，`npm test` 通过。
- **风险与回滚方式**：
  - **风险**：无破坏性风险（纯 SQL 追加与测试补充）。
  - **回滚**：`git checkout supabase/schema.sql` 并删除新建测试文件。

---

### Task 3: 严格化飞书同步接口 (`/api/sync/lark`) 鉴权策略 (对应 F-04)

- **改动范围**：
  - [app/api/sync/lark/route.ts](file:///c:/chengxu/ncubook/app/api/sync/lark/route.ts)
  - [tests/routes/sync-lark.test.ts](file:///c:/chengxu/ncubook/tests/routes/sync-lark.test.ts) [NEW]
- **改动内容**：
  1. 修改 `app/api/sync/lark/route.ts` 逻辑：若环境变量 `CRON_SECRET` 未配置，直接返回 `503 Service Unavailable (error: "cron_secret_unconfigured")`，禁止回退为允许公开访问。
  2. 增加对 `x-cron-secret` 校验的单元测试。
- **验收标准**：
  - 未配置 `CRON_SECRET` 时请求 `POST /api/sync/lark` 明确返回 503。
  - 配置 `CRON_SECRET` 时非法 Token 返回 401，合法 Token 正常处理。
  - `npm test` 与 `npx tsc --noEmit` 全绿。
- **风险与回滚方式**：
  - **风险**：若线上遗漏配置 `CRON_SECRET`，定时任务将返回 503。
  - **回滚**：`git checkout app/api/sync/lark/route.ts`。

---

### Task 4: 生成并引入 Supabase 类型契约 `Database`，消除类型断言 (对应 F-06)

- **改动范围**：
  - [lib/database.types.ts](file:///c:/chengxu/ncubook/lib/database.types.ts) [NEW]
  - [lib/integrations/supabase.ts](file:///c:/chengxu/ncubook/lib/integrations/supabase.ts)
  - [lib/content/supabase-repo.ts](file:///c:/chengxu/ncubook/lib/content/supabase-repo.ts)
- **改动内容**：
  1. 基于 `supabase/schema.sql` 提取完整的 `Database` TypeScript 类型契约声明文件 `lib/database.types.ts`。
  2. 在 `getSupabaseAdmin()` 中传入 `createClient<Database>(url, key, ...)`。
  3. 重构 `supabase-repo.ts` 中的查询点，赋予 Supabase API 强类型推导能力。
- **验收标准**：
  - `npx tsc --noEmit` 零错误。
  - `npm test` 全部通过。
- **风险与回滚方式**：
  - **风险**：类型定义不匹配会导致编译阶段报错。
  - **回滚**：删除 `lib/database.types.ts` 并恢复 `lib/integrations/supabase.ts`。

---

### Task 5: 优化 Supabase 仓储 Fallback 加载性能与 RAG 检索 roundtrip (对应 F-05, F-09)

- **改动范围**：
  - [lib/content/supabase-repo.ts](file:///c:/chengxu/ncubook/lib/content/supabase-repo.ts)
  - [lib/ai/retrieve.ts](file:///c:/chengxu/ncubook/lib/ai/retrieve.ts)
- **改动内容**：
  1. 重构 `findFallbackPublishedFixture`：将 10 次循环内的串行 4 次查询改用 `Promise.all` 批量并发处理。
  2. 简化 `retrieveGroundingSources`：在直接使用 RPC 进行混合检索时，减少前置重复发起 `getCurrentVersion()` 的 SQL 请求。
- **验收标准**：
  - `npm test` (含 `retrieve.test.ts` 与 `repo.test.ts`) 全数通过。
  - `npx tsc --noEmit` 0 错误。
- **风险与回滚方式**：
  - **风险**：并发查询可能在极低端 Supabase 实例上消耗更多连接。
  - **回滚**：`git checkout lib/content/supabase-repo.ts lib/ai/retrieve.ts`。

---

### Task 6: 补充飞书模块测试与清理测试代码非空断言 (对应 F-07, F-10, F-11)

- **改动范围**：
  - [tests/lib/integrations/lark.test.ts](file:///c:/chengxu/ncubook/tests/lib/integrations/lark.test.ts) [NEW]
  - [tests/integration/citation.test.ts](file:///c:/chengxu/ncubook/tests/integration/citation.test.ts)
  - [tests/pages/doc.test.tsx](file:///c:/chengxu/ncubook/tests/pages/doc.test.tsx)
- **改动内容**：
  1. 为 `lib/integrations/lark.ts` 编写完整单元测试。
  2. 为 `citation.test.ts` 补充未配置环境变量时的 Mock 逻辑断言，确保在常规 `npm test` 下也能执行 Mock 断言而非简单的 skip。
  3. 清理 `doc.test.tsx` 中的 `!` 非空断言，使用防御性断言（`if (!view) throw new Error(...)`）代替。
- **验收标准**：
  - `npm test` 测试用例数量增加，测试全部通过且无非空断言隐患。
  - `npx tsc --noEmit` 0 错误，`npm run build` 成功。
- **风险与回滚方式**：
  - **风险**：测试用例编写不当影响 CI 流程。
  - **回滚**：`git checkout tests/` 并删除新建测试。
