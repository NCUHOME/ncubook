# 自动化测试套件 (tests/)

本项目采用 **Vitest + React Testing Library** 构建全方位的单元测试、组件交互测试、API 路由集成测试与防漂移门禁测试。

---

## 1. 测试目录结构

```text
tests/
├── api/            # API 路由测试（/api/ask, /api/search, /api/admin/* 等鉴权与限流）
├── components/     # 核心 UI 组件与交互测试（AdminDashboard, Search, Drawer, Sheet, Tokens 等）
├── integration/    # 端到端集成测试（Citation 引用可溯源、搜索链路等）
├── lib/            # 核心领域逻辑测试
│   ├── ai/         # AI 问答引擎、Grounding 事实校验、Prompt 模板与评测
│   ├── content/    # 内容分词、模式校验与检索算法
│   ├── publishing/ # Notion 发布引擎、Block 解析、资源镜像与分块暂存
│   └── database.schema-drift.test.ts # Supabase DDL 与 TypeScript 类型防漂移门禁
├── pages/          # 关键页面组件渲染测试（Home, Doc, Search）
├── metadata.test.ts # 站点元数据与 OpenGraph 校验
└── seo.test.ts     # SEO 标签与语义化结构校验
```

---

## 2. 运行测试命令

```bash
# 运行全量单测（单次执行，用于 CI 门禁）
npm test

# 交互式监听模式（热重载，用于本地驱动开发）
npm run test:watch

# 仅运行指定目录或文件的测试
npx vitest run tests/lib/publishing/
npx vitest run tests/api/search.test.ts
```

---

## 3. 防漂移门禁契约 (Schema Drift Guard)

`tests/lib/database.schema-drift.test.ts` 会在每次运行测试时：
1. 静态解析 `supabase/schema.sql` 中的所有 `create table`、字段定义和 `create function` 存储过程；
2. 静态解析 `lib/database.types.ts` 中的 TypeScript 接口契约；
3. 执行**双向无遗漏严格比对**，若发现任何字段缺失、类型不匹配或 RPC 签名漂移，门禁将立即拦截失败。
