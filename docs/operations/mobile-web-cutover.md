# Mobile Web 切换与回滚手册

状态：未执行。本文只定义演练步骤，不授权修改 DNS、生产路由或删除 Docusaurus。

## 交付边界

- 旧入口：现有 Docusaurus 部署，保持可部署、内容冻结但不删除。
- 新入口：`mobile-web` preview/staging/production 三套环境。
- 内容真源：Notion 根页面 `24c7d60a-0dda-808b-aaf0-c30129eeff3b`；清单基准为站内发布 37 页，根页面自身不发布。
- 内容运行源：Supabase 当前 `published_content_pointer` 指向的完整版本。公开请求不访问 Notion。
- DNS/路由执行人与内容负责人目前均为 `unassigned`，生产切换前必须在演练记录中填写。

## 生产环境检查

必须配置：`SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`、`PUBLISHED_ASSETS_BUCKET`、`PUBLISHED_CONTENT_ENV=production`、`NOTION_TOKEN`、`NOTION_ROOT_PAGE_ID`、`PUBLICATION_ADMIN_TOKEN`。AI 默认 `shadow`；只有评测通过后才允许 `AI_ANSWER_MODE=production` 并配置 provider 变量。

密钥不得使用 `NEXT_PUBLIC_`。发布 bucket 必须允许公开读取，但只允许服务端写入。应用数据库需应用 `mobile-web/supabase/published-content.sql`。

## Staging 演练

1. 记录实现 revision、Docusaurus revision、执行人和开始时间。
2. 运行 `npm run migration:inventory`，确认 37 页、7 个顶层板块；再运行带 `--verify-remote` 的远端核对。
3. `npm run publish:notion -- --dry-run --all`；所有未知 block、资源失败和内部链接失败必须归零。
4. 发布 staging，记录 `contentVersion`、checksum、页数、资源数、搜索条目数和 Notion edited watermark。
5. 退出 Notion 登录，验证首页、板块、长文、关键词搜索、图片/附件和 citation 锚点仍可访问。
6. 运行单测、类型检查、构建、15 条 E2E、3 组视觉基线、迁移 parity、链接/资源审计；AI 启用时再运行评测。
7. 将 staging alias 指向 mobile-web，观察 30 分钟；随后切回 Docusaurus并记录恢复时间。回滚不得修改内容表。
8. 再次前进到 mobile-web，复验同一内容版本。两次方向切换都成功后才可申请生产批准。

## 健康检查和阻断阈值

- `/`、任一 `/sections/<slug>`、任一 `/docs/<slug>` 与 `/api/search?q=环游车` 返回成功。
- 404/5xx 相比切换前异常上升、首页/搜索/文档任一主路径不可用、资源失败、混合内容版本、citation 锚点损坏：立即回滚。
- AI p95 超过 5 秒、provider 错误或评测下降：仅将 AI 切回 shadow，不影响文档站；出现无来源敏感事实则立即关闭生产回答。
- 监控项：5xx、404、搜索零结果率、资源失败、发布失败、当前指针年龄、问答置信分布、AI 延迟及反馈关联 request ID。不得记录完整问题。

## 内容回滚

```bash
PUBLICATION_ENDPOINT=https://<host>/api/admin/publish-notion \
PUBLICATION_ADMIN_TOKEN=<secret> \
npm run publish:notion -- --rollback <previous-content-version>
```

回滚后清除 `published-content:<version>` 对应缓存并复验首页、目标文档、搜索和 citation。旧资源只可在回滚保留期后，依据 `unreferenced_published_asset_urls` 结果清理。

## 入口回滚

1. 将 production alias/router 恢复到演练确认的 Docusaurus revision。
2. 不移动或删除 Supabase 内容指针；保留事故现场供排查。
3. 清理 CDN 路由缓存，验证旧站首页、搜索和核心文档。
4. 记录发现时间、回滚开始/完成时间、影响路径、内容版本和负责人。

## 最终批准记录

生产切换批准必须同时引用：实现 revision、内容版本/checksum、37 页 manifest、逐页负责人状态、parity 报告、资源审计、360/390/430 截图、完整测试结果、AI 模式/评测结果、前进与回滚演练耗时。任何字段为空均不得切换。
