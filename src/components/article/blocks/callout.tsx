// 组件：Notion 三色高亮提示框渲染器（支持蓝色重点、红色安全防诈警示与灰色背景注释）
import type { ReactNode } from "react";
import type { Block } from "@/lib/content/schema";
import { RichText } from "@/src/components/article/blocks/richtext";

export function CalloutBlock({
  block,
  resolvePageRoute,
  children,
}: {
  block: Extract<Block, { type: "callout" }>;
  resolvePageRoute: (pageId: string) => string;
  children?: ReactNode;
}) {
  const plainText = block.richText.map((t) => t.plainText).join("");
  const placeholderClasses = {
    "placeholder-chat": "prototype-placeholder-chat",
    "placeholder-calendar": "prototype-placeholder-calendar",
    "placeholder-map": "prototype-placeholder-map-north",
    "placeholder-map-north": "prototype-placeholder-map-north",
    "placeholder-map-south": "prototype-placeholder-map-south",
    "placeholder-shuttle": "prototype-placeholder-shuttle",
  } as const;
  const placeholderClass = block.presentation && block.presentation in placeholderClasses
    ? placeholderClasses[block.presentation as keyof typeof placeholderClasses]
    : null;

  if (placeholderClass) {
    const placeholderLabels = {
      "placeholder-chat": "聊天记录截图",
      "placeholder-calendar": "校历图",
      "placeholder-map": "校园地图图片",
      "placeholder-map-north": "前湖校区 2.5D 地图",
      "placeholder-map-south": "医学部地图",
      "placeholder-shuttle": "环游车图片",
    } as const;
    const placeholderLabel = placeholderLabels[block.presentation as keyof typeof placeholderLabels];
    const caption = block.icon && !/^[▧▤]$/.test(block.icon) ? block.icon : null;
    return (
      <figure id={block.anchor}>
        <div className={`prototype-image-placeholder ${placeholderClass}`}>
          {placeholderLabel}
        </div>
        {caption ? <figcaption className="prototype-image-caption">{caption}</figcaption> : null}
      </figure>
    );
  }
  const isPlaceholder = plainText.startsWith("这一篇的正文尚未迁入原型");

  // 根据 tone 或关键词智能分派三色体系
  const isRed =
    block.tone === "risk" ||
    block.tone === "warning" ||
    plainText.includes("防诈") ||
    plainText.includes("报警") ||
    plainText.includes("切勿转账") ||
    plainText.includes("紧急");

  const isBlue =
    !isRed &&
    (block.tone === "info" ||
      plainText.includes("技巧") ||
      plainText.includes("提醒") ||
      plainText.includes("注意") ||
      plainText.includes("建议") ||
      plainText.includes("运行时间") ||
      plainText.includes("收费标准"));

  let calloutClass = "border-l-3 border-line-mid bg-surface-subtle text-ink-body";
  if (isPlaceholder) {
    calloutClass = "border-l-3 border-placeholder-border bg-placeholder-bg text-ink-sub";
  } else if (isRed) {
    calloutClass = "border-l-3 border-risk-border bg-surface-subtle text-risk-text";
  } else if (isBlue) {
    calloutClass = "border-l-3 border-brand bg-surface-subtle text-ink";
  }

  return (
    <aside
      id={block.anchor}
      className={`rounded-r-small px-notice py-s3 font-body ${isRed ? "text-risk-callout" : "text-quote leading-body"} ${calloutClass}`}
    >
      <div className="flex items-start gap-s2">
        {block.icon ? (
          <span className="mt-s1 shrink-0 text-body-large leading-none" aria-hidden="true">
            {block.icon}
          </span>
        ) : null}
        <div className="flex-1 space-y-s2">
          <p className="whitespace-pre-line">
            <RichText value={block.richText} resolvePageRoute={resolvePageRoute} />
          </p>
          {children}
        </div>
      </div>
    </aside>
  );
}
