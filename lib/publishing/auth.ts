// 核心业务领域：管理员身份鉴权与 HMAC Cookie Session / Bearer Token 校验模块 (lib/publishing/auth.ts)
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { assertServerOnly } from "@/lib/integrations/server";

assertServerOnly("Admin Authentication Module");

const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 天有效

export function getAdminSecret(): string | undefined {
  return process.env.ADMIN_PASSWORD || process.env.PUBLICATION_ADMIN_TOKEN;
}

/**
 * 根据密码/Secret 与 timestamp 生成 HMAC SHA-256 签名的 Session Token
 * 格式: <timestamp>.<hmacHex>
 */
export function createAdminSessionToken(secret: string, timestamp: number = Date.now()): string {
  const hmac = createHmac("sha256", secret).update(String(timestamp)).digest("hex");
  return `${timestamp}.${hmac}`;
}

/**
 * 校验 Session Token 的签名合法性与过期时间
 */
export function verifyAdminSessionToken(token: string | undefined | null, secret: string | undefined): boolean {
  if (!token || !secret) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [timestampStr, providedHmac] = parts;
  const timestamp = Number(timestampStr);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return false;

  // 1. 过期校验 (防止过久 token 重放)
  if (Math.abs(Date.now() - timestamp) > SESSION_MAX_AGE_MS) return false;

  // 2. 签名校验 (Timing Safe Equal)
  const expectedHmac = createHmac("sha256", secret).update(timestampStr).digest("hex");
  return safeStringEqual(providedHmac, expectedHmac);
}

/**
 * 校验 Bearer Token 或静态密码/密钥
 */
export function verifyAdminBearerToken(providedToken: string | undefined | null, secret: string | undefined): boolean {
  if (!providedToken || !secret) return false;
  // 支持传入 Raw Password / Secret 或动态 Session Token
  if (safeStringEqual(providedToken, secret)) return true;
  return verifyAdminSessionToken(providedToken, secret);
}

/**
 * 统一 HTTP 请求鉴权校验 (综合 Header Authorization Bearer 与 Session Cookie)
 */
export async function authenticateAdminRequest(request: Request): Promise<boolean> {
  const secret = getAdminSecret();
  if (!secret) return false;

  // 1. 优先校验 Header Authorization Bearer Token
  const authHeader = request.headers.get("authorization") ?? "";
  const providedToken = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";
  if (providedToken && verifyAdminBearerToken(providedToken, secret)) {
    return true;
  }

  // 2. 校验 Session Cookie
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("admin_session")?.value;
  return verifyAdminSessionToken(sessionToken, secret);
}

/**
 * 时序安全字符串相等比较，防范 Timing Attacks
 */
export function safeStringEqual(provided: string, expected: string): boolean {
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}
