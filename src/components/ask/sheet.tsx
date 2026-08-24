// 组件：AI 可溯源问答底部弹层，支持推荐提问 Chips、观点与依据溯源跳转（带 Flash 闪烁高亮）与答案有用性反馈
"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Sparkles } from "lucide-react";
import type { AnswerSession } from "@/lib/ai/session";
import { AskInputBar } from "@/src/components/ask/input-bar";
import type { AskStatus, PageContext } from "@/src/components/ask/provider";
import { getFeishuFeedbackUrl } from "@/lib/feishu";

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
        <Dialog.Overlay className="shell-fixed-overlay fixed inset-y-0 z-drawer bg-overlay animate-in fade-in duration-fast" />
        <Dialog.Content
          className="fixed inset-x-0 bottom-0 z-modal mx-auto flex max-h-sheet-content max-w-shell flex-col rounded-t-card bg-surface font-sans shadow-drawer focus:outline-none animate-in slide-in-from-bottom duration-fast"
          aria-describedby={undefined}
        >
          {/* 弹层顶部栏 */}
          <div className="flex items-center justify-between border-b border-line pb-control pl-s5 pr-s2 pt-notice">
            <div>
              <Dialog.Title className="text-sheet-title font-semibold text-ink">询问此间</Dialog.Title>
              <p className="mt-hairline text-caption text-muted">
                {pageContext ? `基于当前文档「${pageContext.pageTitle ?? "本页"}」与全库` : "基于手册全库，回答保留出处"}
              </p>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="tap-target grid place-items-center text-ink focus:outline-none"
                aria-label="关闭回答"
              >
                <X className="size-icon-close" strokeWidth={1.7} />
              </button>
            </Dialog.Close>
          </div>

          {/* 对话正文区 */}
          <div className="flex-1 overflow-y-auto px-s5 py-s4">
            {question && (
              <div className="flex justify-end">
                <p className="max-w-question rounded-bubble bg-action-subtle px-notice py-control text-quote leading-ui text-ink">{question}</p>
              </div>
            )}

            {/* 初始空状态与快捷提问 Chips */}
            {status === "idle" && !question && (
              <div>
                <p className="text-label leading-relaxed text-ink-sub">回答只依据手册原文，并标出出处。试试：</p>
                <div className="mt-control flex flex-col gap-s2">
                    {["校园环游车怎么收费？", "宿舍空调怎么申请？"].map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => onSubmit(q)}
                        className="focus-ring rounded-medium border border-line-mid bg-surface px-s3 py-chip text-left text-label text-ink"
                      >
                        {q}
                      </button>
                    ))}
                </div>
              </div>
            )}

            {status === "loading" && (
              <div className="mt-s4 flex items-center gap-s2 py-s2 text-body text-brand" role="status">
                <Sparkles className="size-icon-small animate-spin" />
                <span>正在核对南大家园已发布校园知识库…</span>
              </div>
            )}

            {status === "error" && (
              <p className="mt-s4 py-s2 text-body text-danger" role="alert">
                {error}
              </p>
            )}

            {session?.confidence === "insufficient" && (
              <div className="mt-s4 rounded-r-small border-l-3 border-line-mid bg-surface-subtle px-notice py-s3 text-body leading-body text-ink-body">
                抱歉，在当前的校园指南中暂未检索到确切依据。为保证真实可信，小家园不提供无据推测。建议换个提问方式，或通过首页邮箱反馈补充该词条。
              </div>
            )}

            {session && session.claims.length > 0 && (
              <div className="mt-s4">
                <ul className="flex list-disc flex-col gap-s1 pl-s5 font-body text-quote leading-body text-ink">
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
                            className="focus-ring cursor-pointer align-super text-micro text-brand"
                            aria-label={`查看结论 ${index + 1} 的依据`}
                            title={`出处：${citation.pageTitle}`}
                          >
                            {index + 1}
                          </a>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>

                {/* AI 回答有用性反馈按钮 */}
                <div className="gap-hairline text-feedback mt-hero flex min-h-8 flex-wrap items-center border-t border-line pt-s3 text-muted">
                  {feedbackGiven === null ? (
                    <>
                      <span className="mr-s2">本回答是否对你有帮助</span>
                      <button
                        type="button"
                        onClick={() => handleAnswerFeedback(true)}
                        className="px-compact py-compact text-brand"
                      >
                        <span>有帮助</span>
                      </button>
                      <span>·</span>
                      <button
                        type="button"
                        onClick={() => handleAnswerFeedback(false)}
                        className="px-compact py-compact text-brand"
                      >
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
                            className="text-brand font-semibold"
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
              <section className="mt-s4" aria-labelledby="answer-evidence-title">
                <h2 id="answer-evidence-title" aria-label="完整依据" className="text-micro font-semibold tracking-eyebrow text-eyebrow">
                  依据原文
                </h2>
                <div className="mt-compact flex flex-col items-start gap-compact">
                  {session.citations.map((citation, index) => (
                    <a
                      key={citation.id}
                      href={`${resolvePageRoute(citation.pageId)}?answerSession=${session.id}#${citation.anchor}`}
                      onClick={(e) => {
                        e.preventDefault();
                        handleCitationClick(citation.pageId, citation.anchor);
                      }}
                      className="focus-ring text-feedback flex cursor-pointer items-baseline gap-compact leading-evidence"
                      aria-label={`打开依据 ${index + 1}：${citation.pageTitle}`}
                    >
                      <span className="shrink-0 text-muted">{index + 1}</span>
                      <span className="rounded-evidence py-hairline bg-brand-subtle px-compact font-semibold text-brand">{citation.pageTitle}</span>
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
            placeholder="继续追问"
            submitLabel="提交追问"
            value={draft}
            onChange={onDraftChange}
            onSubmit={() => onSubmit(draft)}
            className="border-t border-line px-s5 pb-s4 pt-control"
            inputClassName="text-label"
            variant="sheet"
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
