# Tasks：EdgeOne 生产切换与 DeepSeek V4 Flash

状态：已批准，2026-07-14。

- [ ] E0.1 冻结并审阅 Gate E requirements、design、tasks、acceptance 与 approval。
- [ ] E1.1 先写失败测试：零相关词法候选被过滤；无 embedding provider 时可召回相关来源；无关问题返回 insufficient。
- [ ] E1.2 为 RPC 增加最低词法相关度过滤，新增 answerable/unanswerable 中文检索评测并验证低分过滤率、recall@8 与最终 abstention 目标。
- [ ] E1.3 拆分 chat 与可选 embedding provider 配置，模型固定 `deepseek-v4-flash` 并显式关闭 thinking。
- [ ] E1.4 更新 `.env.example`、README 与运维文档；移除 Gate E 对 Notion/publisher 生产变量的要求，确认 Key 不在 Git diff/build 输出中。
- [ ] E2.1 运行 AI provider、retrieval、grounding、route 单测与答案评测。
- [ ] E2.2 增加真实 DeepSeek smoke：按固定 5 问题、1 次 warm-up、20 次 warm 请求和 3 次冷启动验证 answerable grounded success、unanswerable abstention、citation anchor、active contentVersion 和延迟；通过前保持 shadow。
- [ ] E2.3 运行 typecheck、全量单测、production build 和非视觉 E2E。
- [ ] E3.1 将功能分支推送 GitHub，并在现有 PR 中更新 Gate E revision。
- [ ] E3.2 在任何远端部署前废止对话中出现的 DeepSeek Key，创建替换 Key；只将替换 Key写入 EdgeOne 加密变量。
- [ ] E3.3 保存并验证旧 Docusaurus revision/build 配置与当前 DNS/证书/域名环境绑定快照；关闭任意分支自动 preview，配置 Gate E 环境矩阵并创建固定 revision 的受控 preview。
- [ ] E3.4 在 preview 验证首页、板块、文档、搜索、AI、citation、资源和 360/390/430px 交互。
- [ ] E3.5 确认 EdgeOne 不含 Notion/publisher 凭据，匿名与伪造 token 调用 `/api/admin/publish-notion` 均 fail closed，响应和日志不泄露配置状态。
- [ ] E3.6 为 `/api/ask` 配置 EdgeOne 平台级速率限制/WAF，并验证突发请求 429、不影响搜索/文档。
- [ ] E3.7 以临时域名执行并计时新版→旧 Docusaurus→同一新版回滚演练，逐步复验 HTTPS 与核心路径。
- [ ] E3.8 将验证通过的 revision 部署为 production，并保持 `book.ncuos.com`；记录 deployment、revision、DNS/证书/环境绑定与独立回滚构建入口。
