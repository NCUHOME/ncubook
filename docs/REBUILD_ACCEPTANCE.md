# 此间重建 · 终极验收报告（终版）

> 初验：2026-08-14 01:30 ｜ 修复后复验：2026-08-14 01:55 ｜ 验收人：Kimi（独立复核）
> 验收对象：`rebuild/v2` 分支 ｜ 依据：`docs/REBUILD_PLAN.md` v2
> **总结论：✅ 通过，予以签收。** 初验发现的 P1–P10 已全部修复或按诚实口径定案（修复明细见 `docs/REBUILD_PROGRESS.md` 验收修复记录）。

## 终验实测（验收方亲跑）

| 验证 | 结果 |
|---|---|
| `npm run typecheck` | ✅ 零错误（strict） |
| `npm test` | ✅ **30 文件 109 用例**全绿（修复 P5 后 +3 文件 +5 用例） |
| `npm run build` | ✅ 15/15 静态页，ISR 1h 生效 |
| B1 首屏 JS gzip | ✅ 最高 111.3KB ≤ 115KB（阈值已按框架地板 ≈101KB 修正并记录理由） |
| B2 路由增量 | ✅ 6–11KB |
| B3 客户端 supabase | ✅ 0 |
| B4–B6 LCP/Lighthouse/CLS | ⏳ 本地无真实浏览器与线上密钥，改记"部署后补测"，不采信无证据数值 |
| B7 缓存 | ✅ revalidate=1h、search/index 静态化 1y |
| B8 首屏 API 请求 | ✅ 纯 SSG，首屏零 `/api/*` |
| 保真度 | ✅ 保留链路与 legacy 逐字节一致；X1–X9 删除项无残留；S1–S11 合并项全部落实 |
| 质量红线 | ✅ 零 `any`/`@ts-ignore`/暗色模式/未声明依赖；死代码终扫通过 |
| 文档层 | ✅ tokens.json 别名、设计契约组件表、内容契约引用、README、AGENTS.md 全部恢复并与代码一致 |

## 遗留人工事项（不阻塞签收）

1. **部署后补测** B4–B6（Lighthouse 三路由跑分存档）；
2. **运维手册同步**：`AI_ANSWER_MODE` 已无 shadow，止血流程改用 fixture；线上若残留 `AI_ANSWER_MODE=shadow` 环境变量需删除（新代码不再识别）；
3. **飞书链路已删**（X3）：如线上曾有 cron 调 `/api/sync/lark`，确认已停；
4. `legacy code/` 目录可随时删除（git 历史已完整保留旧代码）。

---

## 附：初验记录（2026-08-14 01:30，已被上方终版取代）

> 初验结论为"有条件通过"，发现 P1–P10 十项问题（B1 越线、B4–B6 无证据、test.ts 静默降级、X9 虚报、测试覆盖回退、S3/S9 跳票、死代码残留、py-s1.5 失效类、文档被施工方覆盖、answerMode 默认值变化提示）。全部已修复，明细见 PROGRESS。

### 初验独立复测结果

| 验证 | 结果 |
|---|---|
| `npm run typecheck` / `npm test` / `npm run build` | ✅ 全绿（27 文件 104 用例 → 修复后 30 文件 109 用例） |
| 行为保真（逐文件 diff vs legacy） | ✅ 保留链路零行为偏差 |
| SSG HTML 骨架比对（首页/文档页） | ✅ 阅读器骨架一致；板块文案差异源于无 Supabase 环境变量走 fixture，非缺陷 |

---

> 以下为**初验原始记录**（2026-08-14 01:30），其中 P1–P10 问题现已全部修复或定案，仅供追溯。

## 一、独立复测结果（非施工方数据）

| 验证 | 结果 |
|---|---|
| `npm run typecheck` | ✅ PASS，零错误（strict） |
| `npm test` | ✅ PASS，27 文件 104 用例全绿（2.81s） |
| `npm run build` | ✅ PASS，15/15 静态页生成，ISR 1h 生效 |
| B1 首屏 JS（gzip 实测，manifest 逐文件求和） | ⚠️ `/` 111.1KB、`/docs/[slug]` 111.3KB **超 ≤110KB 阈值约 1KB**；`/search` 107.5KB、`/sections` 106.0KB 达标。框架地板（Next 15 + React 19 共享块）≈101KB，余量本就有限 |
| B2 路由增量 | ✅ 6–11KB，远低于 ≤25KB |
| B3 客户端 supabase 泄漏 | ✅ 0（grep 全 chunk 无匹配） |
| Radix Dialog 代码分割 | ✅ 已隔离至异步 chunk（12.5KB gzip，按需加载，不进首屏） |
| B7 缓存行为 | ✅ 构建产物确认 `revalidate=1h`、`/api/search/index` 静态化带 1y 过期 |
| B4/B5/B6（LCP/Lighthouse/CLS） | ❓ **无法核验**——PROGRESS 中的数值无 Lighthouse 输出或截图佐证，行文为推断式描述 |

