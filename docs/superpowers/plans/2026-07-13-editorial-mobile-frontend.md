# Editorial Mobile Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved pure-white “editorial monochrome” mobile frontend for homepage questioning, section/document reading, deterministic keyword search, page-tree navigation, and grounded-answer presentation.

**Architecture:** Implement this as a fixture-backed vertical slice inside `mobile-web/`: design tokens and reusable primitives first, then structured document fixtures and search indexes, then the five approved UI states. Keep keyword search and AI asking on separate routes and code paths. Notion synchronization and a production LLM provider are separate follow-up projects; this plan defines their frontend-facing contracts without coupling the UI to either service.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind CSS v4, Lucide React, Radix Dialog, Vitest, Testing Library, Playwright.

---

## Scope and execution gate

This plan covers one independently testable subsystem: the student-facing mobile frontend using deterministic published-content and answer fixtures. It does **not** implement Notion synchronization, asset ingestion, Supabase migrations, or production model calls.

The existing approval template currently mixes two gates that occur at different times. Before execution, the project owner must record two distinct decisions: (A) requirements/design/approved concept samples and permission to start phase 0; (B) implementation screenshots approved only after Task 9. Gate A is the only prerequisite for Task 1; Gate B is the release prerequisite and cannot block Task 1.

The current `mobile-web/` baseline is untracked. Before creating a dedicated worktree, the project owner/main agent must review and commit that baseline on the source branch, including `mobile-web/AGENTS.md`. The implementation worktree must be created from that baseline commit. An implementation agent must not copy, delete, stage or reinterpret untracked frontend files on its own.

## File map

### Design foundation

- Modify `mobile-web/app/globals.css`: CSS variables, reset, type roles, focus and safe-area utilities only.
- Modify `mobile-web/app/layout.tsx`: pure-white viewport metadata and root shell.
- Create `mobile-web/app/design-system/page.tsx`: isolated human-review examples at 360/390/430px.
- Modify `docs/design/component-contracts.md`: approve every new primitive/domain component before use.

### Published fixtures and selectors

- Create `mobile-web/lib/content/published-schema.ts`: exact TypeScript mirror of the approved Page/Block/Asset/SearchIndex contracts.
- Create `mobile-web/lib/content/published-fixtures.ts`: section, page, block-tree, navigation and search fixtures.
- Create `mobile-web/lib/content/published-repository.ts`: read-only selectors so pages do not import fixtures directly.
- Create `mobile-web/lib/search/search-blocks.ts`: deterministic block search returning original excerpts and anchors.
- Create `mobile-web/lib/answers/session.ts`: answer/citation types, validation and fixture lookup.

### Components

- Create `mobile-web/src/components/navigation/AppHeader.tsx`: approved minimal header.
- Create `mobile-web/src/components/navigation/PageTreeDrawer.tsx`: current-section navigation drawer.
- Create `mobile-web/src/components/ask/AskProvider.tsx`: shared route-level ask host and persisted answer state.
- Create `mobile-web/src/components/ask/QuestionForm.tsx`: AI question entry; never submits to keyword search.
- Create `mobile-web/src/components/search/SearchForm.tsx`: keyword-only search field.
- Create `mobile-web/src/components/search/SearchResultItem.tsx`: original excerpt and anchor link.
- Create `mobile-web/src/components/ask/FloatingAskButton.tsx`: document-context AI trigger.
- Create `mobile-web/src/components/ask/AskSheet.tsx`: answer, nearby citations and restored draft/session state.
- Create `mobile-web/src/components/article/ArticleRenderer.tsx`: exhaustive block dispatcher.
- Create `mobile-web/src/components/article/RichText.tsx`, `TableBlock.tsx`, `ColumnsBlock.tsx`, `CalloutBlock.tsx`, `ListBlock.tsx`, `FileBlock.tsx`, `EmbedBlock.tsx`, `PageLinkBlock.tsx`, `ImageBlock.tsx`: focused rich-content renderers.
- Create `mobile-web/src/components/pages/HomePageView.tsx`, `SectionPageView.tsx`, `DocumentPageView.tsx`, `SearchPageView.tsx`: approved page compositions; App Router files only load data and render these views.
- Delete after imports migrate: `mobile-web/app/components/*`.

### Routes

- Modify `mobile-web/app/page.tsx`: question-first homepage and low-weight section links.
- Create `mobile-web/app/providers.tsx`: mount `AskProvider` once for all App Router pages.
- Modify `mobile-web/app/layout.tsx`: mount `Providers` around the app shell.
- Create `mobile-web/app/sections/[slug]/page.tsx`: free-form section homepage.
- Create `mobile-web/app/docs/[slug]/page.tsx`: reader-first document page.
- Replace `mobile-web/app/search/page.tsx`: deterministic results only.
- Create `mobile-web/app/api/ask/route.ts`: deterministic grounded-answer fixture boundary for this vertical slice.
- Modify `mobile-web/app/topics/[slug]/page.tsx` and `mobile-web/app/cards/[slug]/page.tsx`: temporary redirects to new routes.

### Verification

- Modify `mobile-web/vitest.config.ts`: jsdom setup for component tests.
- Create `mobile-web/tests/setup.ts`.
- Create `mobile-web/tests/design-tokens.test.ts`, `published-content.test.ts`, `search-blocks.test.ts`, `answer-session.test.ts`, `page-tree.test.tsx`, `ask-sheet.test.tsx`.
- Create `mobile-web/playwright.config.ts` and `mobile-web/e2e/mobile-journeys.spec.ts`.

