# 此间 (NCU Book) - 南昌大学 AI 校园知识库

面向手机端（Mobile-First）的南昌大学校园百科与可溯源 AI 问答产品。

- **内容真源**：Notion 是私有编辑源，经过转换、资源镜像与索引构建后，原子发布至 Supabase。学生端独立访问，不依赖 Notion；
- **可溯源问答**：AI 问答严格锚定站内指南，每个观点事实均附带精确到段落的站内出处（Citation）；
- **生产运行平台**：基于 Next.js 15（SSG + ISR 混合渲染）构建，部署于腾讯云 EdgeOne Pages。

---

## 📚 项目各子系统文档索引

本项目在各个核心子目录下均维护了专业详尽的架构与模块说明文档：

| 模块目录 | 核心职责 | 详细文档导航 |
| :--- | :--- | :--- |
| **`app/`** | Next.js 15 App Router 页面路由、渲染模式（SSG/ISR）与 Node.js API 端点 | 📖 [应用与路由架构 (`app/README.md`)](app/README.md) |
| **`src/`** | UI 组件设计系统、“编辑黑白”视觉美学、44px+ 触控契约与无障碍标准 | 🎨 [组件系统与设计契约 (`src/README.md`)](src/README.md) |
| **`lib/`** | AI 可溯源问答引擎 (RAG)、Notion 远程发布管线、内容读取层与类型定义 | 🧠 [核心业务领域与算法库 (`lib/README.md`)](lib/README.md) |
| **`supabase/`** | 数据库 Schema DDL、单一指针原子切线、不可变快照、6 版本留存与 RPC 存储过程 | 🗄️ [数据库架构与功能全景 (`supabase/README.md`)](supabase/README.md) |
| **`docs/`** | 产品定位规范、设计令牌 (`tokens.json`)、数据契约与生产部署回滚手册 | 📑 [产品设计与运维文档中心 (`docs/README.md`)](docs/README.md) |
| **`evals/`** | 36+ 题真实南大校园问题评测基准题库、动态飞轮入库与 6 大质量红线指标 | 🧪 [AI 问答质量评测基准 (`evals/README.md`)](evals/README.md) |
| **`scripts/`** | 一键发版同步、评测种子入库、基准回归与生产路由探针等 CLI 运维工具 | 🛠️ [运维与自动化脚本工具 (`scripts/README.md`)](scripts/README.md) |
| **`tests/`** | 204 项自动化单测（46 组套件）、管理全域数据流转、学生端公共接口、组件交互测试、API 集成测试与 Schema 防漂移门禁 | 🛡️ [自动化测试套件与门禁 (`tests/README.md`)](tests/README.md) |

---

## 🚀 快速上手与本地开发

### 1. 环境准备与启动

```bash
# 安装依赖
npm ci

# 启动本地开发服务器 (默认运行于 http://localhost:3000)
npm run dev
```

### 2. 质量门禁与验证

在提交代码前，必须全量通过以下门禁：

```bash
# 1. 严格类型检查 (0 errors)
npm run typecheck

# 2. 代码规范检查
npm run lint

# 3. 运行全部 204 项单元与集成测试 (100% pass)
npm test

# 4. 验证 Next.js 生产打包构建
npm run build
```

---

## 🌐 运维与生产部署

- **持续集成与发布**：代码推送到 `main` 分支后，EdgeOne 会自动触发极速构建与全网 CDN 边缘分发；
- **紧急止血与版本回滚**：支持通过管理后台（`/admin`）或 CLI 脚本（`npx tsx scripts/publish.ts --rollback <VERSION>`）在 1 秒内原子切换线上指针至任意历史快照；
- 详见 [`docs/operations/生产部署与应急回滚手册.md`](docs/operations/生产部署与应急回滚手册.md)。
