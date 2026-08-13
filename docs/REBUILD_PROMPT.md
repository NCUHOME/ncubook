# 网站重建执行提示词（供 Antigravity IDE / Gemini 使用）

> 用法：每次开工把下面整段发给执行 Agent，把【本次范围】中的 `M__` 替换为当次要做的里程碑编号（1 个，最多 2 个）。

---

请执行网站重建任务。工作目录是 `C:\chengxu\ncubook`（Windows 环境）。唯一施工依据是 `docs/REBUILD_PLAN.md`（下称"方案"），旧代码全集在 `"legacy code/"` 目录（路径含空格，命令行中必须加引号）。

【开工前】

1. 通读 `docs/REBUILD_PLAN.md` 全文，重点：2.2 功能去留决策表（哪些删除/简化/保留）、第三章目标架构、第五章你本次要做的里程碑、附录 A（⚠️ 待确认事项及默认动作）、附录 B（执行纪律）；
2. 阅读 `docs/REBUILD_PROGRESS.md`（如存在）：按其中记录恢复上下文，从上次中断处继续，不重做已完成的工作；
3. 确认处于 `rebuild/v2` 分支（不存在则 `git checkout -b rebuild/v2`，已存在则 `git checkout rebuild/v2`）；
4. 若是首次开工（根目录无 `package.json`）：按方案 M1 第 1、2 步初始化——`.gitignore` 追加 `legacy code/` 和 `tsconfig.tsbuildinfo`，从 `"legacy code/"` 拷贝工程配置（`tsconfig.json` 与 `vitest.config.ts` 的 `exclude` 须追加排除 `legacy code`），然后在根目录执行 `npm install`；
5. 施工前必读契约文档：`docs/product/产品愿景与AI策略规范.md`、`docs/product/内容发布与数据契约.md`、`docs/design/设计系统与组件契约.md`、`docs/design/tokens.json`。

【本次范围】只执行里程碑 M__（填入 1 个，最多 2 个；共 M1–M4 四个里程碑），严格按方案第五章对应小节的"涉及文件 / 关键工作 / 完成定义"施工；功能删除范围以方案 2.2 决策表为唯一依据，表外功能不得删。

【执行规则】

1. 迁移任何文件前，先读 `"legacy code/"` 中的同名原始实现（方案 3.3 映射表的"旧文件"列路径均以 `legacy code/` 为前缀），严禁凭印象重写 UI 布局、交互与文案；
2. `"legacy code/"` 目录只读：永不修改、删除、移动其中任何文件；
3. 不新增方案外的功能，不引入方案外的依赖，不修改 `docs/` 下任何文档（发现文档与代码矛盾时记入 `docs/REBUILD_PROGRESS.md`，不自行改文档）；
4. 遇到方案中标注"⚠️ 待确认"的地方：按附录 A 对应条目的**默认动作**执行，不要停工等待，把所依据的条目编号与决策记入 `docs/REBUILD_PROGRESS.md`；若某事项无默认动作或默认动作明显不适用，跳过该部分、记录问题、继续不受影响的部分；
5. 每完成一个逻辑单元（一个文件、一个组件、一个里程碑步骤）就 `git commit` 一次，信息格式：`M<编号>: <简述>`（如 `M2: 重建 lib/content 数据层`），保证中断后可回滚、可续作；
6. 所有新代码写在仓库根目录；类型必须过 strict 检查，禁止 `any`、`@ts-ignore`、静默 catch。

【完成前强制验证】在仓库根目录依次运行，必须全部通过，报错当场修复后重跑：

```bash
npm run typecheck
npm run build
npm test
```

（M1 阶段测试尚未迁入时，`npm test` 可跳过，但必须在 PROGRESS 中注明跳过原因。）

【收尾】

- 把以下内容写入 `docs/REBUILD_PROGRESS.md`（追加，不覆盖历史）：本次完成的里程碑与逻辑单元、修改/新建文件清单、运行的验证指令及结果、⚠️ 待确认事项的实际处理（依据的默认动作）、遗留问题与下一个里程碑的入口提示；
- 汇报："里程碑 M__ 执行完毕，构建验证通过"，并列出遗留问题（如有）。
