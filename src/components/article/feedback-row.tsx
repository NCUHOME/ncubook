// 组件：文章底部有用性反馈组件（支持点赞/点踩、自动入库与直通飞书预填收集表）
"use client";

import { useState } from "react";
import { getFeishuFeedbackUrl } from "@/lib/feishu";

export function ArticleFeedbackRow({ slug, pageTitle }: { slug: string; pageTitle?: string }) {
  const [submitted, setSubmitted] = useState<boolean | null>(null);

  const handleFeedback = (isHelpful: boolean) => {
    setSubmitted(isHelpful);
    fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetType: "article",
        targetId: slug,
        isHelpful,
      }),
    }).catch(() => {});
  };

  const feishuUrl = getFeishuFeedbackUrl({
    source: "文档页",
    pageTitle,
    pageSlug: slug,
    isHelpful: false,
  });

  return (
    <div className="mt-s6 flex flex-wrap items-center gap-s2 border-t border-line pt-s4 text-caption text-muted">
      {submitted === null ? (
        <>
          <span>本篇指南是否对你有帮助？</span>
          <button
            type="button"
            onClick={() => handleFeedback(true)}
            className="focus-ring rounded-small px-s2 py-s1 font-semibold text-brand hover:bg-brand-tint transition-colors"
          >
            有帮助
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={() => handleFeedback(false)}
            className="focus-ring rounded-small px-s2 py-s1 font-semibold text-brand hover:bg-brand-tint transition-colors"
          >
            没帮助
          </button>
        </>
      ) : (
        <div className="text-ink-body">
          {submitted ? (
            <span>感谢您的点赞支持！</span>
          ) : (
            <span>
              已记录您的反馈！若有错漏或补充，欢迎{" "}
              <a
                href={feishuUrl}
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
  );
}
