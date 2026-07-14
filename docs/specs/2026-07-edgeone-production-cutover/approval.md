# Approval record：EdgeOne 生产切换与 DeepSeek V4 Flash

## Gate E：允许实现并执行 EdgeOne 切换

- 状态：approved
- 批准人：项目负责人 water
- 批准日期：2026-07-14
- 批准范围：保留 `book.ncuos.com` 与腾讯 EdgeOne Pages/Makers 作为生产入口；新版继续具备关键词搜索和 AI 问答；生成模型使用 `deepseek-v4-flash`；完成后上传 GitHub 并部署 EdgeOne。
- 密钥约束：用户提供的 Key 只允许进入部署平台服务端加密环境变量，不得提交 Git 或暴露给浏览器。
- 审阅修正：对话中出现的 Key 视为已暴露，不进入任何远端环境；Gate E 不启用远程 Notion 发布，也不向 EdgeOne 配置 Notion/publisher 写凭据。
- 回滚约束：旧 Docusaurus deployment 必须保留可恢复。
- 批准原话：项目负责人明确表示“对啊，就应该这样。使用 deepseek v4 flash 的模型……改完后上传 github 部署到 edgeone 上”。
