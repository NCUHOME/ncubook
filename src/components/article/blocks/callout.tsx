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
  if (isRed) {
    calloutClass = "border-l-3 border-danger bg-danger-bg text-danger font-medium";
  } else if (isBlue) {
    calloutClass = "border-l-3 border-brand bg-brand-tint/60 text-ink";
  }

  return (
    <aside
      id={block.anchor}
      className={`rounded-r-small p-s4 font-body text-body leading-body ${calloutClass}`}
    >
      <div className="flex items-start gap-s3">
        {block.icon ? (
          <span className="text-body-large leading-none shrink-0 mt-s1" aria-hidden="true">
            {block.icon}
          </span>
        ) : null}
        <div className="flex-1 space-y-s2">
          <p>
            <RichText value={block.richText} resolvePageRoute={resolvePageRoute} />
          </p>
          {children}
        </div>
      </div>
    </aside>
  );
}
