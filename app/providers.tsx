"use client";

import type { ReactNode } from "react";
import { AskProvider } from "@/src/components/ask/AskProvider";

export function Providers({ children, pageRoutes }: { children: ReactNode; pageRoutes: Record<string, string> }) {
  return <AskProvider resolvePageRoute={(pageId) => {
    const route = pageRoutes[pageId];
    if (!route) throw new Error(`Unknown published page: ${pageId}`);
    return route;
  }}>{children}</AskProvider>;
}
