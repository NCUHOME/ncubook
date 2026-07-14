# Quote Children Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 无损发布和渲染 Notion 引用块内的两个 PDF，同时保持旧 quote 视觉与 schema v1 内容版本可回滚读取。

**Architecture:** 区分持久化兼容输入与运行时 canonical Block；Supabase decoder 在边界补齐旧 quote 的空 children，新 publisher 始终写出完整子树。QuoteBlock 复用 ArticleRenderer 递归渲染，搜索、发布校验、parity 与资源审计统一遍历 quote children。

**Tech Stack:** Next.js 15、React 19、TypeScript strict、Tailwind v4 design tokens、Lucide、Vitest、Testing Library、Playwright、Notion API、Supabase Postgres/Storage。

---

### Task 1: Gate D 390px 隔离样张与人工视觉门

**Files:**
- Create: `mobile-web/app/design-system/gate-d-quote/page.tsx`
- Create: `mobile-web/e2e/gate-d-quote-visual.spec.ts`
- Create after approval: `mobile-web/e2e/__screenshots__/mobile-390/gate-d-quote.png`
- Modify after approval: `docs/specs/2026-07-mobile-ai-knowledge-rebuild/approval.md`

- [ ] **Step 1: 创建仅供设计审核的静态样张**

样张使用 390px 文档正文片段：既有左侧 `border-ink` 引用线、`text-muted` 引用文字，以及同一 `blockquote` 内两条既有附件样式。只使用 `font-body`、`text-body`、`text-label`、`border-line`、`s3/s4/s5`、`min-h-tap` 和 Lucide `FileText`。

- [ ] **Step 2: 添加隔离视觉测试并生成截图**

Run: `cd mobile-web && npx playwright test e2e/gate-d-quote-visual.spec.ts --project=mobile-390 --update-snapshots`

Expected: 生成单张 390px review screenshot，正式 ArticleRenderer 尚未改变。

- [ ] **Step 3: 等待人工批准样张**

Expected: 项目负责人明确批准；将 `approval.md` 的 Gate D 状态从 `visual-pending` 更新为 `approved`，记录截图路径。未批准不得执行 Task 2。

- [ ] **Step 4: 提交样张与批准记录**

```bash
git add mobile-web/app/design-system/gate-d-quote/page.tsx mobile-web/e2e/gate-d-quote-visual.spec.ts mobile-web/e2e/__screenshots__/mobile-390/gate-d-quote.png docs/specs/2026-07-mobile-ai-knowledge-rebuild/approval.md
git commit -m "docs: approve nested quote attachment sample"
```

### Task 2: Canonical Block 与旧 v1 解码边界

**Files:**
- Modify: `mobile-web/lib/content/published-schema.ts`
- Modify: `mobile-web/lib/content/supabase-published-repository.ts`
- Test: `mobile-web/tests/publishing/supabase-published-repository.test.ts`

- [ ] **Step 1: 写旧 quote 无 children 的失败测试**

构造 Supabase block row：`{ type: "quote", richText: [...] }`，断言 repository 输出 `{ type: "quote", children: [] }`，并能交给 renderer。

- [ ] **Step 2: 验证测试先失败**

Run: `cd mobile-web && npm test -- --run tests/publishing/supabase-published-repository.test.ts`

Expected: FAIL，旧 row 仍未经解码直接断言为 Block。

- [ ] **Step 3: 实现持久化输入 decoder**

将运行时 schema 改为：

```ts
| (BaseBlock & { type: "quote"; richText: RichText; children: Block[] })
```

在 Supabase repository 的 block 解析边界递归解码 quote/callout/list/columns；quote 使用 `children ?? []`，其余已批准容器保持结构并拒绝非法 children。

- [ ] **Step 4: 运行单测与类型检查**

Run: `cd mobile-web && npm test -- --run tests/publishing/supabase-published-repository.test.ts && npm run typecheck`

Expected: PASS。

- [ ] **Step 5: 提交 decoder**

```bash
git add mobile-web/lib/content/published-schema.ts mobile-web/lib/content/supabase-published-repository.ts mobile-web/tests/publishing/supabase-published-repository.test.ts
git commit -m "feat: decode nested quote content"
```

### Task 3: Notion quote 子树规范化

**Files:**
- Modify: `mobile-web/lib/publishing/normalize-blocks.ts`
- Modify: `mobile-web/lib/content/published-fixtures.ts`
- Test: `mobile-web/tests/publishing/normalize-blocks.test.ts`
- Test: `mobile-web/tests/published-content.test.ts`

- [ ] **Step 1: 写 quote 内两个 file 的失败测试**