### Task 0: Resolve human approval and worktree prerequisites

**Files:**
- Human-owned record: `docs/specs/2026-07-mobile-ai-knowledge-rebuild/approval.md`
- Baseline review: `mobile-web/**`

- [ ] **Step 1: Ask the project owner to separate the two approvals**

The owner changes `requirements.md`, `design.md`, `tasks.md`, and `acceptance.md` from draft/unapproved status to `状态：已批准，revision <commit>` and replaces the single status block in `approval.md` with these human-owned fields (agents do not fill them):

```markdown
## Gate A：允许开始阶段 0

- 状态：approved | pending
- 批准人：
- 批准日期：
- 批准 revision：
- 已批准文档：requirements.md、design.md、tasks.md、acceptance.md、内容契约、回答证据契约、docs/design/
- 已批准概念样张：首页、板块、长文、页面树、关键词搜索、AI 回答
- 允许开始阶段 0：yes | no

## Gate B：允许发布

- 状态：approved | pending
- 批准人：
- 批准日期：
- 实现 revision：
- 已批准截图目录：
```

Task 1 的唯一开工判定是：Gate A `状态：approved`、`允许开始阶段 0：yes`、批准 revision 可由 `git merge-base --is-ancestor <revision> HEAD` 验证，并且 `requirements.md`、`design.md`、`tasks.md` 与 `acceptance.md` 均标记同一批准 revision。Gate B 在 Task 9 前必须保持 `pending`。

- [ ] **Step 2: Review and commit the current untracked frontend baseline**

Run:

```bash
git status --short -- \
  mobile-web \
  docs/design \
  docs/product \
  docs/specs/2026-07-mobile-ai-knowledge-rebuild \
  docs/superpowers/specs/2026-07-13-cijian-editorial-black-white-design.md \
  docs/superpowers/plans/2026-07-13-editorial-mobile-frontend.md
```

Expected: the owner/main agent can identify every untracked or modified frontend/specification file. Commit the reviewed mobile baseline, plan, visual specification, design tokens/design docs, product contracts, and human-owned approval changes in one traceable revision before creating the worktree. Do not include unrelated workspace files.

- [ ] **Step 3: Create the implementation worktree from the baseline commit**

Use the `using-git-worktrees` skill. Verify `mobile-web/package.json`, `mobile-web/AGENTS.md`, and this plan exist inside the new worktree before Task 1.

### Task 1: Establish the test and accessibility harness

**Files:**
- Modify: `mobile-web/package.json`
- Modify: `mobile-web/vitest.config.ts`
- Create: `mobile-web/tests/setup.ts`
- Create: `mobile-web/tests/design-tokens.test.ts`

- [ ] **Step 1: Add component and browser-test dependencies**

Run:

```bash
cd mobile-web
npm install @radix-ui/react-dialog
npm install -D @playwright/test @testing-library/jest-dom @testing-library/react @testing-library/user-event jsdom
```

Expected: `package.json` and `package-lock.json` change; install exits 0.

- [ ] **Step 2: Write a failing token-contract test**

```ts
// mobile-web/tests/design-tokens.test.ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("editorial monochrome token contract", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

  it("uses a pure-white canvas and monochrome actions", () => {
    expect(css).toContain("--canvas: #ffffff");
    expect(css).toContain("--action: #111111");
    expect(css).not.toContain("--green:");
    expect(css).not.toContain("linear-gradient");
  });
});
```

- [ ] **Step 3: Configure Vitest setup and verify the test fails**

```ts
// mobile-web/vitest.config.ts
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    setupFiles: ["./tests/setup.ts"],
  },
  resolve: { alias: { "@": fileURLToPath(new URL("./", import.meta.url)) } },
});
```

```ts
// mobile-web/tests/setup.ts
import "@testing-library/jest-dom/vitest";
```

Run: `cd mobile-web && npm test -- design-tokens.test.ts`

Expected: FAIL because the current stylesheet still defines the paper/green system.

- [ ] **Step 4: Commit the failing harness**

```bash
git add mobile-web/package.json mobile-web/package-lock.json mobile-web/vitest.config.ts mobile-web/tests/setup.ts mobile-web/tests/design-tokens.test.ts
git commit -m "test: add mobile interface test harness"
```

### Task 2: Implement the frozen design tokens and root shell

**Files:**
- Modify: `mobile-web/app/globals.css`
- Modify: `mobile-web/app/layout.tsx`
- Create: `mobile-web/app/design-system/page.tsx`
- Modify: `docs/design/component-contracts.md`
- Test: `mobile-web/tests/design-tokens.test.ts`

- [ ] **Step 1: Replace global styles with semantic tokens**

The `:root` block must be exactly token-driven; page-specific layout stays out of this file:

