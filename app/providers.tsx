// 全局 Provider 包装层：挂载 AskProvider 客户端 Context，处理客户端路由映射解析与问答状态共享
"use client";

import type { ReactNode } from "react";
import { AskProvider } from "@/src/context/ask";

export function Providers({ children, pageRoutes }: { children: ReactNode; pageRoutes: Record<string, string> }) {
  return <AskProvider resolvePageRoute={(pageId) => {
    const route = pageRoutes[pageId];
    if (!route) throw new Error(`Unknown published page: ${pageId}`);
    return route;
  }}>{children}</AskProvider>;
}
