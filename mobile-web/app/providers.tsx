"use client";

import type { ReactNode } from "react";
import { AskProvider } from "@/src/components/ask/AskProvider";

export function Providers({ children }: { children: ReactNode }) {
  return <AskProvider>{children}</AskProvider>;
}