```css
@import "tailwindcss";

:root {
  --canvas: #ffffff;
  --surface: #ffffff;
  --surface-subtle: #f5f5f5;
  --text: #111111;
  --text-muted: #666666;
  --border: #dedede;
  --action: #111111;
  --action-subtle: #f2f2f2;
  --info: #2e5f87;
  --danger: #9f3d2e;
  --warning: #9b5a12;
  --focus: #111111;
  --font-family-ui: -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", sans-serif;
  --font-family-body: -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  --font-family-display: "Songti SC", STSong, SimSun, serif;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-7: 48px;
  --font-size-caption: 12px;
  --font-size-label: 14px;
  --font-size-body: 16px;
  --font-size-body-large: 18px;
  --font-size-title: 22px;
  --font-size-heading: 28px;
  --font-size-display: 36px;
  --weight-regular: 400;
  --weight-medium: 500;
  --weight-semibold: 600;
  --weight-bold: 700;
  --line-height-ui: 1.4;
  --line-height-body: 1.7;
  --line-height-heading: 1.25;
  --corner-small: 8px;
  --corner-medium: 12px;
  --corner-large: 16px;
  --corner-round: 999px;
  --icon-small: 16px;
  --icon: 20px;
  --icon-large: 24px;
  --tap-target: 44px;
  --border-default: 1px;
  --elevation-floating: 0 8px 24px rgba(17, 17, 17, 0.14);
  --layer-base: 0;
  --layer-header: 10;
  --layer-floating-action: 20;
  --layer-drawer: 30;
  --layer-modal: 40;
  --motion-fast: 120ms;
  --motion-standard: 200ms;
}

@theme inline {
  --color-canvas: var(--canvas);
  --color-surface: var(--surface);
  --color-surface-subtle: var(--surface-subtle);
  --color-ink: var(--text);
  --color-muted: var(--text-muted);
  --color-line: var(--border);
  --color-action: var(--action);
  --color-action-subtle: var(--action-subtle);
  --color-info: var(--info);
  --color-warning: var(--warning);
  --color-danger: var(--danger);
  --color-focus: var(--focus);
  --font-sans: var(--font-family-ui);
  --font-body: var(--font-family-body);
  --font-display: var(--font-family-display);
  --spacing-s1: var(--space-1);
  --spacing-s2: var(--space-2);
  --spacing-s3: var(--space-3);
  --spacing-s4: var(--space-4);
  --spacing-s5: var(--space-5);
  --spacing-s6: var(--space-6);
  --spacing-s7: var(--space-7);
  --spacing-icon-small: var(--icon-small);
  --spacing-icon: var(--icon);
  --spacing-icon-large: var(--icon-large);
  --spacing-tap: var(--tap-target);
  --text-caption: var(--font-size-caption);
  --text-label: var(--font-size-label);
  --text-body: var(--font-size-body);
  --text-body-large: var(--font-size-body-large);
  --text-title: var(--font-size-title);
  --text-heading: var(--font-size-heading);
  --text-display: var(--font-size-display);
  --font-weight-regular: var(--weight-regular);
  --font-weight-medium: var(--weight-medium);
  --font-weight-semibold: var(--weight-semibold);
  --font-weight-bold: var(--weight-bold);
  --leading-ui: var(--line-height-ui);
  --leading-body: var(--line-height-body);
  --leading-heading: var(--line-height-heading);
  --radius-small: var(--corner-small);
  --radius-medium: var(--corner-medium);
  --radius-large: var(--corner-large);
  --radius-round: var(--corner-round);
  --border-width-default: var(--border-default);
  --shadow-floating: var(--elevation-floating);
  --duration-fast: var(--motion-fast);
  --duration-standard: var(--motion-standard);
}

@utility z-base { z-index: var(--layer-base); }
@utility z-header { z-index: var(--layer-header); }
@utility z-floating-action { z-index: var(--layer-floating-action); }
@utility z-drawer { z-index: var(--layer-drawer); }
@utility z-modal { z-index: var(--layer-modal); }

* { box-sizing: border-box; }
html, body { margin: 0; min-height: 100%; background: var(--canvas); color: var(--text); }
body { font-family: var(--font-family-ui); -webkit-font-smoothing: antialiased; }
a { color: inherit; text-decoration: none; }
button, input, textarea { font: inherit; }
.font-display { font-family: var(--font-family-display); }
.tap-target { min-width: var(--tap-target); min-height: var(--tap-target); }
.focus-ring:focus-visible { outline: 2px solid var(--focus); outline-offset: 3px; }
.mobile-shell { width: min(100%, 760px); min-height: 100vh; margin-inline: auto; background: var(--canvas); }
```

At this stage, extend `design-tokens.test.ts` to scan only `src/components/**/*.tsx` and `app/design-system/**/*.tsx`; legacy routes are intentionally migrated later. Fail on raw hex/RGB values, old `--green`/`--paper` references, or arbitrary Tailwind values. Task 8 expands this to the full `app/**/*.tsx` tree only after legacy files are removed.

The deny list covers raw `#...`/`rgb(...)`, arbitrary brackets, default typography (`text-xs` through `text-9xl`, `leading-*`), default fonts (`font-serif`), numeric spacing (`p-4`, `mt-6`, `gap-3`), default radii (`rounded-md`), default shadows (`shadow-lg`), and numeric/default z-index (`z-10`, `z-50`). Allowed user-visible utilities are mapped semantic forms such as `font-body`, `text-body`, `leading-body`, `p-s4`, `gap-s3`, `rounded-medium`, `shadow-floating`, `z-header`, `z-drawer`, and `z-modal`. Width/grid/flex utilities that do not encode a design token remain allowed. Semantic `info`, `warning`, and `danger` are reserved for their contract meanings and are not brand accents.

- [ ] **Step 2: Make viewport metadata pure white**

In `app/layout.tsx`, retain existing metadata and change `themeColor` to `#ffffff`. Do not add patterned backgrounds or a permanent desktop phone frame.

- [ ] **Step 3: Update component governance before creating components**

Add contracts for `AskProvider`, `QuestionForm`, `RichText`, `ImageBlock`, `ListBlock`, `FileBlock`, `EmbedBlock`, `PageLinkBlock`, the four page-view components, and the design-system review route to `docs/design/component-contracts.md`. Each row defines responsibility, required accessibility/contract behavior, and forbidden behavior. Existing approved component rows remain intact.

