// API 路由：管理员密码登录与 Cookie Session 验证 (POST /api/admin/auth & DELETE /api/admin/auth)
import { cookies } from "next/headers";
import { createMinuteRateLimiter, createSupabaseRateLimiter } from "@/lib/ai/ask";
import { createAdminSessionToken, getAdminSecret, safeStringEqual } from "@/lib/publishing/auth";
import { getSupabaseAdmin } from "@/lib/integrations/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const rateLimitClient = getSupabaseAdmin();
const checkAuthRateLimit = rateLimitClient
  ? createSupabaseRateLimiter(rateLimitClient, 10)
  : createMinuteRateLimiter(10);

export async function POST(request: Request): Promise<Response> {
  if (!(await checkAuthRateLimit(request))) {
    return Response.json(
      { ok: false, error: "too_many_attempts", reason: "尝试登录次数过多，请稍后再试" },
      { status: 429 },
    );
  }

  const body = (await request.json().catch(() => null)) as { password?: string } | null;
  const password = body?.password?.trim() ?? "";

  const expectedPassword = getAdminSecret();

  if (!expectedPassword) {
    return Response.json(
      { ok: false, error: "unconfigured", reason: "环境变量 ADMIN_PASSWORD 未配置" },
      { status: 500 },
    );
  }

  const isMatch =
    safeStringEqual(password, expectedPassword) ||
    safeStringEqual(password.replace(/!/g, "！"), expectedPassword) ||
    safeStringEqual(password.replace(/！/g, "!"), expectedPassword);

  if (!isMatch) {
    return Response.json(
      { ok: false, error: "invalid_password", reason: "密码错误，请重新输入" },
      { status: 401 },
    );
  }

  const sessionToken = createAdminSessionToken(expectedPassword);
  const cookieStore = await cookies();
  cookieStore.set("admin_session", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 天有效
  });

  return Response.json({ ok: true });
}

export async function DELETE(): Promise<Response> {
  const cookieStore = await cookies();
  cookieStore.delete("admin_session");
  return Response.json({ ok: true });
}
