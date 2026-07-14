# Tasks：EdgeOne 生产切换与 DeepSeek V4 Flash

状态：已批准，2026-07-14。

- [x] E0.1 冻结并审阅 Gate E requirements、design、tasks、acceptance 与 approval。
- [x] E1.1 先写失败测试：零相关词法候选被过滤；无 embedding provider 时可召回相关来源；无关问题返回 insufficient。
- [x] E1.2 为 RPC 增加最低词法相关度过滤，新增 answerable/unanswerable 中文检索评测并验证低分过滤率、recall@8 与最终 abstention 目标。
- [x] E1.3 拆分 chat 与可选 embedding provider 配置，模型固定 `deepseek-v4-flash` 并显式关闭 thinking。
- [x] E1.4 更新 `.env.example`、README 与运维文档；移除 Gate E 对 Notion/publisher 生产变量的要求，确认 Key 不在 Git diff/build 输出中。
- [x] E2.1 运行 AI provider、retrieval、grounding、route 单测与答案评测。
- [ ] E2.2 增加真实 DeepSeek smoke：固定 5 个带预期 source/anchor 的 answerable 与至少 3 个 unanswerable；运行 Supabase recall@8、1 次 warm-up、20 次 warm 请求，并以同 revision 的 3 次独立 preview deployment 记录冷启动，验证 grounded success、最终 abstention、citation anchor、active contentVersion 和延迟；通过前保持 shadow。
- [x] E2.3 运行 typecheck、全量单测、production build 和非视觉 E2E。
- [x] E3.1 将功能分支推送 GitHub，并在现有 PR 中更新 Gate E revision。
- [ ] E3.2 将项目负责人明确批准继续使用的现有 DeepSeek Key只写入 EdgeOne 加密变量；扫描 Git、构建产物、浏览器响应与日志确认无泄露。
- [ ] E3.3 保存并验证旧 Docusaurus revision/build 配置与当前 DNS/证书/域名环境绑定快照；关闭任意分支自动 preview，配置 Gate E 环境矩阵并创建固定 revision 的受控 preview。
- [ ] E3.4 在 preview 验证首页、板块、文档、搜索、AI、citation、资源和 360/390/430px 交互。
- [ ] E3.5 确认 EdgeOne 不含 Notion/publisher 凭据，匿名与伪造 token 调用 `/api/admin/publish-notion` 均 fail closed，响应和日志不泄露配置状态。
- [ ] E3.6 为 `/api/ask` 配置 EdgeOne 平台级 10 requests/min/client IP；preview 临时把应用层提高到 100/min，以 WAF 命中记录/响应标识证明第 11 次由平台返回 429，验证不影响搜索/文档后把应用层恢复 10/min。
- [ ] E3.7 以临时域名执行并计时新版→旧 Docusaurus→同一新版回滚演练，逐步复验 HTTPS 与核心路径。
- [ ] E3.8 将验证通过的 revision 部署为 production，并保持 `book.ncuos.com`；记录 deployment、revision、DNS/证书/环境绑定与独立回滚构建入口。

## 本地验证记录（2026-07-14）

- AI/publishing 相关测试：40 passed；全量 Vitest：126 passed、1 skipped（仅实时集成用例）。
- TypeScript typecheck、Next.js production build 通过；非视觉 Playwright E2E 在 360/390/430px 共 18 passed。
- 本地固定评测：answerable recall@8 = 100%，answerable success = 100%，unanswerable abstention = 100%，citation validity = 100%，failed requests = 0。延迟来自 mock provider，不替代 E2.2 的真实 DeepSeek 数据。
- Supabase RPC 已完成 forward → rollback → forward 演练：旧函数校验和 `1e3107bea11d35d4b9d87150bca301d9`，新版校验和 `ff67850af00ed9e2e04c4a8ee454106e`；回滚恢复旧校验和，最终重新应用新版。活动内容版本始终为 `content-20260714052438077`。
- Git 工作树与 `.next` 构建产物的密钥扫描均为 0 命中。
- GitHub Draft PR #2 已更新至 revision `90f6c1cf6987abe29aae5558a9cce62ab7c1a668`。
