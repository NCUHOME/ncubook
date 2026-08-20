// API 路由：全站埋点事件收集端点 (/api/analytics)
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/integrations/supabase";
import type { AnalyticsEventName } from "@/lib/analytics/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_EVENT_NAMES = new Set<AnalyticsEventName>([
  "page_view",
  "article_read_complete",
  "search_query",
  "search_result_click",
  "ai_ask_submitted",
  "contact_copied",
  "feishu_feedback_click",
]);

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      session_id?: string;
      sessionId?: string;
      event_name?: string;
      eventName?: string;
      event_data?: Record<string, unknown>;
      eventData?: Record<string, unknown>;
    };

    const rawEventName = (body.event_name || body.eventName || "").trim();
    if (!rawEventName || !VALID_EVENT_NAMES.has(rawEventName as AnalyticsEventName)) {
      return NextResponse.json({ ok: false, error: "invalid_event_name" }, { status: 400 });
    }
    const eventName = rawEventName as AnalyticsEventName;

    const rawSessionId = String(body.session_id || body.sessionId || "anonymous").trim();
    const sessionId = rawSessionId.slice(0, 64).replace(/[^\w-]/g, "");

    const rawData = (typeof body.event_data === "object" && body.event_data !== null && !Array.isArray(body.event_data))
      ? body.event_data
      : (typeof body.eventData === "object" && body.eventData !== null && !Array.isArray(body.eventData))
        ? body.eventData
        : {};

    // 限制单次埋点 Payload 最大体积与键值长度
    const safeDataString = JSON.stringify(rawData);
    if (safeDataString.length > 4096) {
      return NextResponse.json({ ok: false, error: "payload_too_large" }, { status: 400 });
    }
    const eventData = JSON.parse(safeDataString) as Record<string, unknown>;

    const supabase = getSupabaseAdmin();
    if (supabase) {
      // 尝试插入 analytics_events 表
      const { error } = await supabase.from("analytics_events").insert({
        session_id: sessionId,
        event_name: eventName,
        event_data: eventData as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      });

      // 若 analytics_events 表尚未执行 SQL 创建，安全降级写入 site_configs 缓冲池中
      if (error) {
        try {
          const { data: bufferData } = await supabase
            .from("site_configs")
            .select("value")
            .eq("key", "analytics_events_buffer")
            .maybeSingle();

          const existingList = Array.isArray(bufferData?.value) ? bufferData.value : [];
          const updatedList = [
            {
              id: Date.now(),
              session_id: sessionId,
              event_name: eventName,
              event_data: eventData,
              created_at: new Date().toISOString(),
            },
            ...existingList.slice(0, 499), // 限制最多保留 500 条
          ];

          await supabase.from("site_configs").upsert({
            key: "analytics_events_buffer",
            value: updatedList as any, // eslint-disable-line @typescript-eslint/no-explicit-any
            updated_at: new Date().toISOString(),
          });
        } catch {
          // 静默容错
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "unknown_error" }, { status: 500 });
  }
}
