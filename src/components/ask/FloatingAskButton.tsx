"use client";

import { MessageCircleQuestion } from "lucide-react";
import { type PageContext, useAsk } from "@/src/components/ask/AskProvider";

export function FloatingAskButton({ pageContext }: { pageContext: PageContext }) {
  const { openAsk } = useAsk();
  return <button type="button" onClick={() => openAsk({ pageContext })} className="safe-area-fab focus-ring tap-target fixed z-floating-action grid place-items-center rounded-round bg-action text-surface shadow-floating" aria-label="询问当前文档"><MessageCircleQuestion className="size-icon-large" strokeWidth={1.9} /></button>;
}
