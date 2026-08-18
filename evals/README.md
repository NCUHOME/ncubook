# AI 可溯源问答评测基准 (evals/)

本目录包含“此间”AI 校园知识库问答系统的**全量基准评测题库 (Benchmark Dataset)** 与评测规范。

---

## 1. 评测题库规范 (`evals/test.json`)

题库收录涵盖南昌大学校园生活的六大核心领域真实学生提问，每个用例均定义了严格的事实边界与预期依据：

| 字段名 | 类型 | 说明 |
| :--- | :--- | :--- |
| `id` | `string` | 用例唯一标识符 |
| `question` | `string` | 学生自然语言提问内容 |
| `category` | `string` | 业务分类（如 `网络卡证`, `教务选课`, `生活设施`, `医疗安全` 等） |
| `expectedAnswerable` | `boolean` | 是否在校园知识库范围内属于“可回答”问题（`false` 代表应主动拒答） |
| `riskClass` | `string` | 风险等级：`normal`（普通）、`sensitive`（敏感高危事实）、`out-of-scope`（超纲） |
| `mustInclude` | `string[]` | 回答应包含的核心事实关键词（至少命中） |
| `mustNotInclude` | `string[]` | 回答严禁出现的幻觉词汇或错误事实 |
| `expectedPageSlug` | `string` | 预期引用的标准知识库页面 Slug |

---

## 2. 核心评测质量红线 (Quality Thresholds)

系统评测必须同时满足以下 6 项量化硬指标方可通过门禁：

1. **引文有效率 (Citation Validity)**: $\ge 90\%$（所有断言必须附带真实站内引文）；
2. **主动拒答准确率 (Abstention Accuracy)**: $\ge 85\%$（对未收录事实坚决拒答，防胡编乱造）；
3. **事实准确率 (Factuality Rate)**: $\ge 85\%$（严格命中 `mustInclude` 并避开 `mustNotInclude`）；
4. **敏感事实失真率 (Unsupported Sensitive Claims)**: $= 0\%$（零容忍敏感虚构）；
5. **禁用幻觉率 (Forbidden Hallucinations)**: $= 0\%$（零容忍出现违规幻觉词）；
6. **P95 响应延迟 (P95 Latency)**: $\le 8000\text{ ms}$。

---

## 3. 运行评测命令

### 3.1 离线算法基线评测 (Mock)
无需启动线上服务，基于算法引擎规则基线运行快速评测：
```bash
npm run eval -- --mock
```

### 3.2 本地/线上实时服务评测
指定问答接口 URL，发起真实全量提问评测并生成详细指标报告：
```bash
# 评测本地开发环境
ANSWER_EVAL_ENDPOINT="http://localhost:3000/api/ask" npm run eval

# 评测 EdgeOne 线上生产环境
ANSWER_EVAL_ENDPOINT="https://book.ncuos.com/api/ask" npm run eval
```

### 3.3 评测用例同步至数据库 (Seed)
将 `test.json` 中的 36 道基准题写入 Supabase 的 `evaluation_cases` 表，供管理后台在线评测面板读取：
```bash
npm run seed:evals
```
