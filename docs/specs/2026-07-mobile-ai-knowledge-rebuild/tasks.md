# Tasks：移动端 AI 知识产品重构

状态：已批准，revision `9bfc98aec9de50d4e49c2a903ca9e3620512262f`；前端纵切进度更新至实现 revision `2662f58405c905e4b923870df46deca6a2128252`。

## 阶段 0：治理与基线

- [x] T0.1 审核并冻结 `AGENTS.md`、产品文档、设计系统文件。
- [x] T0.2 将令牌转换为 CSS Variables 和 Tailwind theme tokens。
- [x] T0.3 建立基础组件样例与 360/390/430px 审阅页。
- [x] T0.4 建立视觉、交互与构建检查命令。

## 阶段 1：内容发布能力

- [x] T1.1 按 `docs/product/content-data-contract.md` 实现 page、block-tree、asset、anchor、search-index 的 TypeScript 数据契约。
- [x] T1.2 定义 Notion 写作约定及同步映射。实现 revisions `686dff1`、`9088bcd`。
- [x] T1.3 实现资源下载/存储、稳定锚点与增量同步。实现 revisions `896d425`、`755a5b0`、`afb01e2`、`4fbe5e7`、`f443ea2`。
- [x] T1.4 实现富内容 renderer，并以结构覆盖 fixture 作为首个基准；《新生必看》真实内容 fixture 留待 T3.4。

## 阶段 2：学生端页面

- [x] T2.1 实现首页提问框与场景入口样张。
- [x] T2.2 实现板块首页、顶部导航与当前板块页面树。
- [x] T2.3 实现独立关键词搜索页与锚点跳转。
- [x] T2.4 实现阅读器式文档页。
- [x] T2.5 实现带页面/章节上下文的 AI 问答抽屉及来源返回路径。

## 阶段 3：验证与迁移

- [x] T3.1 为关键组件与页面添加视觉基线。
- [x] T3.2 为页面树、搜索、锚点、AI 上下文添加交互测试。
- [x] T3.3 验证内容同步、关键词索引与 AI 来源链路。实现 revision `422dcf2`；production AI 仍由 `shadow` 默认开关保护，待 staging 内容版本和评测后启用。
- [ ] T3.4 迁移首批真实内容；已按 Notion 页面树盘点 37 个公开页面并建立 manifest、parity、资源审计和切换回滚工具（revision `4195e3d`）。Supabase staging 已恢复，发布 schema、Storage bucket、RPC 权限、旧 `public.documents` 表 RLS 和事务冒烟测试已验证；Gate C 的 `divider`/嵌套 callout 扩展已实现并通过完整工程验证。真实 Notion dry-run、逐页内容确认和生产切换尚未执行；Docusaurus 保持可部署。
  - [x] T3.4.1 扩展首次发布 schema、normalizer、renderer 与索引遍历，支持 `divider` 和嵌套 callout。
  - [x] T3.4.2 在 360/390/430px 隔离样张中审核分割线和嵌套 callout，视觉差异不得超出 Gate C 定义；2026-07-13 人类批准，既有视觉基线未更新。
  - [ ] T3.4.3 配置 staging 运行时凭据并执行 37 页权威 dry-run。
  - [ ] T3.4.4 发布 staging 内容版本，完成逐页 parity、资源、搜索、citation 与回滚演练。

## 需求追踪矩阵

| 需求 | 任务 | 验收 |
|---|---|---|
| R1 | T2.1, T3.1, T3.2 | 首页视觉/交互检查 |
| R2 | T2.2, T2.4, T3.1 | 板块与页面树检查 |
| R3 | T2.3, T3.2 | 搜索命中与锚点检查 |
| R4 | T1.2-T1.4, T2.4, T3.1 | 富块手机 fixture 检查 |
| R5 | T2.5, T3.2-T3.3 | 上下文、citation 与返回检查 |
| R6 | T0.1-T0.4, T3.1-T3.3 | 令牌、回归、构建与可追溯检查 |
