// 页面路由：全站 RootLayout 根级崩塌异常兜底边界 (Client Component)，定义独立 html/body 视图
"use client";

import { useEffect } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Fatal Global Error:", error);
  }, [error]);

  return (
    <html lang="zh-CN">
      <body className="bg-canvas font-body text-text antialiased">
        <main className="mx-auto flex min-h-screen w-full max-w-shell flex-col items-center justify-center px-s5 py-s7 text-center">
          <div className="flex size-status-avatar items-center justify-center rounded-round bg-surface-subtle text-danger">
            <TriangleAlert className="h-s6 w-s6" />
          </div>
          <h1 className="mt-s5 font-display text-heading leading-heading font-semibold text-text">
            系统遇到严重错误
          </h1>
          <p className="mt-s3 max-w-status-card font-body text-body leading-body text-muted">
            应用初始化阶段发生异常，请重试或稍后再试。
          </p>
          <button
            type="button"
            onClick={reset}
            className="tap-target mt-s6 inline-flex items-center justify-center gap-s2 rounded-round bg-action px-s6 text-label font-medium text-canvas focus-ring active:opacity-90"
          >
            <RotateCcw className="h-s4 w-s4" />
            重置应用
          </button>
        </main>
      </body>
    </html>
  );
}
