# Acceptance：EdgeOne 生产切换与 DeepSeek V4 Flash

状态：待执行。

## 模型与可信度

- [x] 服务端 provider 配置与请求单测固定模型为 `deepseek-v4-flash`；EdgeOne 真实请求仍由 preview 验证。
- [ ] 请求显式设置 `thinking.type=disabled`；5 个固定 answerable 经 1 次 warm-up 后运行 20 次端到端请求，p95 不超过 5 秒且超时/429/5xx 均计失败；同 revision 的 3 次独立 preview deployment 首请求作为冷启动且单次不超过 8 秒。
- [x] 本地浏览器 bundle、Git 历史和构建产物中不存在 DeepSeek Key；EdgeOne 响应与日志待 preview 复核。
- [x] 项目负责人明确批准继续使用现有 Key；本地未保存该值，远端仅允许写入 EdgeOne 加密变量。
- [x] 无 embedding 配置时，零分/低于阈值候选过滤率 100%，本地 Supabase answerable recall@8 为 100%，unanswerable 最终 abstention 为 100%。
- [x] 关键词搜索代码路径和测试均未调用 DeepSeek。
- [x] 本地评测的 answerable grounded success、unanswerable abstention、citation anchor、active contentVersion 均通过，citation 有效率为 100%；真实 provider 仍由 E2.2 验证。

## EdgeOne preview

- [ ] `/`、一个 `/sections/<slug>`、一个 `/docs/<slug>` 和 `/search` 可访问。
- [ ] 搜索可跳到具体块锚点。
- [ ] AI 回答可从 citation 跳到具体块并恢复回答 session。
- [ ] 37 页内容与 92 个资源继续来自当前已发布版本。
- [ ] 360/390/430px 关键交互无回归。
- [ ] Preview 是固定已审阅 revision，任意分支自动 preview 已关闭；EdgeOne 未配置 Notion/publisher 写凭据。
- [ ] 匿名及伪造 token 调用 `/api/admin/publish-notion` 均 fail closed，响应和日志不泄露配置状态。
- [ ] EdgeOne `/api/ask` 平台级 10 requests/min/client IP 已在应用层临时 100/min 时通过 WAF 命中记录/响应标识证明第 11 次由平台返回 429；验证后应用层恢复 10/min，搜索、文档和静态资源不受影响。

## 工程与生产

- [x] Typecheck、相关单测、全量单测、build 和 E2E 通过。
- [x] 仓库根目录可由 `npm ci && npm run build` 直接构建 Next.js；旧 Docusaurus 源码归档且固定生产 revision、旧命令与产物目录已记录。
- [x] GitHub branch/PR 包含本 Gate 的规格、实现和验证记录（Draft PR #2，revision `90f6c1cf6987abe29aae5558a9cce62ab7c1a668`）。
- [ ] EdgeOne production deployment 对应已验证 revision。
- [ ] `https://book.ncuos.com` 展示新版根 Next.js 应用，搜索和 AI 可用。
- [ ] 已保存旧 Docusaurus revision/build 配置与切换前 DNS/证书/域名环境绑定快照，并完成新版→旧版→新版计时演练；两向 HTTPS 与核心路径均通过，回滚不修改 Supabase 内容指针。