- [ ] **Step 4: Add a design-system review route**

Render typography, icon buttons, line rows, form controls, callouts and loading/empty/error states inside three wrappers with `width: 360px`, `390px`, and `430px`. Add `aria-label` to icon-only controls.

- [ ] **Step 5: Run checks**

Run:

```bash
cd mobile-web
npm test -- design-tokens.test.ts
npm run typecheck
```

Expected: PASS and typecheck exits 0.

- [ ] **Step 6: Commit**

```bash
git add mobile-web/app/globals.css mobile-web/app/layout.tsx mobile-web/app/design-system/page.tsx docs/design/component-contracts.md mobile-web/tests/design-tokens.test.ts
git commit -m "feat: establish editorial monochrome design tokens"
```

### Task 3: Add published document fixtures and deterministic search

**Files:**
- Create: `mobile-web/lib/content/published-schema.ts`
- Create: `mobile-web/lib/content/published-fixtures.ts`
- Create: `mobile-web/lib/content/published-repository.ts`
- Create: `mobile-web/lib/search/search-blocks.ts`
- Create: `mobile-web/tests/published-content.test.ts`
- Create: `mobile-web/tests/search-blocks.test.ts`

- [ ] **Step 1: Write failing schema and search tests**

```ts
// mobile-web/tests/search-blocks.test.ts
import { describe, expect, it } from "vitest";
import { searchEntries } from "@/lib/search/search-blocks";
import { searchIndexFixture } from "@/lib/content/published-fixtures";
import { resolvePageRoute } from "@/lib/content/published-repository";

describe("keyword-only document search", () => {
  it("returns the original paragraph and a stable anchor", () => {
    const [result] = searchEntries("环游车", searchIndexFixture, resolvePageRoute);
    expect(result.pageTitle).toBe("校园环游车乘坐指南");
    expect(result.excerpt).toContain("环游车");
    expect(result.href).toMatch(/^\/docs\/campus-shuttle#b-/);
    expect(result).not.toHaveProperty("answer");
  });
});
```

```ts
// mobile-web/tests/published-content.test.ts
import { describe, expect, it } from "vitest";
import { getDocumentView, getSectionTree } from "@/lib/content/published-repository";

describe("published fixture", () => {
  it("has stable anchors and a two-level section tree", () => {
    const shuttle = getDocumentView("campus-shuttle");
    expect(shuttle?.blocks.every((block) => block.anchor.startsWith("b-"))).toBe(true);
    expect(shuttle?.page.parentId).toBeTruthy();
    expect(getSectionTree("campus-life").some((node) => node.children.length > 0)).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd mobile-web && npm test -- published-content.test.ts search-blocks.test.ts`

Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Implement the exact frontend contract**

`published-schema.ts` must copy the `Page`, `RichText`, complete `Block` union, `Asset`, and `SearchIndexEntry` definitions from `docs/product/content-data-contract.md` without adding UI fields. The core shape is:

```ts
export type RichText = Array<{
  plainText: string;
  href?: string;
  pageId?: string;
  annotations: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strikethrough?: boolean;
    code?: boolean;
    color?: "default" | "gray" | "red" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink";
  };
}>;

export type Block =
  | { id: string; anchor: string; type: "paragraph" | "quote"; richText: RichText }
  | { id: string; anchor: string; type: "heading"; level: 1 | 2 | 3; richText: RichText }
  | { id: string; anchor: string; type: "bulleted-list" | "numbered-list"; items: Array<{ id: string; richText: RichText; children: Block[] }> }
  | { id: string; anchor: string; type: "callout"; tone: "info" | "warning" | "risk"; icon?: string; richText: RichText }
  | { id: string; anchor: string; type: "table"; hasHeaderRow: boolean; rows: Array<{ id: string; cells: RichText[] }> }
  | { id: string; anchor: string; type: "columns"; columns: Array<{ id: string; blocks: Block[] }> }
  | { id: string; anchor: string; type: "image"; assetId: string; caption?: RichText }
  | { id: string; anchor: string; type: "file"; assetId: string; name: string; caption?: RichText }
  | { id: string; anchor: string; type: "embed"; provider: "school-map"; canonicalUrl: string; title: string }
  | { id: string; anchor: string; type: "page-link"; pageId: string; richText: RichText };

export type Page = {
  id: string;
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

Also copy `Asset` and `SearchIndexEntry` exactly. Define the fixture container separately as `{ pages: Page[]; blocksByPageId: Record<string, Block[]>; assets: Asset[]; searchIndex: SearchIndexEntry[] }`. Fixtures must include a section root, two levels of children, every approved block type, and asset lookups for image/file blocks. Repository selectors expose `getSectionView`, `getDocumentView`, `getSectionTree`, `getAsset`, `resolvePageRoute(pageId)`, and `getSearchIndex`; UI-only `description`, `sectionSlug`, page route, and block tree are derived view-model values rather than additions to the publication schema.

The approved table row type has a stable source UUID in `row.id` but no separate `anchor` field. The renderer derives it with the single shared helper `anchorFromSourceId(row.id) => "b-" + row.id`; the fixture test asserts that a known row ID produces the expected anchor. Do not add a row-anchor field to the publication contract.

- [ ] **Step 4: Implement original-excerpt search**

```ts
export function searchEntries(
  query: string,
  entries: SearchIndexEntry[],
  resolvePageRoute: (pageId: string) => string,
): SearchResult[] {
  const needle = query.trim().toLocaleLowerCase("zh-CN");
  if (!needle) return [];
  return entries
    .filter((entry) => entry.plainText.toLocaleLowerCase("zh-CN").includes(needle))
    .map((entry) => ({
      pageTitle: entry.pageTitle,
      sectionPath: entry.sectionPath,
      excerpt: entry.plainText,
      anchor: entry.anchor,
      href: `${resolvePageRoute(entry.pageId)}#${entry.anchor}`,
    }));
}
```

- [ ] **Step 5: Run tests and commit**

Run: `cd mobile-web && npm test -- published-content.test.ts search-blocks.test.ts`

Expected: PASS.

```bash
git add mobile-web/lib/content mobile-web/lib/search/search-blocks.ts mobile-web/tests/published-content.test.ts mobile-web/tests/search-blocks.test.ts
git commit -m "feat: add published document fixtures and block search"
```

### Task 4: Build the header and accessible page-tree drawer

**Files:**
- Create: `mobile-web/src/components/navigation/AppHeader.tsx`
- Create: `mobile-web/src/components/navigation/PageTreeDrawer.tsx`
- Create: `mobile-web/tests/page-tree.test.tsx`

- [ ] **Step 1: Write the failing interaction test**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { PageTreeDrawer } from "@/src/components/navigation/PageTreeDrawer";

it("opens the current section tree and restores trigger focus", async () => {
  const user = userEvent.setup();
  render(<PageTreeDrawer sectionTitle="校园生活" currentPageId="shuttle" nodes={[{ id: "shuttle", title: "校园交通", href: "/docs/campus-shuttle", children: [] }]} />);
  const trigger = screen.getByRole("button", { name: "打开校园生活页面列表" });
  await user.click(trigger);
  expect(screen.getByRole("dialog", { name: "校园生活页面列表" })).toBeVisible();
  await user.keyboard("{Escape}");
  expect(trigger).toHaveFocus();
});
```

