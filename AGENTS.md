# 此间：仓库开发宪法

本仓库正在从 Docusaurus 文档站重构为 mobile-first 的南昌大学 AI 知识产品。任何面向学生的重构都必须遵守本文件及相关文档；若规则冲突，以更靠近目标目录的 `AGENTS.md` 为准。

## 先读什么

开始工作前必须阅读与任务相关的文件：

1. `docs/product/vision.md`
2. `docs/product/information-architecture.md`
3. `docs/product/content-publishing.md`（内容同步或文档渲染任务）
4. `docs/design/design.md`、`docs/design/iconography.md`、`docs/design/component-contracts.md`（任何 UI 任务）
5. 当前任务对应的 `docs/specs/<feature>/requirements.md`、`design.md`、`tasks.md` 和 `acceptance.md`

## 强制工作流

- 没有经确认的 `requirements.md`、`design.md`、`tasks.md` 以及 `approval.md` 中的人类批准记录，不得开始实现功能。
- 先实现一个最小任务，再运行其验证；不得顺手重构不在任务范围内的文件。
- 修改产品 UI 前，先提供目标手机尺寸下的可审阅样张；视觉基线只能由人批准，不能由 agent 自行更新。
- 每项完成的任务必须说明：关联的需求编号、改动范围、运行过的验证和未覆盖的风险。
- 不得新增依赖、修改数据模型、改变内容发布协议或替换图标库，除非当前规格明确批准。

## 不可违反的产品边界

- AI 是可溯源知识库的问答入口，不是人格化聊天角色。
- 首页的主操作是提问；场景入口服务不知道如何提问的新生。
- 关键词搜索只返回匹配文档与段落，不生成 AI 回答。
- 文档页是移动优先阅读器：正文优先，不得出现常驻双侧栏。
- Notion 是编辑源；站内必须独立可访问，不能要求读者访问 Notion。
- 原文档是内容主体。不得将文章强行改写为营销式卡片或二次维护的摘要集合。

## 工程质量门槛

- TypeScript 保持严格类型；不以 `any`、禁用检查或静默错误处理绕过问题。
- 所有用户可见样式必须使用 `docs/design/tokens.json` 对应的设计令牌；禁止新增页面私有的随意色值、字号、间距、圆角和阴影。
- 所有图标必须来自 Lucide 且遵循 `docs/design/iconography.md`。
- 对抽屉、弹层、菜单和焦点管理，复用 `docs/design/component-contracts.md` 列出的已批准 primitives；触控目标默认不小于 44px。
- 功能变更须通过类型检查、相关单测、构建和对应的视觉/交互检查后，才能宣称完成。

## 不做什么

- 不根据“现代”“高级”“更好看”等抽象词自行发明视觉方向。
- 不将桌面布局直接压缩到手机。
- 不生成虚构的运营数据、来源、政策内容或 AI 能力。
- 不未经批准删除现有内容、迁移内容源或重写历史文档。
