# 自动化测试套件与防漂移门禁设计说明 (tests/)

本文档全面阐述「此间 (NCU Book)」自动化测试体系、分层测试架构、43 个测试套件字典、Schema 防漂移门禁与质量守护策略。

---

## 1. 核心测试原则

本项目采用 **Vitest + React Testing Library** 构建全方位的单元测试、组件交互测试、API 路由集成测试与防漂移门禁测试。

```text
代码提交 / CI 触发 ──► npm run typecheck (TypeScript 严格类型检查)
                               │
                               ▼
                        npm test (Vitest 自动化测试)
          ┌────────────────────┼────────────────────┐
          ▼                    ▼                    ▼
   [单元与领域测试]      [组件与交互测试]     [API与路由测试]
   - lib/ai/*           - AdminDashboard     - /api/ask 限流
   - lib/publishing/*   - SearchInput        - /api/search 检索
   - lib/content/*      - Drawer / Sheet     - /api/admin/* 鉴权
          │                    │                    │
          └────────────────────┼────────────────────┘
                               ▼
               [架构防漂移门禁 schema-drift.test.ts]
               双向断言 schema.sql 与 database.types.ts
                               │
                               ▼
                         100% 通过 ➔ 允许部署
```

1. **确定性与高执行速度**：174 项测试全部在 **4 秒以内**完成，杜绝任何随机性 Flaky 测试；
2. **多层防御矩阵**：自底向上涵盖领域算法、UI 组件渲染、无障碍键盘导航、API 限流与鉴权拦截；
3. **架构防漂移门禁**：数据库 DDL 发生变化时，强制要求同步更新 TypeScript 类型契约，否则门禁直接阻断；
4. **真实交互模拟**：使用 React Testing Library 模拟真实用户点击、输入、弹层展开与后退恢复。

---

## 2. 测试套件分类字典 (43 个测试套件)

### 2.1 核心领域与算法测试 (`tests/lib/`)

| 测试文件 | 覆盖模块 | 核心断言与契约检验 |
| :--- | :--- | :--- |
| **`tests/lib/ai/ask.test.ts`** | `lib/ai/ask.ts` | 完整问答流水线编排、精确问答 LRU 缓存与唯一 Session ID 生成。 |
| **`tests/lib/ai/retrieve.test.ts`** | `lib/ai/retrieve.ts` | 知识检索粗召回、相关度加权融合排序与页面上下文过滤。 |
| **`tests/lib/ai/prompt.test.ts`** | `lib/ai/prompt.ts` | Prompt 模板上下文注入、Claim+Citation 结构化输出契约。 |
| **`tests/lib/ai/ground.test.ts`** | `lib/ai/ground.ts` | 事实归因检验器，确保所有输出观点均有召回段落锚点依据。 |
| **`tests/lib/ai/policy.test.ts`** | `lib/ai/policy.ts` | 医疗处方、Prompt 探针攻击与越界提问的主动拒答判定。 |
| **`tests/lib/ai/provider.test.ts`** | `lib/ai/provider.ts` | 大模型客户端适配、超时熔断与网络异常捕获。 |
| **`tests/lib/ai/eval.test.ts`** | `lib/ai/eval.ts` | 6 大核心评测指标公式计算与阈值合规断言。 |
| **`tests/lib/publishing/pipeline.test.ts`** | `lib/publishing/pipeline.ts` | 5 阶段发布生命周期调度、版本回滚与彻底删除逻辑。 |
| **`tests/lib/publishing/blocks.test.ts`** | `lib/publishing/blocks.ts` | Notion 嵌套富文本块递归解析与稳定锚点 `b-xxx` 提取。 |
| **`tests/lib/publishing/assets.test.ts`** | `lib/publishing/assets.ts` | 媒体资源镜像转存、403/404 失效外链透明 PNG 降级。 |
| **`tests/lib/publishing/version.test.ts`** | `lib/publishing/version.ts` | 分块暂存前置校验、版本提交切线与缓存刷新。 |
| **`tests/lib/publishing/route.test.ts`** | `lib/publishing/route.ts` | 发版、回滚与删除指令解析与非法参数拦截。 |
| **`tests/lib/publishing/auth.test.ts`** | `lib/publishing/auth.ts` | Cookie 会话签名校验与 Bearer Token 鉴权。 |
| **`tests/lib/content/search.test.ts`** | `lib/content/search.ts` | 客户端全文搜索 SDK 与参数防抖。 |
| **`tests/lib/database.schema-drift.test.ts`**| `lib/database.types.ts` | **防漂移门禁**：双向断言 `schema.sql` 与 TypeScript 类型定义。 |

