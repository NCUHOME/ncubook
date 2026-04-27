# 小家园知识运营 Agent 开发计划 v1

日期：2026-04-22

关联 PRD：`portfolio/xiaojiayuan-knowledge-ops-agent-prd-v1.md`

目标：在现有 ncubook AI 问答能力上，最小成本跑通“提问、记录、缺口识别、任务生成、人工审核、重新入库、再次回答变好”的知识运营闭环。

## 0. 当前项目基线

现有能力：

- Docusaurus 文档站：`docs/`
- 全局 AI 助手：`src/components/AiAssistant/index.jsx`
- 首页提问入口：`src/pages/index.tsx`
- 页面反馈：`src/components/PageFeedback/index.tsx`
- AI 问答 API：`ncubook-api/app/api/chat/route.ts`
- 文档向量入库：`ncubook-api/scripts/ingest.ts`
- Supabase 客户端：`ncubook-api/lib/supabase.ts`
- 模型封装：`ncubook-api/lib/gemini.ts`

已修复的展示风险：

- API 构建失败：修复 `route.ts` 中中文弯引号导致的语法错误。
- Docusaurus 重复路由：删除短版 `docs/about.md`，保留内容更完整的 `docs/about.mdx`。
- Next workspace root 警告：在 `ncubook-api/next.config.ts` 中设置 `outputFileTracingRoot`。

剩余非阻断提示：

- `ncubook-api` 构建时提示未安装 ESLint。该提示不影响 build，可后续单独处理。

## 1. 开发原则

- 先跑通闭环，再追求复杂自动化。
- 不引入多 Agent 架构，v1 保持单 Agent + 工具链。
- 不自动发布文档，所有正文修改必须人工审核。
- 数据结构优先，避免只做前端展示。
- 每个阶段都要能形成作品集截图或 Demo 片段。

## 2. 里程碑总览

### M0：稳定现有项目

目标：保证现有前端和 API 能构建，便于后续展示。

状态：已完成。

验收：

- `pnpm build` 通过。
- `cd ncubook-api && npm run build` 通过。
- 无 Docusaurus 重复路由警告。
- 无 API TypeScript 编译失败。

### M1：问题日志 Query Log

目标：每一次 AI 问答都被结构化记录，后续才能做运营分析和缺口识别。

预计工作量：0.5 到 1 天。

### M2：内容缺口识别 Gap Detector

目标：Agent 不只回答，还能判断本次问题是否被知识库覆盖。

预计工作量：1 到 1.5 天。

### M3：运营任务生成 Ops Task

目标：把未覆盖、点踩、需官方确认的问题转成可处理的内容任务。

预计工作量：1 到 2 天。

### M4：运营看板 Dashboard

目标：维护者能看到问题日志、内容缺口和待处理任务。

预计工作量：1.5 到 2.5 天。

### M5：Eval Set 与批量评测

目标：用 50 条校园问题评估 Agent 的回答、引用和缺口识别能力。

预计工作量：1.5 到 2 天。

### M6：作品集 Demo 打磨

目标：准备 3 分钟演示链路和一页 Case Study 所需材料。

预计工作量：0.5 到 1 天。

## 3. M1：问题日志 Query Log

### 3.1 数据库变更

新增 Supabase 表：`query_logs`

字段建议：

```sql
create table if not exists query_logs (
  id bigserial primary key,
  created_at timestamptz default now(),
  user_question text not null,
  entry_source text,
  current_path text,
  retrieved_documents jsonb,
  retrieved_similarity jsonb,
  answer text,
  answer_has_citation boolean default false,
  latency_ms integer,
  model_name text,
  coverage_status text,
  feedback text,
  error_message text
);
```

索引：

```sql
create index if not exists query_logs_created_at_idx on query_logs(created_at desc);
create index if not exists query_logs_current_path_idx on query_logs(current_path);
create index if not exists query_logs_coverage_status_idx on query_logs(coverage_status);
```

文件：

- 新增：`ncubook-api/supabase-agent-migration.sql`

### 3.2 API 改造

改造文件：

