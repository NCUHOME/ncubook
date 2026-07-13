# 内容数据契约

状态：首版约束，任何修改须更新规格并获批准

## 版本和所有权

- `schemaVersion`：发布数据结构版本；首次为 `1`。破坏性变更必须递增版本、提供迁移和回滚说明。
- `sourcePageId` 与 `sourceBlockId`：来自 Notion 的稳定 UUID，是站内 page、block 与 anchor 的唯一来源；不得用标题、路径或数组序号替代。
- `contentVersion`：每次成功同步生成不可变版本号，关联 Notion `lastEditedTime` 和同步时间。
- `publisher`：同步器是唯一写入发布数据的服务；学生端只能读取已发布版本。

## Page

```ts
type Page = {
  id: string;                 // sourcePageId
  schemaVersion: 1;
  contentVersion: string;
  parentId: string | null;
  title: string;
  slug: string;
  status: "published" | "failed";
  lastEditedTime: string;
  lastPublishedAt: string;
  metadata: {
    school: "ncu";
    campus?: string[];
    audiences?: string[];
    topics?: string[];
    sourceUrls: string[];
    riskLevel: "normal" | "needs-verification" | "sensitive";
  };
};
```

## Block tree 与锚点

```ts
type RichText = Array<{
  plainText: string;
  href?: string;
  pageId?: string; // Notion 内链的 sourcePageId
  annotations: {
    bold?: boolean; italic?: boolean; underline?: boolean;
    strikethrough?: boolean; code?: boolean;
    color?: "default" | "gray" | "red" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink";
  };
}>;

type BaseBlock = { id: string; anchor: string }; // "b-" + sourceBlockId

type Block =
  | (BaseBlock & { type: "paragraph" | "quote"; richText: RichText })
  | (BaseBlock & { type: "heading"; level: 1 | 2 | 3; richText: RichText })
  | (BaseBlock & { type: "bulleted-list" | "numbered-list"; items: Array<{ id: string; richText: RichText; children: Block[] }> })
  | (BaseBlock & { type: "callout"; tone: "info" | "warning" | "risk"; icon?: string; richText: RichText; children: Block[] })
  | (BaseBlock & { type: "divider" })
  | (BaseBlock & { type: "table"; hasHeaderRow: boolean; rows: Array<{ id: string; cells: RichText[] }> })
  | (BaseBlock & { type: "image"; assetId: string; caption?: RichText })
  | (BaseBlock & { type: "file"; assetId: string; name: string; caption?: RichText })
  | (BaseBlock & { type: "columns"; columns: Array<{ id: string; blocks: Block[] }> })
  | (BaseBlock & { type: "embed"; provider: "school-map"; canonicalUrl: string; title: string })
  | (BaseBlock & { type: "page-link"; pageId: string; richText: RichText });
```

- 标题、段落及可引用表格行均使用 `b-<Notion block UUID>` 作为稳定锚点。
- 标题改名、页面移动或内容重排不得改变既有 anchor。
- 已删除块的旧 anchor 返回同页的“内容已更新”提示，并提供最近可用的上级标题；不得默默跳到无关文本。
- `Block` 判别联合是唯一的发布端块 schema；未知块不得进入 `Block`。同步器必须把它作为发布失败记录，不得用猜测字段或纯文本替代。
- `columns` 数组顺序就是阅读顺序；手机按数组顺序堆叠。`table.rows` 的第一个 row 在 `hasHeaderRow` 为真时必须为表头。
- `callout.children` 保留 Notion 提示块内的原始子块顺序；`divider` 只保存稳定身份与锚点，不生成搜索文本。
- `RichText.href` 是公开外链；`pageId` 是站内页面链接。两者不可同时存在；发布端将 `pageId` 解析为站内路由。

## Asset 和 embed

```ts
type Asset = {
  id: string;
  sourceBlockId: string;
  contentVersion: string;
  kind: "image" | "file";
  publicUrl: string;
  checksum: string;
  alt?: string;
};
```

- 资产通过站内存储 URL 提供；不得保存或展示 Notion 临时签名 URL。
- `embed` 仅存允许域名和 canonical URL；渲染器必须应用 allowlist 和降级规则。

## SearchIndex

```ts
type SearchIndexEntry = {
  id: string;                 // contentVersion + sourceBlockId
  schemaVersion: 1;
  contentVersion: string;
  pageId: string;
  pageTitle: string;
  sectionPath: string[];      // 从 H1 到当前块的标题文本
  anchor: string;
  plainText: string;
  blockType: "paragraph" | "heading" | "quote" | "callout" | "table" | "page-link";
  updatedAt: string;
};
```

- 每个可检索块只生成一个 entry；图片、文件和 embed 本身不单独进入索引，但其 caption 或邻近正文可索引。
- 搜索结果必须使用 entry 的 `pageId`、`pageTitle`、`sectionPath`、`anchor` 和截取自 `plainText` 的原文摘录；不得生成新摘要。
- 每次成功发布为当前 `contentVersion` 完整重建该页面的 entries；旧版本 entries 不得与当前版本混合查询。

## 发布失败与回滚

- 单页同步失败时，继续提供该页面最近一次 `published` 版本；维护端记录失败原因和受影响 block ID。
- 首次发布失败时，该页面不进入站内导航、搜索或 AI 索引。
- 部署或 schema 迁移必须先验证可将读端切回上一 `schemaVersion` 和最近一次成功内容版本。
