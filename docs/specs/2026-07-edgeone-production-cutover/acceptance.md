# Acceptance：EdgeOne 生产切换与 DeepSeek V4 Flash

状态：待执行。

## 模型与可信度

- [ ] 服务端实际请求模型为 `deepseek-v4-flash`。
- [ ] 浏览器 bundle、Git 历史和响应中不存在 DeepSeek Key。
- [ ] 无 embedding 配置时仍能召回词法来源并形成 grounded citation；无来源时返回 insufficient。
- [ ] 关键词搜索没有调用 DeepSeek。
- [ ] 答案评测达到既有 thresholds，citation 有效率为 100%。

## EdgeOne preview

- [ ] `/`、一个 `/sections/<slug>`、一个 `/docs/<slug>` 和 `/search` 可访问。
- [ ] 搜索可跳到具体块锚点。
- [ ] AI 回答可从 citation 跳到具体块并恢复回答 session。
- [ ] 37 页内容与 92 个资源继续来自当前已发布版本。
- [ ] 360/390/430px 关键交互无回归。

## 工程与生产

- [ ] Typecheck、相关单测、全量单测、build 和 E2E 通过。
- [ ] GitHub branch/PR 包含本 Gate 的规格、实现和验证记录。
- [ ] EdgeOne production deployment 对应已验证 revision。
- [ ] `https://book.ncuos.com` 展示新版 mobile-web，搜索和 AI 可用。
- [ ] EdgeOne deployment history 中可恢复旧 Docusaurus，回滚不修改 Supabase 内容指针。