- `ncubook-api/app/api/chat/route.ts`

需要做：

- 在请求开始时记录 `startedAt`。
- 从请求 body 接收 `entrySource`。
- 保存用户问题、当前页面、检索文档、相似度、回答、耗时。
- 因当前接口是流式输出，需要先累积完整 answer，再写日志。

实现建议：

- v1 可以暂时保留流式体验，但在服务端用 `result.text` 或等价方式拿完整结果后写日志；如果 AI SDK 当前流式响应不方便同时记录完整文本，可以先新增非流式内部生成函数，优先保证日志闭环。
- 如果保留现在的 `toTextStreamResponse()` 难以拦截完整文本，则先记录问题、检索结果、coverage_status、latency 和错误；answer 字段后续再补。

### 3.3 前端改造

改造文件：

- `src/components/AiAssistant/index.jsx`
- `src/pages/index.tsx`
- `src/theme/SearchBar/index.js`

需要做：

- 前端发请求时带上 `entrySource`。
- 首页入口：`home_ask`
- 快捷问题：`quick_chip`
- 文档页悬浮输入：`assistant_input`
- 搜索无结果转 AI：`search_to_ai`

### 3.4 验收标准

- 发起一次 AI 提问后，Supabase `query_logs` 有记录。
- 记录包含 user_question、current_path、retrieved_documents、latency_ms。
- 首页、文档页、搜索入口能区分 entry_source。

## 4. M2：Gap Detector 内容缺口识别

### 4.1 覆盖状态定义

先实现 6 类：

- `covered`
- `partial`
- `missing`
- `outdated_risk`
- `official_required`
- `unclear_query`

### 4.2 规则优先级

第一层：硬规则

- 检索文档数为 0：`missing`
- 最高相似度低于阈值：`missing`
- 问题包含“政策、奖学金、处分、收费、转专业条件、成绩、考试资格、什么时候发”等关键词：候选 `official_required`
- 问题长度太短或指代不明：候选 `unclear_query`

第二层：LLM 分类

新增函数：

- `classifyCoverageStatus(question, documents, currentPath)`

建议文件：

- 新增：`ncubook-api/lib/gap-detector.ts`

输出 JSON：

```ts
type CoverageResult = {
  status: "covered" | "partial" | "missing" | "outdated_risk" | "official_required" | "unclear_query";
  reason: string;
  confidence: number;
  recommendedPage?: string;
};
```

### 4.3 接入点

在 `route.ts` 中：

1. 完成向量检索。
2. 调用 `classifyCoverageStatus`。
3. 将 `coverage_status` 写入 Query Log。
4. 如果状态不是 `covered`，在回答规则中要求 Agent 承认不确定或提示需核实。

### 4.4 验收标准

- “学分绩点怎么算”应返回 `covered`。
- “青山湖校区电动车在哪里充电”在无资料时应返回 `missing` 或 `partial`。
- “奖学金什么时候发”应返回 `official_required` 或带官方确认提示。
- 过短问题如“这个呢”应返回 `unclear_query`。

## 5. M3：运营任务 Ops Task

### 5.1 数据库变更

新增表：`gap_tasks`

```sql
create table if not exists gap_tasks (
  id bigserial primary key,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  title text not null,
  source_query_log_id bigint references query_logs(id),
  user_question text not null,
  category text,
  gap_type text not null,
  recommended_page text,
  suggested_outline text,
  verification_needed text,
  priority text default 'medium',
  status text default 'open',
  assignee text,
  closed_at timestamptz,
  close_reason text
);
```

索引：

```sql
create index if not exists gap_tasks_status_idx on gap_tasks(status);
create index if not exists gap_tasks_gap_type_idx on gap_tasks(gap_type);
create index if not exists gap_tasks_created_at_idx on gap_tasks(created_at desc);
```

### 5.2 任务生成逻辑

新增函数：

- `shouldCreateGapTask(queryLog, coverageResult, feedback?)`
- `generateGapTask(question, coverageResult, documents)`

建议文件：

- 新增：`ncubook-api/lib/ops-task-generator.ts`

生成条件：

