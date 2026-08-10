// API 路由：管理员密码登录与 Cookie Session 验证 (POST /api/admin/auth & DELETE /api/admin/auth)
import { cookies } from "next/headers";
import { timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => null)) as { password?: string } | null;
  const password = body?.password?.trim() ?? "";

  const expectedPassword = process.env.ADMIN_PASSWORD || process.env.PUBLICATION_ADMIN_TOKEN;

  if (!expectedPassword) {
    return Response.json(
      { ok: false, error: "unconfigured", reason: "环境变量 ADMIN_PASSWORD 未配置" },
      { status: 500 },
    );
  }

  if (!safePasswordEqual(password, expectedPassword)) {
    return Response.json(
      { ok: false, error: "invalid_password", reason: "密码错误，请重新输入" },
      { status: 401 },
    );
  }

  const cookieStore = await cookies();
  cookieStore.set("admin_session", "authenticated", {
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

function safePasswordEqual(provided: string, expected: string): boolean {
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}
