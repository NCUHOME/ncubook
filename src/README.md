# UI 组件系统与设计契约设计说明 (src/)

本文档全面阐述「此间 (NCU Book)」前端 UI 组件系统、设计契约体系、设计令牌（Design Tokens）对接、无障碍标准与组件字典。

---

## 1. 核心设计原则

全站 UI 严格遵循《设计系统与组件契约》及《仓库开发宪法》，拒绝浮夸过度设计，专注于提供极致流畅的校园移动端阅读与问答体验。

```text
设计令牌 (tokens.json) ──► Tailwind CSS 语义类 (globals.css)
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │      src/components     │
                    ├─────────────────────────┤
                    │ 1. primitives/ (原子基建)│
                    │ 2. article/    (文章渲染)│
                    │ 3. ask/        (AI 问答) │
                    │ 4. search/     (全文检索)│
                    │ 5. admin/      (管理控制)│
                    └─────────────────────────┘
```

1. **“编辑黑白”高级排版美学**：采用高对比度、清晰克制的水墨黑白为主基调，依靠排版层级、字重与微间距构建视觉呼吸感；
2. **严禁 Ad-hoc 硬编码样式**：严禁在组件中编写任意私有色值、非标圆角或随意间距，所有可见样式必须严格对齐 [`docs/design/tokens.json`](file:///c:/chengxu/ncubook/docs/design/tokens.json) 语义令牌；
3. **44px+ 移动端触控契约**：所有可交互控件（按钮、链接、输入框、Tab 切换项）最小触控区域必须 $\ge 44\text{px}$（使用 `.tap-target` 工具类）；
4. **统一 Lucide 图标规范**：所有图标必须来自 **Lucide React**，严禁引入第三方图标字体或私有 SVG；
5. **无障碍与焦点管理**：所有抽屉与弹层均遵循 WAI-ARIA 规范，支持键盘 `Esc` 退出并自动还原触发源焦点（`.focus-ring`）。

---

## 2. 组件体系架构字典

组件按业务职责划分为 5 大子目录，层级清晰，职责单一：

### 2.1 底层基础原子 (`src/components/primitives/`)

| 组件文件 | 组件名称 | 核心职责与交互特性 |
| :--- | :--- | :--- |
| **`header.tsx`** | `AppHeader` | 全局统一移动端顶部导航栏。**文档页**：左返回（`←`）、中板块进度+标题、右目录（`☰`）+搜索（`Q`）；**首页**：左品牌、右目录+搜索；严格保障 44px 舒适热区。 |
| **`drawer.tsx`** | `Drawer` | 移动端轻量级双层抽屉，承载 6 大板块与篇目层级树，支持平滑手势关闭与上级返回。 |
| **`sheet.tsx`** | `Sheet` | 移动端底部滑出弹层（Bottom Sheet），承载 AI 问答交互，支持平滑手势展开与收起。 |
| **`form.tsx`** | `Input` / `Button` | 基础表单输入框与按钮，内置 44px 触控热区与标准焦点环状态。 |
| **`citation.tsx`** | `CitationBadge` | 结构化观点出处角标（如 `[1]` / `¹`），点击触发 1.6s 墨蓝呼吸高亮（Flash Highlight）并平滑定位至原文段落。 |

### 2.2 文章阅读器 (`src/components/article/`)

| 组件文件 | 组件名称 | 核心职责与交互特性 |
| :--- | :--- | :--- |
| **`article-renderer.tsx`** | `ArticleRenderer` | 文章主容器，负责渲染顶部阅读进度条、标题元数据、更新时间、正文、文末上下篇导航卡片与「有帮助/没帮助」反馈条。 |
| **`block-renderer.tsx`** | `BlockRenderer` | 富文本块递归解析器，精确还原 Notion 标准富文本块（文本段落、标题、折叠列表、表格、代码高亮、引用 Callout 等）。**语义支持**：红底警示（`.notion-callout-red`）、蓝底指引（`.notion-callout-blue`）、黄页电话一键呼叫/复制 Toast，每个块带有 `id="b-xxx"` 稳定锚点。 |
| **`table-of-contents.tsx`** | `TableOfContents` | 文章大纲目录，解析正文 H2/H3 标题并生成平滑滚动链接。 |

### 2.3 可溯源 AI 问答 (`src/components/ask/`)

| 组件文件 | 组件名称 | 核心职责与交互特性 |
| :--- | :--- | :--- |
| **`provider.tsx`** | `AskProvider` | 全局问答状态机与 Context，负责处理 API 交互、请求中状态、错误恢复与 `sessionStorage` 本地会话持久化。 |
| **`entry.tsx`** | `AskEntry` | 全局问答入口。**首页**：胶囊提问框（白底浅灰线，右侧吉祥物触发器）；**文档页**：**50px 纯圆形固定白底吉祥物悬浮球**（`right: 18px; bottom: 22px;` 脱离正文滚动流），点击自动感知当前篇章上下文。 |
| **`sheet.tsx`** | `AskSheet` | 问答弹层全视图，展示结构化回答卡片、逐句观点归因、站内引用链接与免责声明。 |
| **`claims.tsx`** | `ClaimsList` | 结构化观点分解列表，渲染事实断言与对应的出处角标。 |

### 2.4 搜索交互 (`src/components/search/`)

| 组件文件 | 组件名称 | 核心职责与交互特性 |
| :--- | :--- | :--- |
| **`search-input.tsx`** | `SearchInput` | 带防抖机制的搜索输入框，支持一键清空与回车即时检索，内置热门快捷搜索 Chips（校内出行、防诈指南、保卫电话、绩点、选课等）。 |
| **`search-results.tsx`** | `SearchResults` | 结构化展示匹配文章、匹配段落文字摘要、所属路径面包屑、**匹配关键词加粗高亮 (`<mark class="search-highlight">`)** 与精准路由跳转。 |
| **`quick-filters.tsx`** | `QuickFilters` | 搜索结果快速分类标签过滤组件。 |

### 2.5 管理控制台 (`src/components/admin/`)

| 组件文件 | 组件名称 | 核心职责与交互特性 |
| :--- | :--- | :--- |
| **`admin-tabs.tsx`** | `AdminTabs` | 模块切换导航器，支持 URL Hash 记忆当前激活选项卡。 |
| **`sync-panel.tsx`** | `SyncPanel` | Notion 文章更新控制台，提供进度百分比、预检开关、强制解锁与实时日志终端。 |
| **`version-timeline.tsx`** | `VersionTimeline` | 版本历史与恢复时间线，展示当前生效版本与历史版本，提供一键恢复与彻底删除能力。 |
| **`eval-dashboard.tsx`** | `EvalDashboard` | AI 问答质量评测大盘，量化计算出处归因率、拒答率、事实符合率与防幻觉指标。 |
| **`qa-playground.tsx`** | `QAPlayground` | 问答测试沙盒，提供检索召回、Prompt 注入与观点归因的白盒链路排查。 |
| **`logout-button.tsx`** | `LogoutButton` | 管理员退出登录按钮。 |

---

## 3. 系统能力矩阵（组件层能做什么）

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        组件系统核心能力全景                            │
├──────────────────┬──────────────────┬──────────────────────────────────┤
│ 业务场景         │ 核心组件支持     │ 交互表现与用户体验               │
├──────────────────┼──────────────────┼──────────────────────────────────┤
│ 1. 移动端单手操作│ AppHeader+Drawer │ 44px 舒适热区，轻扫滑出板块目录  │
│ 2. 原生富文本阅读│ BlockRenderer    │ 完美还原表格/折叠列表/代码块     │
│ 3. 观点溯源穿梭  │ CitationBadge    │ 点击角标精准平滑跳转原文段落     │
│ 4. 问答会话自愈  │ AskProvider      │ 查阅出处后返回无缝恢复回答弹层   │
│ 5. 搜索即搜即显  │ SearchInput      │ 防抖触发，快速展示高亮匹配切片   │
│ 6. 运维可视化掌控│ SyncPanel+Timeline│ 实时百分比进度，版本一键切线删除 │
└──────────────────┴──────────────────┴──────────────────────────────────┘
```

---

## 4. 开发调试与操作指南

### 4.1 引入新组件的规范流程
1. 核对 [`docs/design/设计系统与组件契约.md`](file:///c:/chengxu/ncubook/docs/design/设计系统与组件契约.md) 确认是否有现有基础组件可复用；
2. 确保样式全部由 `tokens.json` 衍生而来，不得新增任意 class；
3. 为新增组件在 `tests/components/` 编写对应的渲染与交互单元测试。

### 4.2 运行组件单元测试
```bash
# 运行全量组件交互与渲染测试
npx vitest run tests/components/

# 运行设计令牌一致性断言
npx vitest run tests/components/tokens.test.tsx
```

---

## 5. 质量门禁与规范契约

- **设计令牌门禁**：`tests/components/tokens.test.tsx` 强制断言所有令牌类名合法有效；
- **交互与无障碍断言**：针对弹层打开、关闭、焦点还原、键盘导航均有确定性自动化测试保证。