- `coverage_status` 是 `missing`
- `coverage_status` 是 `partial`
- `coverage_status` 是 `outdated_risk`
- `coverage_status` 是 `official_required`
- 用户点踩 AI 回答

去重策略：

- v1 简单按 `user_question` 相似文本去重。
- 如果 7 天内已有同类 open task，则不重复创建，只更新频次字段。
- v1 若不做频次字段，可以先在任务标题中保留原问题，人工处理。

### 5.3 反馈接入

当前点赞/点踩只存在前端状态，未写入后端。

新增 API：

- `POST /api/feedback`

建议文件：

- 新增：`ncubook-api/app/api/feedback/route.ts`

请求体：

```json
{
  "queryLogId": 123,
  "feedback": "up" | "down",
  "reason": "optional text"
}
```

问题：

- 现有 chat response 没有返回 queryLogId。

处理方案：

- v1 可以先让 chat API 返回响应 header：`x-query-log-id`。
- 前端读取 header 并绑定到 assistant 消息。
- 用户点踩时调用 `/api/feedback`。

### 5.4 验收标准

- `missing` 问题能生成 gap task。
- 用户点踩后能更新 query log feedback。
- 点踩问题可以生成或关联 gap task。
- 任务包含标题、缺口类型、推荐页面、建议大纲。

## 6. M4：运营看板 Dashboard

### 6.1 页面位置

推荐先做在 API 子项目中，避免影响公开 Docusaurus 站点。

新增页面：

- `ncubook-api/app/dashboard/page.tsx`
- `ncubook-api/app/dashboard/tasks/page.tsx`
- `ncubook-api/app/dashboard/logs/page.tsx`

v1 不做复杂权限，但部署时建议通过环境变量隐藏或加简单访问 token。

### 6.2 API

新增：

- `GET /api/admin/logs`
- `GET /api/admin/tasks`
- `PATCH /api/admin/tasks/:id`
- `GET /api/admin/metrics`

若 Next App Router 动态路径实现复杂，v1 可用：

- `PATCH /api/admin/tasks`，body 带 `id`。

### 6.3 看板模块

Dashboard 首页：

- AI 提问总数
- 今日提问数
- 点踩率
- covered / partial / missing / official_required 分布
- open gap tasks 数量
- 最近 10 条高优先级任务

Tasks 页面：

- 任务列表
- 状态筛选
- gap_type 筛选
- 推荐页面
- suggested_outline
- 状态更新：open、in_progress、closed、official_required

Logs 页面：

- 问题列表
- 当前页面
- coverage_status
- feedback
- latency_ms
- 查看检索片段

### 6.4 验收标准

- 维护者能看到最近问题日志。
- 维护者能看到待处理 gap tasks。
- 维护者能关闭任务并填写关闭原因。
- Dashboard 能提供至少 4 个核心指标。

## 7. M5：Eval Set 与批量评测

### 7.1 文件结构

新增：

- `ncubook-api/evals/cases/campus-qa-v1.json`
- `ncubook-api/evals/run-eval.ts`
- `ncubook-api/evals/results/`

### 7.2 Eval case 格式

```json
{
  "id": "academic_gpa_001",
  "question": "学分绩点怎么算？",
  "category": "academics",
  "expectedSourcePaths": ["/docs/academics/credits-gpa"],
  "expectedCoverageStatus": "covered",
  "shouldEscalate": false,
  "shouldCreateTask": false,
  "answerMustContain": ["绩点", "学分"]
}
```

### 7.3 评测维度

先做可人工复核的半自动评测：

- source_hit：是否引用期望页面。
- coverage_status_hit：覆盖状态是否正确。
- escalation_hit：是否正确提示官方渠道。
- task_hit：是否应该生成任务。
- answer_contains：是否包含关键要点。

输出：

- 总通过率
- 引用命中率
- 缺口识别准确率
- 敏感问题升级准确率
- 失败样例列表

### 7.4 验收标准

- 至少 50 条 eval case。
- 能一键运行 `npm run eval`。
- 输出 JSON 和 Markdown 两种报告。
- 报告能用于作品集截图。

