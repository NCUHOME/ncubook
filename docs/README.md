# 此间 (NCU Book) - 文档索引中心

> [!NOTE]
> “此间”（南昌大学 AI 知识产品）采用 **Notion 作为编辑真源**，基于 **Next.js 15 SSG + ISR 极速渲染** 与 **Supabase 强类型可溯源问答** 架构构建。

---

## 📚 核心文档导航

### 1. 产品与 AI 规范 (`docs/product/`)
- [产品愿景与 AI 策略规范](product/产品愿景与AI策略规范.md)：产品定位、移动端信息架构、AI 安全边界、防幻觉策略与 Citation 引用证据链契约。
- [内容发布与数据契约](product/内容发布与数据契约.md)：Notion 页面树写作约定、富块转换算法、资源镜像策略、Supabase `Database` Schema 类型契约与飞书问卷留白扩展。

### 2. 设计系统 (`docs/design/`)
- [设计系统与组件契约](design/设计系统与组件契约.md)：“编辑黑白”视觉排版原则、Lucide 图标语义表、44px+ 触控契约与前端 UI 组件职责描述（与 `src/components` 一一对应）。
- [设计令牌数据源 (tokens.json)](design/tokens.json)：全局颜色、字体、字号、间距、圆角与阴影语义令牌（含 accent/alert/pill/subtle 兼容性别名）。

### 3. 运维部署 (`docs/operations/`)
- [生产部署与应急回滚手册](operations/生产部署与应急回滚手册.md)：EdgeOne / Vercel 部署矩阵、`CRON_SECRET` 防护与限流策略、Staging 演练与紧急止血回滚步骤。

### 4. 网站重建 (`docs/`)
- [重建执行方案 (REBUILD_PLAN.md)](REBUILD_PLAN.md)：现状盘点、去留决策、目标架构、性能预算、里程碑与验收核对表。
- [重建执行提示词 (REBUILD_PROMPT.md)](REBUILD_PROMPT.md)：供外部编码 Agent 每次开工使用的标准提示词。
- [重建验收报告 (REBUILD_ACCEPTANCE.md)](REBUILD_ACCEPTANCE.md)：终极验收结论与修复记录。

---

## 🛠️ 工程测试与评测划分

- **确定性代码单元测试 (`tests/`)**：运行 `npm test`，基于 Vitest 进行 38 个测试文件（共 136 个断言）的 UI 组件渲染、描述规范及逻辑 Schema 毫秒级断言。
- **类型系统检查 (`npx tsc --noEmit`)**：基于 `lib/database.types.ts` 对 Supabase 交互与应用层逻辑实施全覆盖强类型推导。
- **AI 质量与冒烟评测 (`evals/` & `scripts/`)**：运行 `npm run eval` 或 `npm run smoke`，针对真实模型准确率、防幻觉、拒答率与边缘节点连通性进行评测。