### 2.2 UI 组件与交互测试 (`tests/components/`)

| 测试文件 | 覆盖组件 | 核心断言与契约检验 |
| :--- | :--- | :--- |
| **`tests/components/admin-dashboard.test.tsx`** | `AdminTabs`, `VersionTimeline` | 控制台 Tab 切换、版本时间线渲染、一键恢复与彻底删除按钮交互。 |
| **`tests/components/tokens.test.tsx`** | `tokens.json` | 强制断言全站设计令牌色值、字号、间距与圆角类名合法有效。 |
| **`tests/components/search.test.tsx`** | `SearchInput`, `SearchResults` | 搜索框输入、空状态、结果高亮与路由跳转。 |
| **`tests/components/drawer.test.tsx`** | `Drawer` | 移动端目录树抽屉滑出、展开折叠与焦点恢复。 |
| **`tests/components/sheet.test.tsx`** | `AskSheet` | AI 问答弹层交互、逐句观点归因渲染与出处角标点击。 |
| **`tests/components/article.test.tsx`** | `ArticleRenderer`, `BlockRenderer` | 富文本块高保真渲染、表格/代码块/折叠列表展示。 |

### 2.3 页面渲染与 API 路由测试 (`tests/pages/` & `tests/api/`)

| 测试文件 | 覆盖页面 / 路由 | 核心断言与契约检验 |
| :--- | :--- | :--- |
| **`tests/pages/home.test.tsx`** | `/` 首页 | 场景导航卡、推荐文章与问答入口首屏渲染。 |
| **`tests/pages/doc.test.tsx`** | `/docs/[slug]` | 文档详情页 SSG 静态属性组装与元数据解析。 |
| **`tests/pages/search.test.tsx`** | `/search` | 搜索结果列表服务端渲染与空查询提示。 |
| **`tests/api/admin-auth.test.ts`** | `/api/admin/auth` | 登录口令校验、Cookie 签发与登出清理。 |
| **`tests/api/admin-inspect.test.ts`**| `/api/admin/ask/inspect` | 白盒探针权限拦截与数据结构返回。 |
| **`tests/api/admin-evals.test.ts`** | `/api/admin/evals/*` | 评测用例拉取与在线运行评测调度。 |
| **`tests/api/search.test.ts`** | `/api/search` | 关键词查询入参校验与结果格式化。 |
| **`tests/integration/citation.test.ts`**| 端到端问答链路 | 验证自然语言提问到精确段落锚点定位的全链路可溯源性。 |

---

## 3. 系统能力矩阵（测试体系能做什么）

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        自动化测试核心能力全景                          │
├──────────────────┬──────────────────┬──────────────────────────────────┤
│ 业务场景         │ 核心测试覆盖     │ 质量保障表现                     │
├──────────────────┼──────────────────┼──────────────────────────────────┤
│ 1. 架构防漂移    │ schema-drift     │ 数据库改动与代码类型 100% 自动同步│
│ 2. 问答防幻觉    │ ground.test.ts   │ 确保大模型每一个观点均有站内依据 │
│ 3. 移动端触控保障│ components/*     │ 确保所有按钮/链接均满足 44px+ 热区│
│ 4. 闪电级 CI 门禁│ 43 套件 / 174 单测│ 4秒内跑完全部断言，秒级反馈结果  │
│ 5. 极端网络容灾  │ assets.test.ts   │ 验证 403 历史死链秒级降级不阻塞发版│
└──────────────────┴──────────────────┴──────────────────────────────────┘
```

---

## 4. 常用运行与调试命令

```bash
# 1. 单次运行全部测试（CI 门禁标准）
npm test

# 2. 启动交互式热重载监听（本地边写边测）
npm run test:watch

# 3. 仅运行指定子目录或文件
npx vitest run tests/lib/publishing/
npx vitest run tests/lib/ai/
npx vitest run tests/components/admin-dashboard.test.tsx

# 4. 运行特定测试用例（根据名称过滤）
npx vitest run -t "schema drift"
```
