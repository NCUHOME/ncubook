# Acceptance：EdgeOne 生产切换与 DeepSeek V4 Flash

状态：待执行。

## 模型与可信度

- [ ] 服务端实际请求模型为 `deepseek-v4-flash`。
- [ ] 请求显式设置 `thinking.type=disabled`；5 个固定问题经 1 次 warm-up 后运行 20 次端到端请求，p95 不超过 5 秒且超时/429/5xx 均计失败；另记录 3 次冷启动且单次不超过 8 秒。
- [ ] 浏览器 bundle、Git 历史和响应中不存在 DeepSeek Key。
- [ ] 对话中出现的旧 Key 在远端部署前已废止，远端只使用替换 Key。
- [ ] 无 embedding 配置时，零分/低于阈值候选过滤率 100%，answerable recall@8 不低于 80% 并能形成 grounded citation；unanswerable 最终 abstention 100%，但不强制空召回。
- [ ] 关键词搜索没有调用 DeepSeek。
- [ ] answerable grounded success、unanswerable abstention、citation anchor、active contentVersion 均通过；citation 有效率为 100%。

## EdgeOne preview

- [ ] `/`、一个 `/sections/<slug>`、一个 `/docs/<slug>` 和 `/search` 可访问。
- [ ] 搜索可跳到具体块锚点。
- [ ] AI 回答可从 citation 跳到具体块并恢复回答 session。
- [ ] 37 页内容与 92 个资源继续来自当前已发布版本。
- [ ] 360/390/430px 关键交互无回归。
- [ ] Preview 是固定已审阅 revision，任意分支自动 preview 已关闭；EdgeOne 未配置 Notion/publisher 写凭据。
- [ ] 匿名及伪造 token 调用 `/api/admin/publish-notion` 均 fail closed，响应和日志不泄露配置状态。
- [ ] EdgeOne `/api/ask` 平台级速率限制/WAF 已验证突发请求返回 429，且搜索、文档和静态资源不受影响。

## 工程与生产

- [ ] Typecheck、相关单测、全量单测、build 和 E2E 通过。
- [ ] GitHub branch/PR 包含本 Gate 的规格、实现和验证记录。
- [ ] EdgeOne production deployment 对应已验证 revision。
- [ ] `https://book.ncuos.com` 展示新版 mobile-web，搜索和 AI 可用。
- [ ] 已保存旧 Docusaurus revision/build 配置与切换前 DNS/证书/域名环境绑定快照，并完成新版→旧版→新版计时演练；两向 HTTPS 与核心路径均通过，回滚不修改 Supabase 内容指针。
