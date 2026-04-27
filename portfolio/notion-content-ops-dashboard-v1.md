# 此间 Notion 内容运营后台 v1

## 目标

Notion 负责编辑和审核，Docusaurus 负责发布展示，`/admin` 负责官网抓取、质量反馈和同步状态。

这套后台不是普通文档库，而是一个校园信息运营中台：它要让你每天知道哪些内容要写、哪些要审、哪些过期、哪些同步失败，以及小家园问答暴露了哪些知识缺口。

## 数据库

### 1. 内容库

每一篇网页文档对应一条 Notion 页面，正文必须导入 Notion，才能真正编辑。

核心字段：

- `标题`
- `Slug`
- `分类`
- `状态`：初稿 / 待审核 / 已发布 / 需更新 / 暂停发布
- `优先级`：P0 / P1 / P2 / P3
- `目标路径`
- `同步到网页`
- `网页同步状态`：未同步 / 已同步 / 同步失败 / 部分同步
- `报错原因`
- `官方来源`
- `核验状态`：已核验 / 待核实 / 已过期 / 高风险
- `页面更新`
- `下次核验日期`
- `关联知识缺口`
- `负反馈次数`

### 2. 官网候选库

官网抓取后的信息先进入候选库，不直接改网页。

字段：

- `官网标题`
- `来源部门`
- `原文链接`
- `发布时间`
- `筛选结果`：忽略 / 观察 / 候选 / 已生成初稿 / 已合并
- `风险级别`：低 / 中 / 高
- `建议动作`：更新现有页 / 新增页面 / 暂不处理
- `建议关联页面`
- `AI 判断理由`
- `处理状态`

### 3. 知识缺口库

来自小家园问答的弱命中、负反馈和人工发现问题。

字段：

- `问题`
- `来源`：小家园问答 / 负反馈 / 弱命中 / 人工发现
- `状态`：open / triaged / in_progress / resolved / ignored
- `优先级`
- `关联页面`
- `处理方式`
- `样例问题`
- `处理说明`

### 4. 同步日志库

记录 Notion 和网页之间的导入、导出、构建和失败原因。

字段：

- `同步任务`
- `同步时间`
- `同步方向`：Docs → Notion / Notion → Docs / Build Check
- `状态`：成功 / 失败 / 部分成功
- `影响页面数`
- `失败页面`
- `错误类型`
- `错误详情`
- `是否已处理`

## 看板

### 今日工作台

每天先看这里。

应该包含：

- 待审核初稿
- 同步失败文档
- 高风险或待核实内容
- 新官网候选
- 负反馈最多页面

### 初稿队列

筛选：

- `状态 = 初稿`
- 或 `状态 = 待审核`

用途：

- AI 初稿进入这里
- 人工编辑 Markdown / Notion 正文
- 审核后改为 `已发布`

### 有报错的文档

筛选：

- `网页同步状态 = 同步失败`
- 或 `报错原因` 不为空

常见错误：

- Notion 块不支持
- 图片路径缺失
- MDX 语法错误
- 构建失败

### 需核验内容

筛选：

- `核验状态 = 待核实`
- 或 `核验状态 = 已过期`
- 或 `核验状态 = 高风险`
- 或 `下次核验日期 <= 今天`

适用于：

- 转专业
- 奖助学金
- 费用
- 名额
- 处分
- 医保
- 考试和学籍政策

### 官网候选处理

按 `筛选结果` 分组：

- 候选
- 观察
- 已生成初稿
- 已忽略

### 知识缺口回流

按 `状态` 分组：

- open
- triaged
- in_progress
- resolved
- ignored

### 已发布内容总览

用于维护网站结构：

- 哪些分类内容少
- 哪些页面长期未更新
- 哪些页面没有官方来源
- 哪些页面负反馈高

## 同步命令

先检查本地文档是否能转为 Notion 可编辑块：

```bash
pnpm notion:check
```

预览导入计划：

```bash
pnpm notion:plan
```

准备环境变量：

```bash
cp .env.notion.example .env.notion
```

然后填入：

```bash
NOTION_TOKEN=secret_xxx
NOTION_CONTENT_DATABASE_ID=b4a6ca28bad54096b1a0a9ff8cee0d15
```

试运行：

```bash
set -a && source .env.notion && set +a
pnpm notion:import:dry
```

正式把 `docs/` 正文导入 Notion：

```bash
set -a && source .env.notion && set +a
pnpm notion:import
```

从 Notion 预览导出回网页文档：

```bash
set -a && source .env.notion && set +a
pnpm notion:export:dry
```

正式从 Notion 导出回 `docs/`：

```bash
set -a && source .env.notion && set +a
pnpm notion:export
pnpm build
```

注意：`notion:export` 会写回 `docs/`，只导出 `同步到网页 = true` 且 `状态 = 已发布` 的页面。第一次正式导出前先跑 `notion:export:dry`。

## Trust Boundary

AI 可以做：

- 官网内容筛选
- 摘要
- 初稿
- 建议关联页面
- 标注风险字段

AI 不可以自动做：

- 发布网页
- 删除旧内容
- 修改高风险政策结论
- 把待核实信息写成确定结论

这些必须人工审核后再发布。

## 当前实现状态

- 内容库字段已补齐，支持初稿、审核、核验、同步状态和报错追踪。
- 本地已新增 `scripts/notion-content-sync.mjs`，可以把 40 篇 `docs/` 文档转换为 Notion 可编辑块。
- 同一脚本已支持 `Notion → Docs` 导出，作为 Notion 编辑后的发布通道。
- 本地已新增 `scripts/test-notion-content-sync.mjs`，覆盖标题、元信息、MDX 清理、块转换和 Markdown 回转。
- 需要 `NOTION_TOKEN` 才能从本地脚本批量写入 Notion 正文。
