// 组件：移动端右下角 AI 问答浮动按钮 (FAB)，点击调起当前页面上下文的 AskSheet 弹层
"use client";

import { MessageCircleQuestion } from "lucide-react";
import type { PageContext } from "@/src/context/ask";
import { useAsk } from "@/src/hooks/use-ask";

export function FloatingAskButton({ pageContext }: { pageContext: PageContext }) {
  const { openAsk } = useAsk();
  return <button type="button" onClick={() => openAsk({ pageContext })} className="safe-area-fab focus-ring tap-target fixed z-floating-action grid place-items-center rounded-round bg-action text-surface shadow-floating" aria-label="询问当前文档"><MessageCircleQuestion className="size-icon-large" strokeWidth={1.9} /></button>;
}