- [ ] **Step 2: Run the test to verify failure**

Run: `cd mobile-web && npm test -- page-tree.test.tsx`

Expected: FAIL because `PageTreeDrawer` is missing.

- [ ] **Step 3: Implement with Radix Dialog**

Use `Dialog.Root`, `Dialog.Trigger`, `Dialog.Portal`, `Dialog.Overlay`, `Dialog.Content`, `Dialog.Title`, and `Dialog.Close`. The content is left-aligned, `width: min(86vw, 360px)`, full-height, white, and contains only the current section tree plus “返回全部校园内容”. Mark the current link with `aria-current="page"`. Do not create a permanent desktop sidebar.

- [ ] **Step 4: Simplify `AppHeader`**

Support props `{ title, backHref, sectionTree, currentPageId }`. Render 44px back, tree, and search controls with Lucide `ArrowLeft`, `Menu`, and `Search`. Use pure white plus a single bottom border; remove subtitle, green, patterned/translucent paper colors, and multi-line header content.

- [ ] **Step 5: Run and commit**

Run: `cd mobile-web && npm test -- page-tree.test.tsx && npm run typecheck`

Expected: PASS.

```bash
git add mobile-web/src/components/navigation mobile-web/tests/page-tree.test.tsx
git commit -m "feat: add minimal mobile header and page tree"
```

### Task 5: Render free-form sections and reader-first documents

**Files:**
- Create: `mobile-web/src/components/article/RichText.tsx`
- Create: `mobile-web/src/components/article/ArticleRenderer.tsx`
- Create: `mobile-web/src/components/article/TableBlock.tsx`
- Create: `mobile-web/src/components/article/ColumnsBlock.tsx`
- Create: `mobile-web/src/components/article/CalloutBlock.tsx`
- Create: `mobile-web/src/components/article/ListBlock.tsx`
- Create: `mobile-web/src/components/article/ImageBlock.tsx`
- Create: `mobile-web/src/components/article/FileBlock.tsx`
- Create: `mobile-web/src/components/article/EmbedBlock.tsx`
- Create: `mobile-web/src/components/article/PageLinkBlock.tsx`
- Create: `mobile-web/src/components/pages/SectionPageView.tsx`
- Create: `mobile-web/src/components/pages/DocumentPageView.tsx`
- Create: `mobile-web/app/sections/[slug]/page.tsx`
- Create: `mobile-web/app/docs/[slug]/page.tsx`
- Modify: `mobile-web/app/topics/[slug]/page.tsx`
- Modify: `mobile-web/app/cards/[slug]/page.tsx`
- Create: `mobile-web/tests/article-renderer.test.tsx`

- [ ] **Step 1: Write failing renderer tests**

Test that headings and paragraphs retain `block.anchor`, list items use `anchorFromSourceId(item.id)`, and table rows use `anchorFromSourceId(row.id)`; tables have an overflow container and semantic header cells; columns preserve DOM order; image/file blocks resolve through `getAsset`; school-map embeds reject non-allowlisted URLs with an external-link fallback; and rich-text/page-link blocks resolve `pageId` through `resolvePageRoute`.

- [ ] **Step 2: Run tests to verify failure**

Run: `cd mobile-web && npm test -- article-renderer.test.tsx`

Expected: FAIL because renderer modules are missing.

- [ ] **Step 3: Implement an exhaustive dispatcher**

