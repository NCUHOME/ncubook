---
title: 参与贡献
sidebar_position: 1
---

# 参与贡献

感谢你有兴趣为南昌大学生存手册做出贡献！本手册是一个开放的 Wiki 项目，**每一位南昌大学同学都可以参与编写和完善**。

---

## 🚀 快速开始（在线编辑）

最简单的贡献方式是直接在网页上编辑：

1. **找到要编辑的页面** — 浏览手册，找到你想修改或补充的内容
2. **点击「编辑此页」** — 每个文档页面底部都有一个「编辑此页」链接
3. **在 GitHub 上编辑** — 点击后会跳转到 GitHub，你可以直接在浏览器中编辑
4. **提交修改** — 编辑完成后，GitHub 会引导你创建一个 Pull Request（PR）
5. **等待审核** — 维护者会审核你的修改，通过后即会自动发布

:::tip 不需要任何编程基础！
使用 GitHub 在线编辑功能，你只需要一个 GitHub 账号即可参与贡献。
:::

---

## 💻 本地开发（进阶）

如果你想进行更大的改动（如新增章节、调整结构），可以在本地开发：

### 1. Fork 并克隆仓库

```bash
# Fork 仓库后，克隆你的 fork
git clone https://github.com/你的用户名/ncubook.git
cd ncubook
```

### 2. 安装依赖

```bash
# 需要安装 Node.js >= 18 和 pnpm
pnpm install
```

### 3. 启动开发服务器

```bash
pnpm start
```

浏览器会自动打开 `http://localhost:3000`，你可以实时预览修改效果。

### 4. 编写内容

在 `docs/` 目录下添加或修改 Markdown 文件。文件结构：

```
docs/
├── README.mdx          # 首页
├── courses/            # 📚 课程
├── study/              # 🎓 学习
├── life/               # 🏠 生活
├── experience/         # 💼 经验包
├── yellow-pages/       # 📒 黄页
└── contributors/       # 👥 贡献者
```

### 5. 提交 PR

```bash
git add .
git commit -m "docs: 描述你的修改内容"
git push origin main
```

然后在 GitHub 上创建 Pull Request。

---

## 📝 文档规范

### Markdown 基本格式

```markdown
---
title: 文章标题
sidebar_position: 1    # 在侧边栏中的排序位置
---

# 文章标题

正文内容...

## 二级标题

更多内容...
```

### 注意事项

- 使用**中文标点**（如「」而非 ""）
- 图片请尽量压缩后上传到 `static/img/` 目录
- 链接到站内其他页面使用相对路径，如 `[学分与绩点](/docs/study/credits-gpa)`
- 不确定格式？参考已有文档的写法即可

---

## 🤝 贡献类型

我们欢迎各种形式的贡献：

| 类型 | 说明 |
|------|------|
| 📄 **内容补充** | 补充现有文档缺少的信息 |
| ✏️ **错误修正** | 纠正过时或错误的信息 |
| 📝 **新增文档** | 撰写全新的指南或经验分享 |
| 🎨 **改善排版** | 优化文档结构和可读性 |
| 🐛 **Bug 反馈** | 报告网站问题或链接失效 |

---

## ❓ 常见问题

**Q: 我不会用 GitHub 怎么办？**

你也可以通过以下方式投稿：
- 发送邮件到 `book[AT]nchuhome.club`
- 在 [GitHub Discussions](https://github.com/NCUHOME/NCU-Book/discussions) 发帖
- QQ 联系 [1056385156](https://qm.qq.com/q/CEMWqoZdAW?from=tim)

**Q: 我的修改多久会发布？**

PR 被合并后，GitHub Actions 会自动构建和部署，通常几分钟内就能在 `book.ncuos.com` 上看到更新。