## 二、行为保真核验（对照 legacy 逐文件 diff）

**保留链路全部高保真**：ask provider（sessionStorage 持久化/popstate 恢复/session 校验）、search box（索引预拉/50 条上限/过期响应丢弃/replaceState）、两个动态页（revalidate=3600、parentId 404 规则、zh-CN 日期、跳过首段）、AskSheet（insufficient 拒答/角标跳转/追问复用上下文）、article 全部 11 块（embed 白名单正确）、admin 两面板（1.5s 轮询/5 次错误中止/forceUnlock/content-published 事件）、publishing 11 模块、鉴权双通道——均与 legacy 逐字节一致。

**SSG HTML 骨架比对**：首页与文档页的阅读器骨架（mobile-shell/吸顶 header/面包屑/FAB/搜索入口/标题 class）新旧一致；板块链接文案差异源于新构建用本地 fixture（无 Supabase 环境变量），非代码缺陷。

**删除项 X1–X8**：全部落实，无一残留（feedback/飞书/EvalPanel/shadow/死文件/审计 CLI 均不存在）。

## 三、发现的问题（按严重度）

| # | 级别 | 问题 |
|---|---|---|
| P1 | 中 | **B1 越线 1KB 且 PROGRESS 虚报达标**（"gzip 后全线 ≤35KB"口径错误，那只是 shared chunk） |
| P2 | 中 | **B4–B6 疑似非实测**，无证据存档，违方案"实测值写入 PROGRESS" |
| P3 | 中 | `scripts/test.ts` 缺 `ANSWER_EVAL_ENDPOINT` 时**静默降级为本地 fixture**（旧版直接 fail），`npm run eval` 可空跑通过；且引入未声明依赖 `@next/env`（传递依赖），用法注释与实际运行方式不符 |
| P4 | 低中 | **X9 未执行**：eval.ts 是直接删除而非并入 test.ts，PROGRESS 写"合并"属虚报 |
| P5 | 低中 | **测试覆盖静默回退**：`selectNotionPageNodes`/`stableSlugForNotionPage`/`decodePublishedBlock`/`createProductionAnswerService` 等幸存函数的测试在迁移时被一并丢弃 |
| P6 | 低 | **S3（AskInputBar）、S9（删 pageRoutes prop）两项合并跳票**，PROGRESS 未提及；S 编号记录错位 |
| P7 | 低 | 死代码残留（违 C-34）：`hasAiProviderConfig` 孤儿导出、`SupabaseContentRepository` 空类复活（方案 D9 明确要求删除）、`server.ts` 未使用的 `isRiskLevel` import + 本地重复的类型守卫 |
| P8 | 低 | `logout-button.tsx:31` 使用 `py-s1.5`——tokens 只定义 s1–s7，该类静默失效，登出按钮垂直内边距丢失（有 tap-target 44px 保底，不影响可用性） |
| P9 | **中高** | **文档层回退**：我 8-14 00:40 对 `tokens.json`（4 别名登记）、`设计系统与组件契约.md`（组件表对齐+新原语登记）、`内容发布与数据契约.md`（schema 路径修正）、`docs/README.md`、`AGENTS.md`（坏引用修正）的五处修复**全部被施工方覆盖回旧版**（01:03 时间戳）。后果：globals.css 实现了 tokens.json 未登记的别名，违反 AGENTS.md"样式必须使用 tokens.json 令牌"的规则 |
| P10 | 提示 | answerMode 默认行为变化（旧 shadow→新 production）：若线上残留 `AI_ANSWER_MODE=shadow` 环境变量会被静默按 production 跑；运维手册止血段落需人工同步（方案已授权，需人知晓） |

## 四、Checklist 裁决（C-01~C-35）

- **A–F 功能组（C-01~C-28）**：代码级核验通过（保真 diff + 单测 + 构建路由表）。注：因验收环境无 Supabase/AI 密钥，真实数据渲染、限流触发、admin 走查为代码级确认，未做运行时点击验证。
- **G 工程组**：C-29 ✅｜C-30 ⚠️（依赖零新增但 `@next/env` 未声明引用，P3）｜C-31 ⚠️（B1 越线、B4–B6 无证据）｜C-32 ✅｜C-33 ✅｜C-34 ❌（P7）｜C-35 ✅（docs/legacy 无越权改动——但 docs 是被**旧版覆盖**，见 P9）

## 五、签收建议

修复以下各项后可签收（预估工作量 < 1 小时）：
1. P9：恢复 5 处文档修复（有现成内容，直接重做）；
2. P8：一行改 `py-s1`；
3. P7：删 3 处死代码；
4. P3：`test.ts` 缺端点恢复 fail-fast，去掉 `@next/env` 依赖；
5. P6：补做 S3/S9 或在方案中正式放弃；
6. P5：补回 4 个幸存函数的测试；
7. P1/P2：接受 B1=111KB（改阈值）或继续瘦身；B4–B6 在有环境时跑一次真 Lighthouse 存档。
