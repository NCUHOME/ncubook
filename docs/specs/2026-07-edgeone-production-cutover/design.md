# Design：EdgeOne 生产切换与 DeepSeek V4 Flash

状态：已批准，2026-07-14。

## 方案比较

### 方案 A：EdgeOne 原生部署 Next.js（采用）

EdgeOne 直接构建 `mobile-web/`，由其 Next.js 运行时承载 Server Components 和 Route Handlers。页面、搜索与问答保持同源；所有服务端密钥由 EdgeOne 环境变量注入。

优点是代码路径最少、没有跨域、当前 Supabase 发布仓库与 `/api/search`、`/api/ask` 均可复用，并且符合 EdgeOne 当前对 Next.js SSR、SSG 和 Route Handlers 的官方支持。

### 方案 B：EdgeOne 静态站 + 独立 Vercel API

需要额外生成静态内容快照、迁移动态路由、建立跨域 AI API，并维持两套部署与密钥。它与旧站历史架构相似，但对当前新版代码会新增不必要的发布耦合，因此不采用。

### 方案 C：继续使用旧 Docusaurus

虽然部署最少，但无法交付已经批准的 mobile-first 阅读器、富块发布和 citation 返回体验，只作为回滚版本保留。

## 运行时结构

```text
book.ncuos.com
  -> EdgeOne Pages/Makers
      -> Next.js 页面与静态资源
      -> /api/search
          -> Supabase 当前 published contentVersion
      -> /api/ask
          -> Supabase trigram/substring 召回
          -> DeepSeek Chat Completions (deepseek-v4-flash)
          -> grounding policy + citation 校验
```

Gate E 只部署学生端读取和问答能力。`/api/admin/publish-notion` 即使随 Next.js 路由存在，也不得获得 `NOTION_TOKEN` 或 `PUBLICATION_ADMIN_TOKEN`，因此必须 fail closed；远程发布入口的开放另行立项。内容仍通过已经验证的本地发布流程写入 Supabase。

## AI provider 调整

当前 provider 将 chat 与 embedding 强制绑定到同一 OpenAI-compatible 服务。改造后拆成两个可独立配置的能力：

- `AnswerModel`：必须配置，使用 `AI_PROVIDER_BASE_URL=https://api.deepseek.com`、`AI_CHAT_MODEL=deepseek-v4-flash` 和服务端 Key。
- `EmbeddingModel`：可选；未配置时 `retrieveGroundingSources` 直接调用数据库词法召回，`vectorScore=0`。

DeepSeek 请求带 `thinking: { type: "disabled" }`，保留 `temperature: 0` 和严格 JSON 输出。provider 的默认超时先维持 8 秒，但生产批准要求真实 smoke 的 p95 不超过 5 秒；429、超时和 5xx 均沿用 `ProviderError` 降级，不能返回无来源内容。

词法 RPC 在排序前过滤候选：完整问题子串命中，或 `similarity(lower(plain_text), lower(question)) >= 0.08`。阈值由一组 answerable 与 unanswerable 中文问题验证；目标为 answerable recall@8 不低于 80%，unanswerable 空召回率 100%。如果达不到，Gate E 停在 `shadow`，不得通过降低阈值制造表面召回。

这样不会把 chat model 错当 embedding model，也不会为了上线引入未经批准的新 provider。以后增加 embedding 时，必须单独配置兼容的 1536 维模型并重新生成发布索引向量。

## EdgeOne 构建配置

- Git 仓库：`NCUHOME/ncubook`。
- 项目根目录：`mobile-web`。
- 安装：按 lockfile 使用 npm；构建：`npm run build`。
- Framework preset：Next.js；由 EdgeOne adapter 处理 `.next` 产物，不设置 `output: export`。
- production branch：生产合并后的 `main`；功能分支先生成 preview deployment。
- 域名：preview 验收前不移动 `book.ncuos.com`；切换时在 EdgeOne 项目内绑定现有域名，不改变对外 URL。

## 环境与密钥矩阵

| 变量 | 受控 preview | production |
|---|---|---|
| `PUBLISHED_CONTENT_ENV` | `production`（禁止 fixture 回退） | `production` |
| `AI_ANSWER_MODE` | 先 `shadow`，评测时短暂 `production` | 评测批准后 `production`，否则 `shadow` |
| `SUPABASE_URL` | 当前发布库 URL | 当前发布库 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | 仅手工创建的受控 preview deployment | EdgeOne 加密变量 |
| `AI_PROVIDER_BASE_URL` | `https://api.deepseek.com` | 同左 |
| `AI_PROVIDER_API_KEY` | 部署前新建的替换 Key | 同一替换 Key或独立生产 Key |
| `AI_CHAT_MODEL` | `deepseek-v4-flash` | `deepseek-v4-flash` |
| `AI_EMBEDDING_MODEL` | 不设置 | 不设置 |
| `NOTION_TOKEN` / `PUBLICATION_ADMIN_TOKEN` | 不设置 | 不设置 |

EdgeOne 项目关闭自动 preview branch deployment，只有审阅后的固定 revision 才手工创建 preview。启动 smoke 必须证明生产内容存储已配置；不得因为缺变量回退 fixture。

## 性能策略

- `loadPublishedRepository` 的完整版本数据使用按 `contentVersion` 标记的服务端缓存，避免每个页面请求重复加载 37 页完整快照。
- 搜索与问答只读取当前版本所需索引，不把 service role key 下发浏览器。
- EdgeOne 对 hash 静态资源使用长期边缘缓存；HTML 由平台保持可更新策略。
- 本 Gate 不改变已批准 UI 或内容结构，因此不生成新视觉基线。

## 发布与回滚

1. 保存旧 Docusaurus revision、根目录构建命令与产物路径，使它不依赖历史 deployment 也能重新部署。
2. 在功能分支的固定已审阅 revision 创建受控 EdgeOne preview，使用 production 内容指针但独立 URL；关闭任意分支自动 preview。
3. 验证 37 页内容、搜索锚点、AI grounded/insufficient、资源、主要手机视口与响应时间。
4. 在临时域名执行新版→重新构建的旧 Docusaurus→同一新版的计时演练。
5. 推送并合并已验证 revision，EdgeOne 构建 production。
6. 将 `book.ncuos.com` 保持/绑定到新版 deployment，观察错误率与 AI provider 状态。
7. 失败时用保存的旧 revision 重新部署并将域名环境恢复；Supabase 内容指针不变。EdgeOne history 只作快速路径，不是唯一回滚资产。
