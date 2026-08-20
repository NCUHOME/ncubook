// API 路由：学生端与公共只读获取全站配置（公告栏、联系方式、Hero 引言）
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/integrations/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_CONFIGS = {
  home_notice: {
    title: "公告",
    date: "2026 年 8 月",
    desc: "目前手册还在持续更新中……",
    links: [
      { text: "新生必看", slug: "xinsheng" },
      { text: "关于我们", slug: "why" },
    ],
  },
  home_contribute: {
    email: "book@nchuhome.club",
    qq_group: "930991836",
    desc: "如有发现错漏，或想把自己的经验写进来，欢迎加入我们～",
  },
  home_hero: {
    title: "校园里的事<br>在此问明白",
    quote: "是什么曾经拯救过你，就用它来更好地拯救这个世界",
  },
};

export async function GET() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(DEFAULT_CONFIGS);
  }

  try {
    const { data, error } = await supabase.from("site_configs").select("key, value");
    if (error || !data || data.length === 0) {
      return NextResponse.json(DEFAULT_CONFIGS);
    }

    const configs: Record<string, unknown> = { ...DEFAULT_CONFIGS };
    for (const row of data) {
      if (row.key && row.value) {
        configs[row.key] = row.value;
      }
    }
    return NextResponse.json(configs);
  } catch {
    return NextResponse.json(DEFAULT_CONFIGS);
  }
}
