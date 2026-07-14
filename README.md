# 此间

面向手机端的南昌大学知识库与可溯源问答产品。当前仓库根目录即生产 Next.js 应用；EdgeOne 监听 `main` 并从根目录自动构建。

Notion 是私有编辑源，公开正文、搜索索引和资源发布到 Supabase。学生访问站内内容时不依赖 Notion；关键词搜索只返回原文档和具体段落，AI 回答必须带站内依据。

## 本地开发

```bash
npm ci
npm run dev
```

本地未配置发布库时使用测试 fixture。生产必须设置 `PUBLISHED_CONTENT_ENV=production`，缺少 Supabase 配置或活动内容版本时应直接失败，不得静默回退示例内容。

## 验证

```bash
npm run typecheck
npm test
npm run build
npm run test:e2e
```

## EdgeOne 运行时

EdgeOne 使用仓库根目录、npm lockfile、`npm run build` 和 Next.js preset。学生端只配置 Supabase 读取与 AI 问答所需的服务端变量；`AI_PROVIDER_API_KEY`、`SUPABASE_SERVICE_ROLE_KEY` 不得使用 `NEXT_PUBLIC_` 前缀。

生产问答固定使用 `AI_CHAT_MODEL=deepseek-v4-flash`，不配置 embedding model，显式关闭 thinking，并通过词法召回、grounding 与 citation 校验后才展示答案。EdgeOne 不配置 Notion 或发布管理凭据，远程发布路由保持 fail closed。

完整环境矩阵、发布验证和回滚步骤见 [`docs/operations/mobile-web-cutover.md`](docs/operations/mobile-web-cutover.md)。

## 旧站回滚

旧 Docusaurus 源码归档在 `legacy-docusaurus/`，切换前生产 revision 为 `b0e4de1d4a6aaa8979777b4ded21e5d45d4c4088`。最可靠的恢复方式是从该 revision 使用 `pnpm build` 重建 `build/`；归档目录仅用于审阅和迁移对照。
