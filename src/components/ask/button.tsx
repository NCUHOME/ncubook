// 组件：移动端右下角 50px 纯圆形固定小家园吉祥物 AI 问答浮动按钮 (FAB)
"use client";

import { HollamaMascot } from "@/src/components/primitives/hollama-mascot";
import { useAsk, type PageContext } from "@/src/components/ask/provider";

export function FloatingAskButton({
  pageContext,
  label = "询问当前文档",
}: {
  pageContext?: PageContext;
  label?: string;
}) {
  const { openAsk } = useAsk();

  return (
    <button
      type="button"
      onClick={() => openAsk({ pageContext })}
      className="safe-area-fab focus-ring fixed z-floating-action grid place-items-center rounded-round bg-transparent shadow-fab transition-transform active:scale-90"
      style={{ width: 52, height: 52 }}
      aria-label={label}
      title={label}
    >
      <HollamaMascot size={52} />
    </button>
  );
}
