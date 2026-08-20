// 组件：全站路由与页面访问自动埋点侦测器 (PageTracker)
"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackEvent } from "@/lib/analytics/client";

export function PageTracker() {
  const pathname = usePathname();
  const lastTrackedPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname === lastTrackedPath.current) return;
    lastTrackedPath.current = pathname;

    // 过滤管理后台自身的 PV，仅统计学生端实际行为
    if (pathname.startsWith("/admin")) return;

    const isMobile = window.innerWidth < 768;
    const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
    const device = isMobile ? "mobile" : isTablet ? "tablet" : "desktop";

    const slug = pathname.startsWith("/docs/") ? pathname.replace("/docs/", "") : undefined;

    trackEvent("page_view", {
      path: pathname,
      slug,
      device,
      referrer: document.referrer || undefined,
    });
  }, [pathname]);

  return null;
}
