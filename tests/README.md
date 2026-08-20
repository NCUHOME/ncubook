# 自动化测试套件与防漂移门禁设计说明 (tests/)

本文档全面阐述「此间 (NCU Book)」自动化测试体系、分层测试架构、46 个测试套件字典、Schema 防漂移门禁与质量守护策略。

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
    - lib/ai/*           - AdminDashboard     - /api/admin/config
    - lib/publishing/*   - SearchInput        - /api/admin/mutations
    - lib/content/*      - Drawer / Sheet     - /api/analytics
           │                    │                    │
           └────────────────────┼────────────────────┘
                                ▼
                [架构防漂移门禁 schema-drift.test.ts]
                双向断言 schema.sql 与 database.types.ts
                                │
                                ▼
                          100% 通过 ➔ 允许部署
```

1. **确定性与高执行速度**：204 项测试全部在 **4.3 秒以内**完成，杜绝任何随机性 Flaky 测试；
2. **多层防御矩阵**：自底向上涵盖领域算法、UI 组件渲染、无障碍键盘导航、API 限流与鉴权拦截；
3. **架构防漂移门禁**：数据库 DDL 发生变化时，强制要求同步更新 TypeScript 类型契约，否则门禁直接阻断；
4. **真实交互模拟**：使用 React Testing Library 模拟真实用户点击、输入、弹层展开与后退恢复。

---

## 2. 测试套件分类字典 (46 个测试套件)

### 2.1 核心领域与算法测试 (`tests/lib/`)

| 测试文件 | 覆盖模块 | 核心断言与契约检验 |
| :--- | :--- | :--- |
| **`tests/lib/ai/ask.test.ts`** | `lib/ai/ask.ts` | 完整问答流水线编排、精确问答 LRU 缓存与唯一 Session ID 生成。 |
| **`tests/lib/ai/eval.test.ts`** | `lib/ai/eval.ts` | 36+ 题黄金基准测试集执行、6 大红线指标计算与动态用例扩展。 |
| **`tests/lib/ai/ground.test.ts`** | `lib/ai/ground.ts` | 严格归因算法、证据不足时拒答与单句级精确出处绑定。 |
| **`tests/lib/ai/policy.test.ts`** | `lib/ai/policy.ts` | 敏感词检测、幻觉词库拦截与风控策略校验。 |
| **`tests/lib/ai/prompt.test.ts`** | `lib/ai/prompt.ts` | 角色设定组装、上下文注入与防越狱 Prompt 约束。 |
| **`tests/lib/ai/provider.test.ts`** | `lib/ai/provider.ts` | 智谱 AI / OpenAI / 兜底 Mock 模型请求封装与重试机制。 |
| **`tests/lib/ai/retrieve.test.ts`** | `lib/ai/retrieve.ts` | 混合检索排序（字面分词 + 向量余弦）与安全阈值截断。 |
| **`tests/lib/ai/service.test.ts`** | `lib/ai/service.ts` | 生产问答服务生命周期管理与单例缓存。 |
| **`tests/lib/ai/session.test.ts`** | `lib/ai/session.ts` | 问答会话 Schema 校验、前端历史恢复与状态防篡改。 |
| **`tests/lib/content/content.test.ts`** | `lib/content/content.ts` | 知识库仓储接口实现与元数据提取。 |
| **`tests/lib/content/schema.test.ts`** | `lib/content/schema.ts` | 页面与块级数据模型严格校验。 |
| **`tests/lib/content/search.test.ts`** | `lib/content/search.ts` | 本地搜索索引分词、权重计算与高亮摘要提取。 |
| **`tests/lib/publishing/assets.test.ts`** | `lib/publishing/assets.ts` | 图片资源哈希镜像、并发上传控制与 403 容灾降级。 |
| **`tests/lib/publishing/auth.test.ts`** | `lib/publishing/auth.ts` | Admin 会话 Token 签名验证、Cookie 解析与单 IP 限流。 |
| **`tests/lib/publishing/blocks.test.ts`** | `lib/publishing/blocks.ts` | Notion 富文本块转换（标题、列表、引用、代码块、Callout 等）。 |
| **`tests/lib/publishing/client.test.ts`** | `lib/publishing/client.ts` | Notion 官方 API Client 封装与分页遍历。 |
| **`tests/lib/publishing/index.test.ts`** | `lib/publishing/index.ts` | 发版管线入口逻辑与参数编排。 |
| **`tests/lib/publishing/job-store.test.ts`**| `lib/publishing/job-store.ts` | 异步发版任务状态流转与并发互斥锁。 |
| **`tests/lib/publishing/notion.test.ts`** | `lib/publishing/notion.ts` | Notion 页面树递归抓取与结构扁平化。 |
| **`tests/lib/publishing/page.test.ts`** | `lib/publishing/page.ts` | 页面元数据组装与 URL 别名映射。 |
| **`tests/lib/publishing/pipeline.test.ts`**| `lib/publishing/pipeline.ts` | 全量同步发版流水线、进度上报与回滚执行。 |
| **`tests/lib/publishing/route.test.ts`** | `lib/publishing/route.ts` | 发版命令解析与入参白名单过滤。 |
| **`tests/lib/publishing/schema.test.ts`** | `lib/publishing/schema.ts` | 知识库发布数据契约与快照校验。 |
| **`tests/lib/publishing/store.test.ts`** | `lib/publishing/store.ts` | 快照读写与本地/云端存储适配。 |
| **`tests/lib/publishing/version.test.ts`** | `lib/publishing/version.ts` | 版本指针管理、原子切换与 6 版本留存清理。 |
| **`tests/lib/feishu.test.ts`** | `lib/feishu.ts` | 飞书工单群消息结构拼装与发送。 |
| **`tests/lib/database.schema-drift.test.ts`**| `database.types.ts` | **核心门禁**：双向断言 DDL SQL 与 TS 类型契约防漂移。 |

### 2.2 UI 组件与交互测试 (`tests/components/`)

| 测试文件 | 覆盖组件 | 核心断言与契约检验 |
| :--- | :--- | :--- |
| **`tests/components/admin-dashboard.test.tsx`** | `AdminTabs`, `VersionTimeline` | 控制台 Tab 切换、版本时间线渲染、一键恢复与彻底删除按钮交互。 |
| **`tests/components/tokens.test.tsx`** | `tokens.json` | 强制断言全站设计令牌色值、字号、间距与圆角类名合法有效。 |
| **`tests/components/search.test.tsx`** | `SearchInput`, `SearchResults` | 搜索框输入、空状态、结果高亮与路由跳转。 |
| **`tests/components/drawer.test.tsx`** | `Drawer` | 移动端目录树抽屉滑出、展开折叠与焦点恢复。 |
| **`tests/components/sheet.test.tsx`** | `AskSheet` | AI 问答弹层交互、逐句观点归因渲染与出处角标点击。 |
| **`tests/components/article.test.tsx`** | `ArticleRenderer`, `BlockRenderer` | 富文本块高保真渲染、表格/代码块/折叠列表展示。 |
| **`tests/components/form.test.tsx`** | `SharedAskEntry` | 首页与文档页胶囊问答入口状态同步与键盘交互。 |

### 2.3 页面渲染与 API 路由测试 (`tests/pages/` & `tests/api/`)

| 测试文件 | 覆盖页面 / 路由 | 核心断言与契约检验 |
| :--- | :--- | :--- |
| **`tests/pages/home.test.tsx`** | `/` 首页 | 场景导航卡、推荐文章与问答入口首屏渲染。 |
| **`tests/pages/doc.test.tsx`** | `/docs/[slug]` | 文档详情页 SSG 静态属性组装与元数据解析。 |
| **`tests/pages/search.test.tsx`** | `/search` | 搜索结果列表服务端渲染与空查询提示。 |
| **`tests/api/admin-auth.test.ts`** | `/api/admin/auth` | 登录口令校验、Cookie 签发与登出清理。 |
| **`tests/api/admin-inspect.test.ts`**| `/api/admin/ask/inspect` | 白盒探针权限拦截与数据结构返回。 |
| **`tests/api/admin-evals.test.ts`** | `/api/admin/evals/*` | 评测用例拉取、飞轮用例入库与在线评测调度。 |
| **`tests/api/admin-mutations.test.ts`**| `/api/admin/*` | **全域写入门禁**：8大公共配置修改、工单流转归档、发版控制。 |
| **`tests/api/client-public.test.ts`**| `/api/*` | **学生端公共接口**：数据埋点上报、反馈提交与全站配置读取。 |
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
│ 3. 后台数据写入  │ admin-mutations  │ 覆盖全部8大配置保存与工单流转安全│
│ 4. 前台公共上报  │ client-public    │ 覆盖埋点体积防御与反馈提交安全性 │
│ 5. 移动端触控保障│ components/*     │ 确保所有按钮/链接均满足 44px+ 热区│
│ 6. 闪电级 CI 门禁│ 46 套件 / 204 单测│ 4.3秒内跑完全部断言，秒级阻断回归│
│ 7. 极端网络容灾  │ assets.test.ts   │ 验证 403 历史死链秒级降级不阻塞发版│
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
