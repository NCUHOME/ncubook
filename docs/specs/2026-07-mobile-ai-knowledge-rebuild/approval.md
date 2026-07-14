# Approval record：移动端 AI 知识产品重构

状态：Gate A 与 Gate B 均已由项目负责人批准。本记录依据项目负责人在 2026-07-13 对 agent 的明确授权填写。

## Gate A：允许开始阶段 0

- 状态：approved
- 批准人：项目负责人 water
- 批准日期：2026-07-13
- 批准 revision：`9bfc98aec9de50d4e49c2a903ca9e3620512262f`
- 已批准文档：`requirements.md`、`design.md`、`tasks.md`、`acceptance.md`、内容数据契约、回答证据契约、`docs/design/`
- 已批准概念样张：首页、板块首页、长文详情页、页面树抽屉、关键词搜索、AI 回答与依据跳转
- 允许开始阶段 0：yes
- 备注：视觉方向批准为纯白“编辑黑白”；实现后的 360/390/430px 截图仍须通过 Gate B。

## Gate B：允许发布

- 状态：approved
- 批准人：项目负责人 water
- 批准日期：2026-07-13
- 实现 revision：`2662f58405c905e4b923870df46deca6a2128252`
- 已批准截图目录：`mobile-web/e2e/__screenshots__/mobile-360/`、`mobile-web/e2e/__screenshots__/mobile-390/`、`mobile-web/e2e/__screenshots__/mobile-430/`
- 备注：项目负责人已明确回复“批准 Gate B”；批准矩阵覆盖首页、板块首页、长文、页面树、关键词搜索和 AI 回答六种状态，每种状态均包含 360/390/430px 真实浏览器截图。

## Gate C：真实内容结构扩展

- 状态：approved
- 批准人：项目负责人 water
- 批准日期：2026-07-13
- 批准范围：首次发布 schema 增加 `divider` 和嵌套 callout；恢复并使用既有 Supabase 项目作为 staging；通过已登录浏览器创建并配置只读 Notion Integration 与 Supabase 服务端运行时凭据；为旧空表 `public.documents` 启用 RLS。
- 视觉约束：分割线只使用既有边线令牌；callout 子块保留在既有低干扰提示容器内；不得引入卡片化重写、新颜色、新图标或页面私有样式。
- 批准原话：项目负责人在收到三项授权清单后明确回复“批准全部做掉”。

## Gate D：引用块内嵌附件

- 状态：structure-approved；visual-pending
- 批准人：项目负责人 water
- 批准日期：2026-07-14
- 批准范围：quote 原生持有 `children: Block[]`，保留 `写在前面` 引用块内两个 PDF 的父子关系、顺序、原始显示名和站内镜像入口；不得扁平化或修改 Notion 原文。
- 视觉约束：复用既有引用线、正文、附件行、Lucide 图标和设计令牌；不新增背景色、卡片、圆角、阴影或页面私有样式。
- 实现门槛：390px 隔离样张仍须由项目负责人批准；批准前不得修改正式 quote renderer。
- 批准原话：项目负责人明确回复“批准 Gate D 方案”。
