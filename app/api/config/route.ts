// API 路由：学生端与公共只读获取全站配置（包含 8 大核心配置域）
import { NextResponse } from "next/server";
import { getAllSiteConfigs } from "@/lib/content/site-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const configs = await getAllSiteConfigs();
  return NextResponse.json({ ok: true, data: configs });
}
