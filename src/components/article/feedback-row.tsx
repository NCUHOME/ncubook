// 组件：文章底部有用性反馈组件（支持点赞/点踩、自动入库与直通飞书预填收集表）
"use client";

import { useEffect, useState } from "react";
import { getFeishuFeedbackUrl } from "@/lib/feishu";
import { DEFAULT_ARTICLE_FEEDBACK_CONFIG, type ArticleFeedbackConfig } from "@/lib/content/site-config";

export function ArticleFeedbackRow({ slug, pageTitle }: { slug: string; pageTitle?: string }) {
  const [submitted, setSubmitted] = useState<boolean | null>(null);
  const [config, setConfig] = useState<ArticleFeedbackConfig>(DEFAULT_ARTICLE_FEEDBACK_CONFIG);

  useEffect(() => {
    let active = true;
    fetch("/api/config")
      .then((res) => res.json())
      .then((res) => {
        if (active && res?.ok && res?.data?.article_feedback_config) {
          setConfig(res.data.article_feedback_config);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

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

  const feishuUrl = config.feishuUrl || getFeishuFeedbackUrl({
    source: "文档页",
    pageTitle,
    pageSlug: slug,
    isHelpful: false,
  });

  return (
    <div className="font-body gap-hairline text-feedback mt-notice flex min-h-8 flex-wrap items-center text-muted">
      {submitted === null ? (
        <>
          <span className="sr-only">{config.prompt}</span>
          <span className="mr-s2">这一页有用吗</span>
          <button
            type="button"
            onClick={() => handleFeedback(true)}
            className="focus-ring font-body px-compact py-compact text-brand"
          >
            有用
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={() => handleFeedback(false)}
            className="focus-ring font-body px-compact py-compact text-brand"
          >
            没帮上
          </button>
        </>
      ) : (
        <div className="leading-evidence text-ink-sub">
          {submitted ? "感谢你的支持，有任何想说的可以点击「" : "感谢你的指正，可以点击「"}
          <a
            href={feishuUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="focus-ring font-semibold text-brand"
          >
            反馈
          </a>
          {submitted ? "」联系我们" : "」进一步表达建议！"}
        </div>
      )}
    </div>
  );
}