```tsx
export function ArticleRenderer({ blocks, getAsset, resolvePageRoute }: ArticleRendererProps) {
  return <div className="article-flow">{blocks.map((block) => {
    switch (block.type) {
      case "paragraph": return <p id={block.anchor} key={block.id}><RichText value={block.richText} /></p>;
      case "quote": return <blockquote id={block.anchor} key={block.id}><RichText value={block.richText} /></blockquote>;
      case "heading": return <HeadingBlock key={block.id} block={block} />;
      case "bulleted-list":
      case "numbered-list": return <ListBlock key={block.id} block={block} />;
      case "callout": return <CalloutBlock key={block.id} block={block} />;
      case "table": return <TableBlock key={block.id} block={block} />;
      case "columns": return <ColumnsBlock key={block.id} block={block} />;
      case "image": return <ImageBlock key={block.id} block={block} asset={getAsset(block.assetId)} />;
      case "file": return <FileBlock key={block.id} block={block} asset={getAsset(block.assetId)} />;
      case "embed": return <EmbedBlock key={block.id} block={block} />;
      case "page-link": return <PageLinkBlock key={block.id} block={block} href={resolvePageRoute(block.pageId)} />;
      default: return assertNever(block);
    }
  })}</div>;
}
```

`TableBlock` uses `overflow-x: auto`; `ColumnsBlock` is one column below 720px and preserves array order. Body text is at least 16px/1.7. Only page/title headings use `font-display`.

- [ ] **Step 4: Implement section and document routes**

Both route files load through `published-repository.ts`, call `notFound()` for unknown slugs, and pass typed view-models into `SectionPageView` or `DocumentPageView`. The views use `AppHeader`. Section pages render their own block tree followed by linear child-page links. Document pages render breadcrumbs, title, update metadata and rich blocks; the shared ask trigger is attached in Task 6 so this task remains buildable without a dead placeholder.

- [ ] **Step 5: Redirect legacy routes**

Use `redirect()` from `/topics/[slug]` to `/sections/[slug]` and from `/cards/[slug]` to the matching `/docs/[slug]`. Keep these compatibility files until migration acceptance.

- [ ] **Step 6: Run and commit**

Run: `cd mobile-web && npm test -- article-renderer.test.tsx && npm run typecheck && npm run build`

Expected: all pass; build lists section and document dynamic routes.

```bash
git add mobile-web/src/components/article mobile-web/src/components/pages/SectionPageView.tsx mobile-web/src/components/pages/DocumentPageView.tsx mobile-web/app/sections mobile-web/app/docs mobile-web/app/topics mobile-web/app/cards mobile-web/tests/article-renderer.test.tsx
git commit -m "feat: add section and reader document pages"
```

### Task 6: Rebuild the question-first homepage

**Files:**
- Create: `mobile-web/app/providers.tsx`
- Modify: `mobile-web/app/layout.tsx`
- Create: `mobile-web/src/components/ask/AskProvider.tsx`
- Create: `mobile-web/src/components/ask/QuestionForm.tsx`
- Create: `mobile-web/src/components/ask/AskSheet.tsx`
- Create: `mobile-web/src/components/ask/FloatingAskButton.tsx`
- Create: `mobile-web/src/components/pages/HomePageView.tsx`
- Modify: `mobile-web/app/page.tsx`
- Modify: `mobile-web/app/docs/[slug]/page.tsx`
- Create: `mobile-web/tests/question-form.test.tsx`

- [ ] **Step 1: Write a failing route-separation test**

Render `QuestionForm` inside `AskProvider`, submit “环游车怎么付费？”, and assert that the shared `AskSheet` opens with the question. Render a document `FloatingAskButton`, click it, and assert the sheet displays `{ pageId, anchor }`. Assert neither path navigates to `/search`.

- [ ] **Step 2: Run the test to verify failure**

Run: `cd mobile-web && npm test -- question-form.test.tsx`

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the approved homepage composition**

`app/providers.tsx` is a client component that mounts one `AskProvider`; `app/layout.tsx` wraps the shell with it. `AskProvider` owns `{ open, question, pageContext, draft, session }` and exposes `openAsk(input)` through `useAsk()`. In this task `AskSheet` shows the question/context and a neutral loading/unavailable state; Task 8 adds validated responses. This makes both entries functional without a dead API dependency.

`app/page.tsx` only loads section view-models and renders `HomePageView`. The view uses the approved order: wordmark/search header, small “南昌大学 · 校园知识” kicker, Songti display title, restrained supporting copy, question form, then four to six section links as two-column line rows. Remove quick-question cards, recent cards, colored topic icons and the feedback promotional card from the first screen.

`QuestionForm` calls `useAsk().openAsk({ question })`; it does not share `SearchForm` or use the `/search` action. The document route renders `FloatingAskButton` with the current page ID and heading anchor supplied by a small client heading observer.

- [ ] **Step 4: Run responsive manual checks**

At 360, 390 and 430px, confirm the question field and submit control appear without scrolling and all touch targets are at least 44px.

- [ ] **Step 5: Run and commit**

Run: `cd mobile-web && npm test -- question-form.test.tsx && npm run typecheck`

Expected: PASS.

```bash
git add mobile-web/app/providers.tsx mobile-web/app/layout.tsx mobile-web/app/page.tsx mobile-web/app/docs mobile-web/src/components/ask mobile-web/src/components/pages/HomePageView.tsx mobile-web/tests/question-form.test.tsx
git commit -m "feat: rebuild question-first mobile homepage"
```

### Task 7: Separate deterministic keyword search from AI

**Files:**
- Create: `mobile-web/src/components/search/SearchForm.tsx`
- Create: `mobile-web/src/components/search/SearchResultItem.tsx`
- Create: `mobile-web/src/components/pages/SearchPageView.tsx`
- Replace: `mobile-web/app/search/page.tsx`
- Modify: `mobile-web/app/api/search/route.ts`
- Modify: `mobile-web/tests/search.test.ts`