## 8. M6：作品集 Demo 打磨

### 8.1 必备素材

- 首页 AI 提问截图。
- AI 回答带来源截图。
- Query Log 后台截图。
- Gap Task 详情截图。
- Eval 报告截图。
- Workflow Map。

### 8.2 3 分钟 Demo 脚本

1. 问一个已有资料覆盖的问题，展示可溯源回答。
2. 问一个资料缺失的问题，展示 Agent 承认缺口。
3. 切到后台，看 Query Log 和自动生成的 Gap Task。
4. 展示任务建议大纲和人工审核边界。
5. 展示 Eval 报告，说明如何评估准确率和缺口识别。

### 8.3 验收标准

- Demo 能在 3 分钟内讲完。
- 面试官能看懂：这不是单纯 chatbot，而是知识运营闭环。
- 简历、PRD、Demo、代码仓库叙事一致。

## 9. 推荐开发顺序

第一轮，优先跑通数据闭环：

1. 新建 `query_logs` 表。
2. chat API 写入 Query Log。
3. 前端传 entrySource。
4. 新建 `gap-detector.ts` 并写 coverage_status。
5. 新建 `gap_tasks` 表。
6. missing / partial 问题自动生成任务。

第二轮，补维护者体验：

1. Dashboard 首页。
2. Logs 页面。
3. Tasks 页面。
4. 任务状态更新。
5. 点踩反馈接入 `/api/feedback`。

第三轮，补评测和作品集：

1. 写 50 条 eval case。
2. 写 `run-eval.ts`。
3. 输出 eval report。
4. 录 Demo。
5. 写一页 Case Study。

## 10. 预计工作拆分

### Day 1

- 新建 Supabase migration。
- 实现 Query Log。
- 前端传 entrySource。
- 验证日志写入。

### Day 2

- 实现 Gap Detector。
- 接入 coverage_status。
- 调整回答 prompt：资料不足时承认缺口。
- 手工测试 10 个问题。

### Day 3

- 新建 Gap Task 表。
- 实现 Ops Task Generator。
- missing / partial 自动生成任务。
- 点踩反馈 API 初版。

### Day 4

- Dashboard 基础页。
- Logs 列表。
- Tasks 列表。
- 任务状态更新。

### Day 5

- Eval case 初版 50 条。
- 批量 eval 脚本。
- 生成 Markdown 报告。

### Day 6

- 修失败样例。
- 打磨 demo 链路。
- 截图和录屏。
- 准备一页作品集 Case Study。

## 11. 风险与降级方案

### 11.1 流式回答难以记录完整 answer

风险：当前 `toTextStreamResponse()` 直接返回流，服务端不容易拿到完整文本。

降级：

- v1 先记录问题、检索结果、coverage_status、latency。
- answer 字段允许为空。
- 后续再改成可 tee 的 stream 或非流式生成。

### 11.2 Dashboard 权限成本高

风险：做完整登录系统会拖慢 MVP。

降级：

- v1 使用环境变量 `ADMIN_TOKEN`。
- Dashboard 请求 admin API 时带 token。
- 或先只在本地跑 Dashboard，用于作品集录屏。

### 11.3 任务生成质量不稳定

风险：LLM 生成的任务标题或大纲不够稳定。

降级：

- 先用模板生成任务。
- LLM 只生成 suggested_outline。
- 任务状态必须人工确认。

### 11.4 Eval 自动判断不可靠

风险：自动评分误判。

降级：

- v1 只做规则评分 + 人工复核字段。
- 报告列出失败样例，不追求完全自动评分。

## 12. 完成后的求职表述

开发完成后，可在简历中写：

设计并开发南昌大学校园知识运营 Agent“小家园”，在已有校园手册和 RAG 问答基础上，新增问题日志、内容缺口识别、运营任务生成和评测体系，形成“学生提问、AI 回答、反馈归因、内容补全、重新入库”的知识库迭代闭环。通过 eval set 评估回答准确率、引用命中率、缺口识别率和敏感问题升级准确率，并将用户反馈转化为内容运营任务。

