# 小家园 Agent Trust / Eval / Ops 闭环

## 目标

小家园不是只回答问题的 chatbot，而是一个可以被运营、被评估、被迭代的校园知识 Agent。每次回答都要留下可追踪信号：检索质量、来源数量、用户反馈、是否形成知识缺口。

## Trust Boundary

Agent 可以直接回答：

- 校园流程说明、资料位置、经验型建议。
- 已在知识库命中的低风险问题。
- 当前页面总结和站内资料导航。

Agent 必须提示核实：

- 时间、金额、地点、政策条件等可能变化的信息。
- 转专业、奖学金、补考重修、保研等影响学生权益的问题。
- 检索状态为 `weak` 或 `none` 的回答。

Agent 不能直接执行：

- 退款、改地址、发券、账号查询、密码处理。
- 涉及个人隐私或财务权益的动作。
- 替用户提交正式申请、修改官方记录。

这些问题应进入“人工确认 / 官方入口 / 信息缺口”流程，而不是让模型编造确定答案。

## Logging

每次 `/api/chat` 调用记录到 `agent_query_logs`：

- `question`
- `current_path`
- `retrieval_state`
- `source_count`
- `max_similarity`
- `top_sources`
- `latency_ms`

弱命中或未命中会写入 `agent_knowledge_gaps`，作为后续知识库补全任务。

数据库迁移使用：

`ncubook-api/supabase-agent-ops-migration.sql`

不要为了 Agent 运营表直接整份执行旧的 `supabase-migration.sql`，旧文件包含历史向量维度修复逻辑。

## Feedback

页面和 Agent 回答都写入 `agent_feedback`：

- 文档页：记录页面路径和 `helpful / not_helpful`
- Agent 回答：记录 `query_log_id`、问题、回答摘要和反馈
- 运营台统计近 7 天反馈总量、正向反馈、负向反馈

负向反馈下一步可进入人工复盘：判断是知识库缺失、检索失败、提示词问题，还是用户意图超出边界。

## Feishu Base Sync

飞书反馈后台：

`https://ncuhomer.feishu.cn/wiki/QFvewamk0i5MWvkI8zVcDxWcnPb?table=tbllSr5HwymQ2YAq&view=vewFx874nB`

解析结果：

- Base：`生存手册反馈后台`
- Base token：`EgvkbmspHaTCdes74AvcsL64nGg`
- Table：`tbllSr5HwymQ2YAq`
- View：`vewFx874nB`

同步规则：

- 用户点“没帮助”时，先写入 Supabase，再由本地同步脚本推送到飞书反馈后台。
- 新知识缺口产生时，先写入 Supabase，再由本地同步脚本推送到飞书反馈后台。
- “有帮助”只保存在 Supabase 作为指标，不进入飞书处理队列。

字段映射：

- `来源（自动填写）`：`AI` 或 `文档页`
- `问题类型 （必填）`：AI 负反馈为 `AI 回答不够准确`；文档负反馈为 `内容有误 / 过时`；知识缺口按原因映射到 `找不到想要的内容` 或 `信息不够详细`
- `页面（自动填写）`：用户所在页面
- `问题（自动填写）`：用户问题或页面路径
- `具体问题描述 (选填)`：query log、回答摘要、触发原因等自动拼接
- `你希望补充哪方面内容 (选填)`：自动生成处理建议

当前采用“Supabase 作为事实源 + 本地用户身份同步到飞书”的模式。原因是这张 Base 已验证支持用户身份写入，但应用 / bot 身份没有可用协作权限。

本地同步方式：

```bash
cd ncubook-api
npm run sync:feishu
```

要求：

- 本地已用 `lark-cli` 登录飞书用户身份
- `.env.local` 中已配置 `SUPABASE_URL` 和 `SUPABASE_SERVICE_ROLE_KEY`
- `LARK_FEEDBACK_BASE_TOKEN` / `LARK_FEEDBACK_TABLE_ID` 可直接复用默认值

## Eval Set

初版评测集在：

`ncubook-api/evals/cases/campus-qa-v1.json`

覆盖类型：

- 普通知识问答
- 当前页面总结
- 时间/金额/政策类高风险问题
- 弱命中和未知问题
- 隐私、退款、改地址、发券等不可直接执行动作

运行方式：

```bash
cd ncubook-api
npm run eval
```

评测脚本会检查：

- API 是否成功
- 是否有回答
- 是否包含 `### 信息来源`
- 是否包含 `### 继续追问`
- 是否返回 query log id
- 是否返回 retrieval state
- 是否提到关键术语
- 高风险问题是否出现核实、官方、人工、确认、不能直接等边界提示

## Metrics

运营台 `/ops` 当前关注：

- 近 7 天提问量
- 弱命中或未命中数量
- 开放知识缺口数量
- 用户反馈量
- 没帮助反馈量
- 平均响应耗时

下一版可以增加：

- 自动解决率
- 升级人工准确率
- 知识缺口平均解决时长
- 负向反馈归因
- Eval pass rate 趋势

## Failure Analysis

每周从三个入口找失败样本：

- `agent_query_logs` 中 `weak / none`
- `agent_knowledge_gaps` 中高频 open gap
- `agent_feedback` 中 `not_helpful`

每条失败样本归因到：

- 知识库缺失
- 文档过期
- 检索召回错误
- 回答格式不合规
- Trust boundary 没守住
- 用户问题超出产品范围

然后决定下一版动作：补文档、改切片、调阈值、改提示词、加人工确认入口，或明确拒答范围。
