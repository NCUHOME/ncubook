# Gate D：引用块内嵌附件无损发布

状态：结构方向已由项目负责人于 2026-07-14 批准；390px 视觉样张待批准。

## 真实内容问题

Notion 页面 `写在前面` 的引用块 `2467d60a-0dda-809e-99c9-d5dfc89311bd` 包含两个 PDF 子块。当前发布器会镜像这两个文件，但已批准的 `quote` 数据结构只能保存引用文字，不能保存子块，因此已发布 staging 版本缺少两个附件入口。

这不是内容编辑问题。Notion 仍是原始编辑源，站内发布必须忠实保留引用与附件的父子关系，不能要求作者搬动原文，也不能把附件静默扁平化到引用之外。

## 方案比较

### A. Quote 原生持有子块（已批准）

- `quote` 增加 `children: Block[]`，与 callout 使用同一递归渲染边界。
- 引用文字保持现有左侧墨色细线、灰色正文；子块位于同一引用语义容器中。
- 附件继续复用现有 `FileBlock`、Lucide `FileText` 和设计令牌。
- 优点：Notion 结构、阅读顺序、附件名称和下载入口全部保留；没有第二套内容维护。

### B. 将子附件扁平化为引用后的同级块（拒绝）

- 不修改 schema，但会改变原始父子结构。
- 发布后的附件看起来不再属于引用内容，后续同步也难以解释结构差异。

### C. 修改 Notion 原文，把附件移出引用（拒绝）

- 通过改变编辑源迁就渲染器，违背“原文是内容主体”和无损迁移目标。
- 会给作者增加返工，并使其他嵌套 quote 再次成为隐患。

## 数据与渲染设计

- 持久化兼容输入使用 `StoredQuoteBlock.children?: StoredBlock[]`；运行时 canonical `Block` 使用必填 `{ type: "quote", richText, children: Block[] }`。新发布器必须写出 `children`；Supabase decoder 将旧数据的缺失字段归一化为空数组，renderer 只接收 canonical Block。
- normalizer 递归规范化 quote children，保持 Notion 顺序和稳定 block ID。
- 资源镜像、发布前资源引用校验、search traversal、parity traversal 和资源审计都必须进入 quote children。
- `QuoteBlock` 在现有 `blockquote` 内先渲染引用文字，再渲染子块；子块使用已有 renderer，不新增页面私有样式。无 children 时 DOM 语义和 Gate B 视觉保持不变。
- 390px 样张只允许使用现有 `ink`、`muted`、`line`、字号、间距与附件组件令牌。引用内附件不得变成强调卡片，不增加背景色、圆角或阴影。

## 失败与兼容

- quote 没有子块时，视觉必须与 Gate B 基线完全一致。
- 旧 schema v1 quote 缺少 `children` 时由 Supabase 反序列化边界补为空数组，并用兼容测试证明不会在 renderer 中崩溃。
- 未知 quote 子块继续阻断发布，不转为空段落。
- 任意镜像资源若没有对应渲染块，发布前校验必须失败并保持当前版本指针。
- 已发布的 schema v1 数据读取时允许旧 quote 缺少 `children`，解释为空数组；新发布数据必须写出 `children`。

## 验证

1. normalizer 单测覆盖 quote 内两个 file 子块的顺序与名称。
2. renderer 单测覆盖引用文字、两个附件链接、锚点与既有样式契约。
3. search、parity、资源审计遍历测试覆盖 quote children。quote 自身仍只生成一个 quote entry；file 只按既有 caption 规则索引；quote 内标题的 `sectionPath` 变化不得污染 quote 后的外层正文。
4. 390px 隔离样张经人工批准后才能修改正式 UI；实现后补测 360/390/430px。
5. parity 比较必须包含每个块的结构路径（父 block ID 与 sibling index），不能只比较扁平顺序和类型计数。两个真实 PDF 的父节点必须为 quote `2467d60a-0dda-809e-99c9-d5dfc89311bd`，sibling index 分别为 0 和 1。
6. 重新执行 37 页 dry-run 和 staging 发布，要求 92 个资源全部有渲染引用、所有搜索锚点可达。在新版本 B 上至少验证一个真实 grounded answer：citation 的 `contentVersion` 必须为 B 且 anchor 可达。回滚证据必须为：发布 B → 指针切回上一成功版本 A 并验证旧 v1 quote 读端 → 再恢复 B，并再次确认 B 的 citation；不得用单个事务自身 rollback 代替内容版本回滚。

## 非目标

- 不新增 quote 折叠、引用来源、下载管理器或附件预览器。
- 不修改 Notion 原文，不重写附件标题，不改变现有视觉基线中的其他页面。
