// 全局 Provider 包装层：挂载 AskProvider 客户端 Context，处理客户端路由动态解析与问答状态共享
"use client";

import type { ReactNode } from "react";
import { AskProvider } from "@/src/components/ask/provider";

export function Providers({ children, pageRoutes }: { children: ReactNode; pageRoutes?: Record<string, string> }) {
  return (
    <AskProvider
      resolvePageRoute={(pageId) => {
        if (pageRoutes && pageRoutes[pageId]) return pageRoutes[pageId];
        return `/docs/${pageId}`;
      }}
    >
      {children}
    </AskProvider>
  );
}
