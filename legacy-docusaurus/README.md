# 南昌大学生存手册（旧 Docusaurus 归档）

该目录只用于回滚与迁移对照。切换前生产 revision 为 `b0e4de1d4a6aaa8979777b4ded21e5d45d4c4088`；需要恢复生产时应优先从该 revision 重建，而不是把归档重新提升为根项目。

此间是南昌大学信息手册与 AI 问答项目，当前仓库包含：

- Docusaurus 文档站：目录 `docs/`、`src/`
- Next.js API 与运营后台：目录 `ncubook-api/`
- 内容运营与求职复盘材料：目录 `portfolio/`

## 本地开发

```bash
pnpm install
pnpm start
```

常用检查：

```bash
pnpm typecheck
pnpm build
pnpm test:notion-sync
```

API 子项目：

```bash
cd ncubook-api
npm install
npm run build
npm run check:admin
```

Supabase 迁移与 API 环境变量见 `ncubook-api/README.md`。

## 贡献指南

### 文档编写语法

|    语法    |                         链接                          |
| :--------: | :---------------------------------------------------: |
| Docusaurus |    <https://docusaurus.io/docs/markdown-features>     |
|  Markdown  | <https://daringfireball.net/projects/markdown/syntax> |
|    MDX     |                  <https://mdxjs.com>                  |
|   React    |               <https://react.dev/learn>               |
|  KaTeX  |                  <https://katex.org>                  |
|  Mermaid   |        <https://mermaid-js.github.io/mermaid>         |
