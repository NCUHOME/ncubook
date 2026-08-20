// 组件：文档详情页吸顶阅读进度条（Sticky 46px，随正文滚动实时更新百分比）
"use client";

import { useEffect, useState } from "react";

export function ArticleProgressBar() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const el = document.documentElement;
      const total = el.scrollHeight - el.clientHeight;
      if (total <= 0) {
        setProgress(0);
        return;
      }
      const current = el.scrollTop || document.body.scrollTop;
      const pct = Math.min(100, Math.max(0, (current / total) * 100));
      setProgress(pct);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      aria-hidden="true"
      className="sticky top-11 z-header w-full bg-surface"
      style={{ height: 2 }}
    >
      <div
        className="h-full bg-ink transition-all duration-75 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
