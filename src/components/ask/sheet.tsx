// 组件：AI 可溯源问答底部弹层，支持推荐提问 Chips、观点与依据溯源跳转（带 Flash 闪烁高亮）与答案有用性反馈
"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Sparkles, ThumbsUp, ThumbsDown } from "lucide-react";
import type { AnswerSession } from "@/lib/ai/session";
import { AskInputBar } from "@/src/components/ask/input-bar";
import type { AskStatus, PageContext } from "@/src/components/ask/provider";
import { HollamaMascot } from "@/src/components/primitives/hollama-mascot";
import { getFeishuFeedbackUrl } from "@/lib/feishu";
import { DEFAULT_AI_CONFIG, type AiConfig } from "@/lib/content/site-config";

type AskSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question: string;
  pageContext?: PageContext;
  draft: string;
  onDraftChange: (value: string) => void;
  onSubmit: (question: string) => void;
  status: AskStatus;
  session: AnswerSession | null;
  error: string;
  onCitationNavigate: () => void;
  resolvePageRoute: (pageId: string) => string;
};

export function AskSheet({
  open,
  onOpenChange,
  question,
  pageContext,
  draft,
  onDraftChange,
  onSubmit,
  status,
  session,
  error,
  onCitationNavigate,
  resolvePageRoute,
}: AskSheetProps) {
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);
  const [config, setConfig] = useState<AiConfig>(DEFAULT_AI_CONFIG);

  useEffect(() => {
    let active = true;
    fetch("/api/config")
      .then((res) => res.json())
      .then((res) => {
        if (active && res?.ok && res?.data?.ai_config) {
          setConfig(res.data.ai_config);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const handleCitationClick = (pageId: string, anchor?: string) => {
    onCitationNavigate();
    if (anchor && typeof window !== "undefined") {
      setTimeout(() => {
        const target = document.getElementById(anchor);
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "center" });
          target.classList.add("flash-highlight");
          setTimeout(() => {
            target.classList.remove("flash-highlight");
          }, 1800);
        }
      }, 250);
    }
  };

  const handleAnswerFeedback = (isHelpful: boolean) => {
    setFeedbackGiven(isHelpful);
    fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetType: "answer",
        targetId: question || "ai-answer",
        isHelpful,
      }),
    }).catch(() => {});
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-drawer bg-ink/45 backdrop-blur-[2px] animate-in fade-in duration-fast" />
        <Dialog.Content
          className="fixed inset-x-0 bottom-0 z-modal mx-auto max-w-2xl rounded-t-large bg-surface px-s5 pb-s6 pt-s5 shadow-floating focus:outline-none animate-in slide-in-from-bottom duration-fast"
          aria-describedby={undefined}
        >
          {/* 弹层顶部栏 */}
          <div className="flex items-center justify-between border-b border-line pb-s3">
            <div className="flex items-center gap-s2">
              <HollamaMascot size={26} />
              <div>
                <Dialog.Title className="text-body-large font-semibold text-ink">询问此间</Dialog.Title>
                <p className="text-caption text-muted">{config.assistantSubtitle}</p>
              </div>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="focus-ring tap-target grid place-items-center rounded-round text-muted hover:text-ink"
                aria-label="关闭回答"
              >
                <X className="size-icon" />
              </button>
            </Dialog.Close>
          </div>

          {/* 页面上下文提示 */}
          {pageContext ? (
            <div className="border-b border-line py-s2 bg-surface-subtle -mx-s5 px-s5">
              <p className="text-caption text-brand">
                {pageContext.anchor ? "基于当前文档与所在段落" : "基于当前文档"}
              </p>
            </div>
          ) : null}

          {/* 对话正文区 */}
          <div className="max-h-sheet-content overflow-y-auto py-s4 space-y-s4">
            {question && (
              <div>
                <span className="text-caption text-muted">问题</span>
                <p className="mt-s1 text-body-large font-semibold text-ink">{question}</p>
              </div>
            )}

            {/* 初始空状态与快捷提问 Chips */}
            {status === "idle" && !question && (
              <div className="space-y-s3 py-s2">
                <p className="text-body text-ink-sub">
                  你好！我是南大家园官方 AI 知识助手。所有回答均严格基于南昌大学已发布的权威校园指南与日常规范。
                </p>
                <div className="space-y-s2">
                  <span className="text-caption text-muted">
                    {pageContext ? "关于当前文档的快捷提问：" : "猜你想问："}
                  </span>
                  <div className="flex flex-wrap gap-s2">
                    {(pageContext
                      ? [
                          "本篇指南有哪些核心规则与注意事项？",
                          "请帮我提取本篇的关键时间与资费节点",
                          "遇到突发问题如何快速联系或解决？",
                        ]
                      : config.suggestedQuestions
                    ).map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => onSubmit(q)}
                        className="focus-ring rounded-pill border border-line bg-surface-subtle px-s3 py-s1 text-caption text-ink hover:border-brand hover:text-brand transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {status === "loading" && (
              <div className="flex items-center gap-s2 text-body text-brand py-s2" role="status">
                <Sparkles className="size-icon-small animate-spin" />
                <span>正在核对南大家园已发布校园知识库…</span>
              </div>
            )}

            {status === "error" && (
              <p className="text-body text-danger py-s2" role="alert">
                {error}
              </p>
            )}

            {session?.confidence === "insufficient" && (
              <div className="rounded-small border-l-3 border-line-mid bg-surface-subtle p-s3 text-body text-ink-body">
                现有资料暂未收录该问题的确切规则，为保证真实性，暂不提供无据推测。您可以尝试换个关键词，或通过首页邮箱反馈。
              </div>
            )}

            {session && session.claims.length > 0 && (
              <div className="space-y-s3">
                <ol className="space-y-s2 font-body text-body leading-body text-ink">
                  {session.claims.map((claim, index) => {
                    const citation = session.citations.find((item) => item.id === claim.citationIds[0]);
                    return (
                      <li key={claim.id} className="leading-body">
                        <span>{claim.text}</span>{" "}
                        {citation ? (
                          <a
                            href={`${resolvePageRoute(citation.pageId)}?answerSession=${session.id}#${citation.anchor}`}
                            onClick={(e) => {
                              e.preventDefault();
                              handleCitationClick(citation.pageId, citation.anchor);
                            }}
                            className="focus-ring inline-flex h-4 min-w-4 items-center justify-center rounded-pill bg-brand-tint px-1.5 align-baseline font-mono text-caption font-bold text-brand hover:bg-brand hover:text-surface transition-colors cursor-pointer"
                            aria-label={`查看结论 ${index + 1} 的依据`}
                            title={`出处：${citation.pageTitle}`}
                          >
                            [{index + 1}]
                          </a>
                        ) : null}
                      </li>
                    );
                  })}
                </ol>

                {/* AI 回答有用性反馈按钮 */}
                <div className="flex flex-wrap items-center gap-s2 border-t border-line pt-s3 text-caption text-muted">
                  {feedbackGiven === null ? (
                    <>
                      <span>本回答是否有帮助？</span>
                      <button
                        type="button"
                        onClick={() => handleAnswerFeedback(true)}
                        className="flex items-center gap-s1 font-semibold text-brand hover:underline"
                      >
                        <ThumbsUp className="size-icon-small" />
                        <span>有帮助</span>
                      </button>
                      <span>·</span>
                      <button
                        type="button"
                        onClick={() => handleAnswerFeedback(false)}
                        className="flex items-center gap-s1 font-semibold text-danger hover:underline"
                      >
                        <ThumbsDown className="size-icon-small" />
                        <span>没帮助</span>
                      </button>
                    </>
                  ) : (
                    <div className="text-ink-body">
                      {feedbackGiven ? (
                        <span>感谢您的点赞！我们会继续保持。</span>
                      ) : (
                        <span>
                          已记录反馈！若回答有误，欢迎{" "}
                          <a
                            href={getFeishuFeedbackUrl({
                              source: "AI",
                              question,
                              pageTitle: pageContext?.pageId,
                              isHelpful: false,
                            })}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand font-semibold hover:underline"
                          >
                            前往飞书提交详细反馈 ↗
                          </a>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 完整依据卡片 */}
            {session && session.citations.length > 0 && (
              <section className="mt-s4 border-t border-line pt-s3" aria-labelledby="answer-evidence-title">
                <h2 id="answer-evidence-title" className="text-label font-semibold text-ink">
                  完整依据
                </h2>
                <div className="mt-s2 divide-y divide-line border-y border-line">
                  {session.citations.map((citation, index) => (
                    <a
                      key={citation.id}
                      href={`${resolvePageRoute(citation.pageId)}?answerSession=${session.id}#${citation.anchor}`}
                      onClick={(e) => {
                        e.preventDefault();
                        handleCitationClick(citation.pageId, citation.anchor);
                      }}
                      className="focus-ring block py-s2 hover:bg-surface-subtle transition-colors group cursor-pointer"
                      aria-label={`打开依据 ${index + 1}：${citation.pageTitle}`}
                    >
                      <div className="flex items-center justify-between text-body font-semibold text-ink group-hover:text-brand">
                        <span>
                          [{index + 1}] {citation.pageTitle}
                        </span>
                        <span className="text-caption text-brand">定位段落 ↗</span>
                      </div>
                      <p className="mt-s1 font-body text-caption leading-ui text-muted line-clamp-2">
                        {citation.excerpt}
                      </p>
                    </a>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* 底部追问输入框 */}
          <AskInputBar
            id="ask-follow-up"
            label="继续追问"
            placeholder={config.inputPlaceholder}
            submitLabel="提交追问"
            value={draft}
            onChange={onDraftChange}
            onSubmit={() => onSubmit(draft)}
            innerClassName="border-t border-line pt-s3"
            inputClassName="text-body"
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