输入 quote block ID `2467d60a-0dda-809e-99c9-d5dfc89311bd`，children 为两个真实 file block ID；断言输出 quote children 顺序为 0/1，保留原名称与 `asset-<blockId>`。

- [ ] **Step 2: 运行测试确认失败**

Run: `cd mobile-web && npm test -- --run tests/publishing/normalize-blocks.test.ts`

Expected: FAIL，quote 尚未输出 children。

- [ ] **Step 3: 最小实现递归 normalizer**

把 paragraph 与 quote 分支拆开：paragraph 保持原样；quote 增加 `children: normalizeNotionBlocks(node.children, options)`。更新 fixture 中的 quote 为必填 children。

- [ ] **Step 4: 运行相关测试**

Run: `cd mobile-web && npm test -- --run tests/publishing/normalize-blocks.test.ts tests/published-content.test.ts`

Expected: PASS。

- [ ] **Step 5: 提交 normalizer**

```bash
git add mobile-web/lib/publishing/normalize-blocks.ts mobile-web/lib/content/published-fixtures.ts mobile-web/tests/publishing/normalize-blocks.test.ts mobile-web/tests/published-content.test.ts
git commit -m "feat: preserve notion quote children"
```

### Task 4: QuoteBlock 递归渲染

**Files:**
- Create: `mobile-web/src/components/article/QuoteBlock.tsx`
- Modify: `mobile-web/src/components/article/ArticleRenderer.tsx`
- Test: `mobile-web/tests/article-renderer.test.tsx`

- [ ] **Step 1: 写渲染失败测试**

构造带两个 file children 的 quote，断言引用文字与两条附件链接位于同一 `blockquote`，附件顺序与原文一致，quote/file 锚点存在；另断言空 children quote 保持原 class contract。

- [ ] **Step 2: 运行测试确认失败**

Run: `cd mobile-web && npm test -- --run tests/article-renderer.test.tsx`

Expected: FAIL，当前 quote 分支不渲染 children。

- [ ] **Step 3: 实现 QuoteBlock**

QuoteBlock 只负责现有 `blockquote` 容器和 RichText；ArticleRenderer 向其传入递归 `ArticleBlockList`：

```tsx
<QuoteBlock block={block} resolvePageRoute={resolvePageRoute}>
  {block.children.length > 0 ? (
    <ArticleBlockList blocks={block.children} getAsset={getAsset} resolvePageRoute={resolvePageRoute} className="mt-s3 space-y-s3" />
  ) : null}
</QuoteBlock>
```

不得新增颜色、圆角、背景或阴影。

- [ ] **Step 4: 运行渲染与视觉契约测试**

Run: `cd mobile-web && npm test -- --run tests/article-renderer.test.tsx && npm run typecheck`

Expected: PASS；无 children quote DOM/class 与旧基线一致。

- [ ] **Step 5: 提交 renderer**

```bash
git add mobile-web/src/components/article/QuoteBlock.tsx mobile-web/src/components/article/ArticleRenderer.tsx mobile-web/tests/article-renderer.test.tsx
git commit -m "feat: render attachments inside quotes"
```

### Task 5: 统一递归遍历、结构 parity 与资源不变量

**Files:**
- Modify: `mobile-web/lib/publishing/build-search-index.ts`
- Modify: `mobile-web/lib/publishing/publish-version.ts`
- Modify: `mobile-web/lib/migration/compare-publication.ts`
- Modify: `mobile-web/lib/migration/check-links-assets.ts`
- Test: `mobile-web/tests/publishing/build-search-index.test.ts`
- Test: `mobile-web/tests/publishing/publish-version.test.ts`
- Test: `mobile-web/tests/migration/compare-publication.test.ts`
- Test: `mobile-web/tests/migration/check-links-assets.test.ts`

- [ ] **Step 1: 分别写四类失败测试**

覆盖：quote child caption 搜索、quote 内 heading 不污染后续 sectionPath、发布校验找到 quote 内资源、审计找到 quote 内资源、parity 能区分“quote child”与错误扁平同级。parity 结构序列必须包含 parent block ID 与 sibling index。

- [ ] **Step 2: 运行测试确认失败**

Run: `cd mobile-web && npm test -- --run tests/publishing/build-search-index.test.ts tests/publishing/publish-version.test.ts tests/migration/compare-publication.test.ts tests/migration/check-links-assets.test.ts`

Expected: 至少 quote recursion 与 structural path 测试 FAIL。

- [ ] **Step 3: 实现 scoped traversal**

