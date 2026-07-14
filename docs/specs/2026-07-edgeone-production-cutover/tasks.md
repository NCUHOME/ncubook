# Tasks：EdgeOne 生产切换与 DeepSeek V4 Flash

状态：已批准，2026-07-14。

- [ ] E0.1 冻结并审阅 Gate E requirements、design、tasks、acceptance 与 approval。
- [ ] E1.1 先写失败测试，允许 answer service 在没有 embedding provider 时执行词法召回。
- [ ] E1.2 拆分 chat 与可选 embedding provider 配置，默认 DeepSeek 模型标识更新为 `deepseek-v4-flash`。
- [ ] E1.3 更新 `.env.example`、README 与运维文档；确认 Key 不在 Git diff/build 输出中。
- [ ] E2.1 运行 AI provider、retrieval、grounding、route 单测与答案评测。
- [ ] E2.2 运行 typecheck、全量单测、production build 和非视觉 E2E。
- [ ] E3.1 将功能分支推送 GitHub，并在现有 PR 中更新 Gate E revision。
- [ ] E3.2 在 EdgeOne 已登录控制台关联/更新项目，配置 `mobile-web` 根目录与服务端环境变量，创建 preview deployment。
- [ ] E3.3 在 preview 验证首页、板块、文档、搜索、AI、citation、资源和 360/390/430px 交互。
- [ ] E3.4 将验证通过的 revision 部署为 production，并保持 `book.ncuos.com`；记录 deployment 与回滚入口。
- [ ] E3.5 上线观察后轮换对话中暴露过的 DeepSeek Key，并复验 AI。

