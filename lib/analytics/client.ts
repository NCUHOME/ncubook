// 客户端埋点 SDK (lib/analytics/client.ts)：轻量无阻塞上报、自动匿名 Session 管理
import type { AnalyticsEventName, AnalyticsEventPayloadMap } from "./types";

const SESSION_STORAGE_KEY = "ncubook_analytics_sid";

function getAnonymousSessionId(): string {
  if (typeof window === "undefined") return "server";
  try {
    let sid = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!sid) {
      sid = "s_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now().toString(36);
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, sid);
    }
    return sid;
  } catch {
    return "anonymous";
  }
}

/**
 * 客户端上报自定义埋点事件
 * 优先采用 navigator.sendBeacon 保证在页面卸载/路由跳转时无丢失且不阻塞主线程
 */
export function trackEvent<T extends AnalyticsEventName>(
  eventName: T,
  eventData: AnalyticsEventPayloadMap[T],
): void {
  if (typeof window === "undefined") return;

  try {
    const sessionId = getAnonymousSessionId();
    const payload = JSON.stringify({
      session_id: sessionId,
      event_name: eventName,
      event_data: eventData,
    });

    const endpoint = "/api/analytics";

    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([payload], { type: "application/json" });
      const sent = navigator.sendBeacon(endpoint, blob);
      if (sent) return;
    }

    // 降级使用 fetch keepalive
    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {
      // 容错静默，绝不影响用户正常使用
    });
  } catch {
    // 容错静默
  }
}
