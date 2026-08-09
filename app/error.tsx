// 页面路由：路由级 500 异常捕获错误边界 (Client Component)，提供错误提示与恢复重试机制
"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RotateCcw } from "lucide-react";

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
    <main className="mx-auto flex min-h-screen w-full max-w-[760px] flex-col items-center justify-center bg-canvas px-s5 py-s7 text-center">
      <div className="flex h-[64px] w-[64px] items-center justify-center rounded-round bg-surface-subtle text-danger">
        <AlertCircle className="h-s6 w-s6" />
      </div>
      <h1 className="mt-s5 font-display text-heading leading-heading font-semibold text-text">
        页面加载出现问题
      </h1>
      <p className="mt-s3 max-w-[320px] font-body text-body leading-body text-muted">
        系统暂时无法完成此操作，您可以尝试重新加载或返回首页。
      </p>
      <div className="mt-s6 flex flex-wrap items-center justify-center gap-s3">
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
      </div>
    </main>
  );
}
