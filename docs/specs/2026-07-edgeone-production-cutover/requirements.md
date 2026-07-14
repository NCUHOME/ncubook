# Requirements：EdgeOne 生产切换与 DeepSeek V4 Flash

状态：已批准，2026-07-14。批准依据为项目负责人明确要求保留原域名、继续使用腾讯 EdgeOne Pages，并使用 `deepseek-v4-flash` 完成问答后上传 GitHub 部署。

## E1：生产入口保持不变

- 学生继续通过 `https://book.ncuos.com` 访问产品。
- 腾讯 EdgeOne Pages/Makers 是新版 `mobile-web` 的生产部署平台；Vercel 预览地址不得成为对外正式入口。
- 旧 Docusaurus revision 必须保留可部署，并形成可执行的入口回滚路径。

## E2：EdgeOne 上完整保留学生端能力

- 首页、板块、文档、关键词搜索和 AI 问答均可在生产域名正常使用。
- 关键词搜索仍只返回匹配文档与具体段落，不调用生成模型。
- 文档内容继续读取 Supabase 当前已发布 `contentVersion`，最终用户不访问 Notion。

## E3：AI 使用 DeepSeek V4 Flash

- 生成模型使用 DeepSeek 官方 OpenAI-compatible Chat Completions API，模型标识固定为 `deepseek-v4-flash`。
- DeepSeek 不承担 embedding；问答检索先使用当前发布库的 trigram/substring 词法召回，保留未来接入单独 embedding provider 的扩展点。
- 回答必须继续遵守 `docs/product/answer-evidence-contract.md`：无可靠来源则返回 `insufficient`，事实性 claim 必须有站内 citation。
- `AI_ANSWER_MODE` 在评测通过前为 `shadow`；通过既有答案评测与真实 smoke test 后才可设为 `production`。

## E4：密钥不进入客户端或 Git

- DeepSeek Key、Supabase service role key、Notion token 和发布管理 token 只存在于 EdgeOne 加密环境变量。
- 禁止使用 `NEXT_PUBLIC_` 前缀，禁止写入源码、提交记录、构建产物、浏览器响应或日志。
- 用户在对话中提供的 DeepSeek Key 在首次上线完成后应轮换。

## E5：可验证、可回滚地上线

- 先部署 EdgeOne preview，完成主要路由、搜索、问答、citation、手机视口和性能 smoke test。
- preview 通过后再将生产 deployment 指向同一已验证 revision，并绑定现有域名。
- 任何主路径 5xx、内容版本混合、搜索失效、citation 失效或 AI 无来源事实输出均阻断切换或触发回滚。

