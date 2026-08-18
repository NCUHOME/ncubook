# 运维与自动化工具脚本 (scripts/)

本目录包含“此间”系统的发版同步、评测题库导入、质量基线评估与性能冒烟审计等 CLI 脚本。

---

## 脚本索引速查

| 脚本文件 | npm 快捷命令 | 主要功能 |
| :--- | :--- | :--- |
| [`scripts/publish.ts`](scripts/publish.ts) | `npm run publish:all`<br>`npm run publish:dry` | 直连 Notion 与 Supabase 发起全量发布、预检校验或版本回滚 |
| [`scripts/seed-evals.ts`](scripts/seed-evals.ts) | `npm run seed:evals` | 将 `evals/test.json` 中的评测用例批量导入/更新至 Supabase |
| [`scripts/eval.ts`](scripts/eval.ts) | `npm run eval` | 运行 AI 问答系统的准确率、事实符合率与防幻觉质量评测 |
| [`scripts/audit-routes.ts`](scripts/audit-routes.ts) | `npm run audit:routes` | 生产路由探针审计（状态码、TTFB、HTML 体积与关键标签校验） |

---

## 常用命令详解

### 1. 同步与发布 Notion 文章
```bash
# 全量同步 Notion 文章并写入生产数据库（自动切线）
npm run publish:all

# 预检模式（仅拉取与校验格式，不写入数据库）
npm run publish:dry

# 仅发布特定 ID 的 Notion 页面
npx tsx scripts/publish.ts --page <NOTION_PAGE_ID>

# 一键回滚线上版本至历史指定版本号
npx tsx scripts/publish.ts --rollback content-20260818151638454
```

### 2. 评测题库入库
```bash
# 读取 evals/test.json 并同步至 Supabase evaluation_cases 表
npm run seed:evals
```

### 3. AI 问答基线与质量评测
```bash
# 离线模拟基线评测（门禁 CI 专用，无需耗费 Token）
npm run eval -- --mock

# 对本地/线上接口执行全量提问压测与指标计算
ANSWER_EVAL_ENDPOINT="http://localhost:3000/api/ask" npm run eval
```

### 4. 生产页面冒烟与性能审计
```bash
# 审计本地生产产物 (需先 build 并 start)
npm run audit:routes -- --url http://localhost:3000

# 审计线上生产环境
npm run audit:routes -- --url https://book.ncuos.com
```
