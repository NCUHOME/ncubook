// API 路由：Notion 远程发布与版本回滚 Webhook 触发入口 (支持 Cookie Session 与 Bearer Token 秘钥认证)
import { cookies } from "next/headers";
import { timingSafeEqual } from "node:crypto";
import { runNotionPublicationCommand } from "@/lib/publishing/pipeline";
import { parseCommand } from "@/lib/publishing/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const expectedToken = process.env.ADMIN_PASSWORD || process.env.PUBLICATION_ADMIN_TOKEN;

  // 1. 优先校验 Session Cookie
  const cookieStore = await cookies();
  const session = cookieStore.get("admin_session")?.value;
  const isAuthenticatedByCookie = session === "authenticated";

  // 2. 校验 Header Authorization Bearer Token
  const authHeader = request.headers.get("authorization") ?? "";
  const providedToken = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";
  const isAuthenticatedByToken = Boolean(expectedToken && safeTokenEqual(providedToken, expectedToken));

  if (!isAuthenticatedByCookie && !isAuthenticatedByToken) {
    return Response.json({ ok: false, error: "unauthorized", reason: "未登录或鉴权秘钥无效" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const command = parseCommand(payload);
  if (!command) {
    return Response.json({ ok: false, error: "invalid_publication_command" }, { status: 400 });
  }

  try {
    const result = await runNotionPublicationCommand(command);
    return Response.json(result, { status: 200 });
  } catch (error) {
    let reason = "Unknown publication failure";
    if (error instanceof Error) {
      reason = error.message;
      if (error.cause) {
        const causeMsg = error.cause instanceof Error ? error.cause.message : String(error.cause);
        reason += ` (${causeMsg})`;
      }
    }
    return Response.json(
      {
        ok: false,
        error: "publication_failed",
        reason,
      },
      { status: 422 },
    );
  }
}

function safeTokenEqual(provided: string, expected: string): boolean {
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}