为 quote/callout/list/columns 递归；搜索进入 quote children 前保存 headings，退出后恢复，避免污染外层。parity 的结构 key 使用 `parentBlockId/siblingIndex/blockId`，list item 与 column 也保留容器路径。

- [ ] **Step 4: 运行相关测试与 typecheck**

Run: `cd mobile-web && npm test -- --run tests/publishing/build-search-index.test.ts tests/publishing/publish-version.test.ts tests/migration/compare-publication.test.ts tests/migration/check-links-assets.test.ts && npm run typecheck`

Expected: PASS。

- [ ] **Step 5: 提交 traversal**

```bash
git add mobile-web/lib/publishing/build-search-index.ts mobile-web/lib/publishing/publish-version.ts mobile-web/lib/migration/compare-publication.ts mobile-web/lib/migration/check-links-assets.ts mobile-web/tests/publishing/build-search-index.test.ts mobile-web/tests/publishing/publish-version.test.ts mobile-web/tests/migration/compare-publication.test.ts mobile-web/tests/migration/check-links-assets.test.ts
git commit -m "fix: audit nested quote structure"
```

### Task 6: Gate D 实现后手机验证

**Files:**
- Modify: `mobile-web/e2e/gate-d-quote-visual.spec.ts`
- Create: `mobile-web/e2e/__screenshots__/mobile-360/gate-d-quote.png`
- Verify: `mobile-web/e2e/__screenshots__/mobile-390/gate-d-quote.png`
- Create: `mobile-web/e2e/__screenshots__/mobile-430/gate-d-quote.png`

- [ ] **Step 1: 让视觉测试改为正式 QuoteBlock fixture**

- [ ] **Step 2: 运行 360/390/430px 截图检查**

Run: `cd mobile-web && SUPABASE_URL= SUPABASE_SERVICE_ROLE_KEY= npx playwright test e2e/gate-d-quote-visual.spec.ts`

Expected: 三档均与批准的 390px 方向一致；无横向溢出，附件触控目标至少 44px。

- [ ] **Step 3: 提交实现后视觉证据**

```bash
git add mobile-web/e2e/gate-d-quote-visual.spec.ts mobile-web/e2e/__screenshots__
git commit -m "test: verify nested quote attachments on mobile"
```

### Task 7: 重新发布、真实回滚与最终审计

**Files:**
- Modify: `mobile-web/migration/reports/staging-readiness.md`
- Modify: `docs/specs/2026-07-mobile-ai-knowledge-rebuild/tasks.md`
- Modify: `docs/specs/2026-07-mobile-ai-knowledge-rebuild/acceptance.md`

- [ ] **Step 1: 运行完整测试门槛**

Run: `cd mobile-web && npm test && npm run typecheck && npm run build && SUPABASE_URL= SUPABASE_SERVICE_ROLE_KEY= npm run test:e2e && SUPABASE_URL= SUPABASE_SERVICE_ROLE_KEY= npm run test:visual`

Expected: 全部 PASS，既有 Gate B 基线无未批准差异。

- [ ] **Step 2: 运行 37 页权威 dry-run**

Run: `cd mobile-web && PUBLICATION_ENDPOINT=http://127.0.0.1:3000/api/admin/publish-notion node --env-file=.env.local scripts/publish-notion.ts --dry-run --all`

Expected: 37 页、无未渲染资源；警告仅为已记录的 alt/empty-embed 编辑警告。

- [ ] **Step 3: 发布新版本 B 并执行结构审计**

验证 37 页 manifest、92/92 可达资源、全部 search anchors、两个 PDF 的 quote parent ID 与 sibling index 0/1，以及真实关键词跳转。

- [ ] **Step 4: 验证新版本 B citation**

至少一个 grounded answer 的 citation 必须带 B 的 `contentVersion`，并打开站内具体 anchor。

- [ ] **Step 5: 执行真实 A → B → A → B 回滚**

用发布 CLI/RPC 将指针切回 `content-20260714030315891`，验证旧 v1 quote 经 decoder 可读；再恢复 B，并复验 B citation。每次移动使用 expected-current compare-and-swap。

- [ ] **Step 6: 更新迁移报告与任务状态**

记录版本 ID、计数、警告分类、parity、资源、citation 和回滚证据；只有全部通过才勾选 T3.4.4–T3.4.6 与对应 acceptance。

- [ ] **Step 7: 提交最终报告**

```bash
git add mobile-web/migration/reports/staging-readiness.md docs/specs/2026-07-mobile-ai-knowledge-rebuild/tasks.md docs/specs/2026-07-mobile-ai-knowledge-rebuild/acceptance.md
git commit -m "docs: complete gate d staging migration"
```
