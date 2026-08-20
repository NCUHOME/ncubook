// 全局 Provider 包装层：挂载 AskProvider 与 SearchProvider 客户端 Context，挂载 ToastPill 消息药丸
"use client";

import type { ReactNode } from "react";
import { AskProvider } from "@/src/components/ask/provider";
import { SearchProvider } from "@/src/components/search/search-provider";
import { ToastPill } from "@/src/components/primitives/toast";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SearchProvider>
      <AskProvider resolvePageRoute={(pageId) => `/docs/${pageId}`}>
        {children}
        <ToastPill />
      </AskProvider>
    </SearchProvider>
  );
}
