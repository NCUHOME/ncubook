// 页面路由：路由级 500 异常捕获错误边界 (Client Component)，提供错误提示与恢复重试机制
"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RotateCcw } from "lucide-react";
import { StatusPage } from "@/src/components/primitives/status-page";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled Route Error:", error);
  }, [error]);

  return (
    <StatusPage
      icon={<AlertCircle className="h-s6 w-s6" />}
      iconClassName="text-danger"
      title="页面加载出现问题"
      description="系统暂时无法完成此操作，您可以尝试重新加载或返回首页。"
      actions={
        <>
          <button
            type="button"
            onClick={reset}
            className="tap-target inline-flex items-center justify-center gap-s2 rounded-round bg-action px-s6 text-label font-medium text-canvas focus-ring active:opacity-90"
          >
            <RotateCcw className="h-s4 w-s4" />
            重新加载
          </button>
          <Link
            href="/"
            className="tap-target inline-flex items-center justify-center gap-s2 rounded-round bg-action-subtle px-s6 text-label font-medium text-text focus-ring active:opacity-90"
          >
            返回首页
          </Link>
        </>
      }
    />
  );
}
