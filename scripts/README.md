# 运维与自动化工具脚本设计说明 (scripts/)

本文档全面阐述「此间 (NCU Book)」发版同步、评测题库导入、质量基线评估与生产路由审计等 CLI 运维工具的设计架构与操作手册。

---

## 1. 核心架构设计原则

所有脚本均位于 `scripts/` 目录，通过 `npx tsx` 或 `package.json` 中的 npm 快捷指令运行，具备以下核心原则：

```text
开发者 / CI 调度 ──► npm run publish:all ──► scripts/publish.ts
                             │                        │
                             ▼                        ▼
                   [Notion API Client]        [Supabase Admin Client]
                     读取 43 篇页面树           分块暂存 + 瞬时原子切线
```

1. **环境自愈与严格校验**：所有脚本自动通过 `@next/env` 加载 `.env.local` 与 `.env.production`，缺少必要密钥时明确提示并快速失败；
2. **幂等性与零副作用预检**：支持 `--dry-run` 模式，拉取并验证文章结构与图片资源，不向数据库写入任何脏数据；
3. **极速并发与容错降级**：图片镜像采用受控并发（Concurrency=3），遭遇 403/404 历史死链瞬时降级为透明占位图，确保发布在 30~45 秒内全量完成；
4. **CI/CD 无缝集成**：所有脚本执行完毕均返回标准退出码（`exit(0)` 或 `exit(1)`），便于在流水线中作为阻断门禁。

---

## 2. 脚本清单与参数字典

| 脚本文件 | npm 指令 | 核心职责 | 参数选项与环境变量 |
| :--- | :--- | :--- | :--- |
| **`publish.ts`** | `npm run publish:all`<br>`npm run publish:dry` | **Notion 同步发版管线**。拉取 Notion 页面树、Block 转换、图片镜像、分块暂存、版本切线与回滚。 | `--all`: 全量发版<br>`--dry-run`: 预检不写库<br>`--page <ID>`: 单页发布<br>`--rollback <VER>`: 切线回滚 |
| **`seed-evals.ts`**| `npm run seed:evals` | **评测题库入库**。读取 `evals/test.json` 中的 36 题基准，upsert 写入 Supabase `evaluation_cases`。 | 无需额外参数，依赖 `SUPABASE_SERVICE_ROLE_KEY`。 |
| **`eval.ts`** | `npm run eval` | **AI 问答质量评估**。对指定问答接口进行全量自动化评测，计算归因合规率、事实符合率与 P95 延迟。 | `--mock`: 离线算法基线<br>`ANSWER_EVAL_ENDPOINT`: 指定目标接口 URL |
| **`audit-routes.ts`**| `npm run audit:routes`| **生产路由探针审计**。自动扫描核心页面的 HTTP 状态码、首包时间 (TTFB) 与关键 HTML 标签。 | `--url <BASE_URL>`: 目标站点根地址 (默认 `http://localhost:3000`) |

---

## 3. 系统能力矩阵（运维脚本能做什么）

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        运维工具核心能力全景                            │
├──────────────────┬──────────────────┬──────────────────────────────────┤
│ 业务场景         │ 对应 CLI 命令    │ 运维表现与效果                   │
├──────────────────┼──────────────────┼──────────────────────────────────┤
│ 1. 线上全量同步  │ publish:all      │ 30秒完成43篇指南发版并更新CDN缓存│
│ 2. 发版前结构预检│ publish:dry      │ 零写库校验文章排版与外链完整性   │
│ 3. 紧急故障回滚  │ publish --rollback 1秒内原子将线上切线至历史任意版本 │
│ 4. 评测基准同步  │ seed:evals       │ 批量写入36题黄金评测集           │
│ 5. 质量自动化回归│ eval --mock      │ 4秒内完成算法基线量化评估        │
│ 6. 站点健康巡检  │ audit:routes     │ 自动化断言全站路由 200 与 TTFB   │
└──────────────────┴──────────────────┴──────────────────────────────────┘
```

---

## 4. 详细操作示例与最佳实践

### 4.1 Notion 文章全量同步与发布
```bash
# 全量同步 Notion 文章并写入生产数据库（自动切线 + 自动保留最近 6 个版本）
npm run publish:all

# 预检模式（仅抓取与转换格式，不向 Supabase 写入任何数据）
npm run publish:dry

# 发布指定单个 Notion 页面
npx tsx scripts/publish.ts --page 6cecddfd-3b9d-46dd-b6f6-fd458c011cbf

# 紧急切线回滚至历史版本
npx tsx scripts/publish.ts --rollback content-20260818151638454
```

### 4.2 评测题库种子导入
```bash
# 读取 evals/test.json 并同步写入 Supabase evaluation_cases 表
npm run seed:evals
```

### 4.3 AI 问答全量评测
```bash
# 离线模拟基线评测（CI 专用，秒级完成，零 Token 消耗）
npm run eval -- --mock

# 评测本地开发环境
ANSWER_EVAL_ENDPOINT="http://localhost:3000/api/ask" npm run eval

# 评测 EdgeOne 生产环境
ANSWER_EVAL_ENDPOINT="https://book.ncuos.com/api/ask" npm run eval
```

### 4.4 生产路由健康巡检
```bash
# 巡检本地生产构建产物
npm run audit:routes -- --url http://localhost:3000

# 巡检 EdgeOne 生产线上环境
npm run audit:routes -- --url https://book.ncuos.com
```
