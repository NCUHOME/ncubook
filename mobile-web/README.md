# 此间 Mobile Web

面向手机端的南昌大学知识库。Notion 是私有编辑源；发布任务会把页面树、正文块和资源复制到 Supabase，学生访问站内正文时不依赖 Notion，也不会被跳转到 Notion。

## 本地开发

```bash
npm install
npm run dev
```

本地和测试环境在没有发布配置时使用仓库 fixture。生产部署必须设置 `PUBLISHED_CONTENT_ENV=production`；此时缺少 Supabase 配置或当前已发布版本会直接报错，禁止静默展示示例内容。

## 环境变量

```bash
# 站内已发布内容
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
PUBLISHED_ASSETS_BUCKET=published-content
PUBLISHED_CONTENT_ENV=production

# 私有编辑源，仅服务端发布任务可见
NOTION_TOKEN=
NOTION_ROOT_PAGE_ID=

# 受控发布入口
PUBLICATION_ADMIN_TOKEN=
PUBLICATION_ENDPOINT=https://example.edu/api/admin/publish-notion
```

`NOTION_ROOT_PAGE_ID` 的直接子页面是站内板块，后代页面按原层级发布为正文页。页面可设置名为 `Slug` 的 rich-text 属性；未设置时使用 Notion UUID 生成稳定地址。正文块、图片和附件独立存储，公开页面不持有 Notion 临时资源 URL。

## 发布操作

先执行只读演练：

```bash
npm run publish:notion -- --dry-run --all
npm run publish:notion -- --dry-run --page <notion-page-id>
```

确认结果后发布或回滚：

```bash
npm run publish:notion -- --all
npm run publish:notion -- --rollback <content-version>
```

发布器先构建完整版本，校验页面层级、内部链接、资源引用、搜索锚点和编辑时间，然后由 PostgreSQL 函数在同一事务中写入内容并移动当前版本指针。任何页面失败时，当前线上版本保持不变。关键词搜索只读取该版本的原文条目，不生成回答。

## 密钥、调度与恢复

- `NOTION_TOKEN` 只授予根页面及其后代的读取权限，不放入 `NEXT_PUBLIC_*` 环境变量。
- `SUPABASE_SERVICE_ROLE_KEY` 与 `PUBLICATION_ADMIN_TOKEN` 仅保存在服务端密钥管理中；管理员 token 至少每 90 天轮换，人员变更时立即轮换。
- 定时任务只调用 `POST /api/admin/publish-notion`，使用 `Authorization: Bearer …`。建议先定时 dry-run，成功后再由独立任务发布。
- 监控非 2xx 响应、`publication_failures` 新记录和当前指针长时间未更新。失败原因不包含 Notion token。
- 发布异常时先停止调度，再运行 `--rollback <version>`。旧版本在资源保留期内仍可恢复；清理程序只能删除 `unreferenced_published_asset_urls` 返回且超过保留期的对象。
- 轮换 Notion token 后，先 dry-run 验证读取范围；轮换管理员 token 后同步更新调度器。

## 验证

```bash
npm test
npm run typecheck
npm run build
npm run test:e2e
npm run test:visual
```

正式切换前还需在一次 staging 发布中覆盖所有支持的 Notion block，并在退出 Notion 登录后验证公开页面。

## 可溯源问答发布

`AI_ANSWER_MODE=fixture` 仅供本地交互；`shadow` 会运行检索与模型校验但只向学生返回 insufficient；`production` 才展示经确定性来源校验后的结论。生产部署未明确设置模式时默认 shadow。关键词搜索走独立的 `/api/search`，不会调用 embedding 或聊天模型。

启用 production 前在 staging 运行：

```bash
ANSWER_EVAL_ENDPOINT=https://staging.example.edu/api/ask npm run eval:answers
```

评测必须达到 `evals/thresholds.json`，其中 citation 有效率必须为 100%，敏感问题不允许出现无支持事实。模型辅助的语义支持评分只能提供人工复核线索，不能单独批准上线。异常时立即将 `AI_ANSWER_MODE` 改为 `shadow`，再轮换 `AI_PROVIDER_API_KEY`；该操作不影响关键词搜索和文档阅读。
