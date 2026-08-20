// API 路由：全站埋点事件收集端点 (/api/analytics)
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/integrations/supabase";
import type { AnalyticsEventName } from "@/lib/analytics/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      session_id?: string;
      sessionId?: string;
      event_name?: AnalyticsEventName;
      eventName?: AnalyticsEventName;
      event_data?: Record<string, unknown>;
      eventData?: Record<string, unknown>;
    };

    const eventName = body.event_name || body.eventName;
    const sessionId = body.session_id || body.sessionId || "anonymous";
    const eventData = body.event_data || body.eventData || {};

    if (!eventName) {
      return NextResponse.json({ ok: false, error: "missing_event_name" }, { status: 400 });
    }

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