- [ ] **Step 1: Replace old card-search assertions with block-result assertions**

The tests must assert `pageTitle`, `sectionPath`, original `excerpt`, `anchor`, and `href`; they must also assert that API response keys are exactly `query` and `results` and contain no `answer`.

- [ ] **Step 2: Run the test to verify failure**

Run: `cd mobile-web && npm test -- search.test.ts`

Expected: FAIL because the current route calls `composeSearchAnswer` and returns `answer`.

- [ ] **Step 3: Implement the keyword-only route and page**

`GET /api/search?q=` calls only `getSearchIndex()` and `searchEntries()`. The route page passes results into `SearchPageView`, which renders a top search field, match count, and linear `SearchResultItem` rows. Each item shows section path, page title, unmodified excerpt with visual query highlighting, and a link to `/docs/<slug>#<anchor>`. Do not import any module from `lib/answers`.

- [ ] **Step 4: Verify no AI coupling**

Run:

```bash
cd mobile-web
rg "composeSearchAnswer|lib/answers|answer" app/search app/api/search
npm test -- search.test.ts search-blocks.test.ts
```

Expected: `rg` returns no matches; tests PASS.

- [ ] **Step 5: Commit**

```bash
git add mobile-web/app/search mobile-web/app/api/search mobile-web/src/components/search mobile-web/src/components/pages/SearchPageView.tsx mobile-web/tests/search.test.ts
git commit -m "feat: separate deterministic document search"
```

### Task 8: Add grounded answer presentation and exact citation return

**Files:**
- Create: `mobile-web/lib/answers/session.ts`
- Create: `mobile-web/app/api/ask/route.ts`
- Modify: `mobile-web/src/components/ask/AskProvider.tsx`
- Modify: `mobile-web/src/components/ask/AskSheet.tsx`
- Modify: `mobile-web/src/components/ask/FloatingAskButton.tsx`
- Modify: `mobile-web/src/components/ask/QuestionForm.tsx`
- Modify: `mobile-web/app/page.tsx`
- Modify: `mobile-web/app/docs/[slug]/page.tsx`
- Create: `mobile-web/tests/answer-session.test.ts`
- Create: `mobile-web/tests/ask-sheet.test.tsx`

- [ ] **Step 1: Write failing evidence-contract tests**

```ts
it("rejects grounded factual claims without citations", () => {
  expect(() => validateAnswerSession({
    id: "a1", question: "环游车怎么付费？", confidence: "grounded",
    pageContext: { pageId: "campus-shuttle" }, citations: [],
    claims: [{ id: "c1", text: "单次 0.9 元", citationIds: [], status: "grounded" }],
  })).toThrow(/citation/i);
});

it("requires every factual claim in a multi-claim answer to cite the active content version", () => {
  const session = validatedFixture({
    claims: [
      { id: "fare", text: "单次费用为 0.9 元", citationIds: ["fare-source"], status: "grounded" },
      { id: "payment", text: "可以扫码付款", citationIds: ["payment-source"], status: "grounded" },
    ],
    citations: [
      citationFixture("fare-source", "b-fare", "content-2026-07"),
      citationFixture("payment-source", "b-payment", "content-2026-07"),
    ],
  });
  expect(validateAnswerSession(session, "content-2026-07")).toEqual(session);
  expect(session.claims.every((claim) => claim.citationIds.length > 0)).toBe(true);
});
```

The component test renders the two-claim fixture and asserts that each claim has its own nearby citation control with the matching accessible name. It also opens the sheet from both `QuestionForm` and `FloatingAskButton`, checks the current page context, clicks “路线与收费”, and asserts the link contains both `#b-...` and `answerSession=a1`. A second test seeds session storage, simulates `popstate`, and asserts the same sheet, answer, draft, and saved scroll target are restored.

- [ ] **Step 2: Run tests to verify failure**

Run: `cd mobile-web && npm test -- answer-session.test.ts ask-sheet.test.tsx`

Expected: FAIL because modules do not exist.

- [ ] **Step 3: Implement validation before rendering**

Mirror `Citation`, `AnswerClaim` and `AnswerSession` from `docs/product/answer-evidence-contract.md`. `validateAnswerSession` must reject missing citation IDs, citations pointing outside the active published version, and `grounded` confidence if any factual claim is not grounded. An `insufficient` session may contain guidance but no factual claims.

- [ ] **Step 4: Implement the fixture API and sheet**

For this plan, `/api/ask` returns deterministic validated fixtures for known questions and an `insufficient` response otherwise. Keep the provider behind this route so a later production-AI plan can replace it.

`AskProvider` is the sole ask host for the homepage and every document route. It posts `{ question, pageContext }` to `/api/ask`, validates the returned session, and supplies loading/grounded/partial/insufficient states to `AskSheet`. `AskSheet` uses Radix Dialog, presents answer prose without chat bubbles, places numbered citations next to claims, and lists “完整依据” rows. Before following a citation, resolve the route through `resolvePageRoute(citation.pageId)`, store `{ session, scrollY, draft }` in `sessionStorage` under `answer-session:<id>`, and link to:

```ts
const href = `${resolvePageRoute(citation.pageId)}?answerSession=${session.id}#${citation.anchor}`;
```

On `popstate`, restore matching state, reopen the sheet, restore the input draft, and call `window.scrollTo({ top: saved.scrollY })` after the dialog mounts. `FloatingAskButton` must respect `env(safe-area-inset-bottom)` and carry `{ pageId, anchor }` from the current heading observer. The homepage passes no page context; the document route passes both page ID and current heading anchor.

- [ ] **Step 5: Remove the legacy component directory after all imports migrate**

Run: `cd mobile-web && rg "@/app/components|app/components" app src tests`

Expected: no matches. Delete `mobile-web/app/components/`; all page composition now comes from approved `src/components` contracts. Expand `design-tokens.test.ts` from its Task 2 scope to all `app/**/*.tsx` and `src/components/**/*.tsx`, using the full raw/arbitrary/default utility deny list defined in Task 2.

- [ ] **Step 6: Run and commit**

Run: `cd mobile-web && npm test -- answer-session.test.ts ask-sheet.test.tsx design-tokens.test.ts && npm run typecheck`

Expected: PASS.

```bash
git add mobile-web/lib/answers mobile-web/app/api/ask mobile-web/app/page.tsx mobile-web/app/docs mobile-web/src/components/ask mobile-web/tests/answer-session.test.ts mobile-web/tests/ask-sheet.test.tsx
git add -A -- mobile-web/app/components
git commit -m "feat: add grounded answer sheet with citation return"
```

### Task 9: Add browser journeys and human visual baselines

**Files:**
- Create: `mobile-web/playwright.config.ts`
- Create: `mobile-web/e2e/mobile-journeys.spec.ts`
- Create after human approval: `mobile-web/e2e/__screenshots__/{mobile-360,mobile-390,mobile-430}/*`
- Modify: `mobile-web/package.json`

- [ ] **Step 1: Configure Playwright without automatic snapshot updates**

Add these exact scripts:

```json
{
  "test:e2e": "playwright test --grep-invert @visual",
  "test:visual": "playwright test --grep @visual"
}
```

Create this configuration:

```ts
// mobile-web/playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  use: { baseURL: "http://127.0.0.1:3100", trace: "retain-on-failure" },
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: "mobile-360", use: { viewport: { width: 360, height: 800 } } },
    { name: "mobile-390", use: { viewport: { width: 390, height: 844 } } },
    { name: "mobile-430", use: { viewport: { width: 430, height: 932 } } },
  ],
  snapshotPathTemplate: "{testDir}/__screenshots__/{projectName}/{arg}{ext}",
});
```

- [ ] **Step 2: Write the five core journeys**

Cover: homepage question entry, section-to-document navigation, page-tree open/close/focus restore, keyword search to exact anchor, and document-context AI to citation and back. Assert that the search journey makes no `/api/ask` request. The citation journey must assert that browser back restores the same answer text, open sheet, draft, and scroll position within a 2px tolerance.

- [ ] **Step 3: Run functional browser tests**

Run: `cd mobile-web && npx playwright install chromium && npm run test:e2e`

Expected: all three viewport projects PASS.

- [ ] **Step 4: Generate candidate screenshots for human review**

Add one `@visual` test per state and call `toHaveScreenshot` with stable names:

```ts
test("@visual approved mobile states", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveScreenshot("home.png", { fullPage: true });
  await page.goto("/sections/campus-life");
  await expect(page).toHaveScreenshot("section.png", { fullPage: true });
  await page.goto("/docs/campus-shuttle");
  await expect(page).toHaveScreenshot("document.png", { fullPage: true });
  await page.getByRole("button", { name: /打开.*页面列表/ }).click();
  await expect(page).toHaveScreenshot("page-tree.png", { fullPage: true });
  await page.goto("/search?q=环游车");
  await expect(page).toHaveScreenshot("search.png", { fullPage: true });
  await page.goto("/docs/campus-shuttle");
  await page.getByRole("button", { name: "询问当前文档" }).click();
  await page.getByLabel("问题").fill("环游车怎么付费？");
  await page.getByRole("button", { name: "提交问题" }).click();
  await expect(page.getByText("完整依据")).toBeVisible();
  await expect(page).toHaveScreenshot("answer.png", { fullPage: true });
});
```

Run: `cd mobile-web && npm run test:visual -- --update-snapshots`

Expected: screenshots exist for homepage, section, document, drawer, search and answer at all three widths. Do not treat generated screenshots as approved.

- [ ] **Step 5: Stop for product-owner approval**

The candidate matrix is exactly 6 states × 3 projects = 18 files under `mobile-web/e2e/__screenshots__/<project>/`. Record approved snapshot paths and revision as Gate B in `docs/specs/2026-07-mobile-ai-knowledge-rebuild/approval.md`. Only the project owner can approve differences.

- [ ] **Step 6: Run the complete gate**

Run:

```bash
cd mobile-web
npm test
npm run typecheck
npm run build
npm run test:e2e
npm run test:visual
```

Expected: all commands PASS with no snapshot differences.

- [ ] **Step 7: Commit**

```bash
git add mobile-web/playwright.config.ts mobile-web/e2e mobile-web/package.json mobile-web/package-lock.json docs/specs/2026-07-mobile-ai-knowledge-rebuild/approval.md
git commit -m "test: add approved mobile journey baselines"
```

## Follow-up plans required

After this frontend vertical slice is accepted, write separate implementation plans for:

1. Notion block-tree synchronization, asset mirroring, versioned publication and rollback.
2. Production retrieval/model integration, claim-citation enforcement and evaluation.
3. Migration of real Docusaurus/Notion content and production cutover.

Keeping these separate prevents the frontend visual rewrite from silently changing content publication or AI trust boundaries.
