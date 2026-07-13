# AI 回答与证据契约

状态：首版约束

## 事实性回答的最低标准

- 每一个事实性结论必须至少关联一条可用 citation；citation 仅可引用已发布内容版本。
- 无可用 citation 时，AI 不得给出事实性结论，必须说明资料不足、建议检索相关文档或提交反馈。
- 需要验证或敏感内容必须显式标记风险等级，不能用流畅措辞掩盖不确定性。

```ts
type Citation = {
  id: string;
  pageId: string;
  pageTitle: string;
  anchor: string;             // b-<sourceBlockId>
  contentVersion: string;
  excerpt: string;
  sourceUrl?: string;
};

type AnswerClaim = {
  id: string;
  text: string;
  citationIds: string[];
  status: "grounded" | "needs-verification" | "insufficient";
};

type AnswerSession = {
  id: string;
  question: string;
  pageContext?: { pageId: string; anchor?: string };
  citations: Citation[];
  claims: AnswerClaim[];
  confidence: "grounded" | "partial" | "insufficient";
};
```

## 展示与返回行为

- 每一个事实性结论对应一个 `AnswerClaim`；其 `citationIds` 必须引用 `citations` 中至少一个有效 ID。一个 citation 可支撑多个 claim，但每个关联须可人工审阅。
- UI 必须把每个 claim 的引用显示在该 claim 附近；citation 显示页面标题与段落摘录，并可跳到该 anchor。
- `grounded`：所有事实性 claims 都有可用 citation；`partial`：明确分隔已证实 claims 和待核实 claims；`insufficient`：不输出事实性 claims。
- 从回答跳到来源时，URL 或客户端状态必须携带 `answerSession`；返回操作恢复同一回答、滚动位置和输入草稿。
- 页面上下文仅影响检索优先级，不得隐藏与当前页面矛盾或更权威的来源。
