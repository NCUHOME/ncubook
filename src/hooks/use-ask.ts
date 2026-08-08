// 钩子：获取 AskContext 共享上下文的自定义 React Hook（在组件树超出 AskProvider 范围时抛出明确异常）
"use client";

import { useContext } from "react";
import { AskContext } from "@/src/context/ask";

export function useAsk() {
  const context = useContext(AskContext);
  if (!context) throw new Error("useAsk must be used inside AskProvider");
  return context;
}
