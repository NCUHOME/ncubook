// 单元测试：校验 Admin 鉴权模块 (lib/publishing/auth.ts) 的 HMAC 签名、防伪造、防越权与过期机制
import { describe, expect, it } from "vitest";
import {
  createAdminSessionToken,
  safeStringEqual,
  verifyAdminBearerToken,
  verifyAdminSessionToken,
} from "@/lib/publishing/auth";

describe("admin authentication module (lib/publishing/auth)", () => {
  const secret = "ncuhome-test-secret-123";

  it("generates and verifies valid HMAC session tokens", () => {
    const token = createAdminSessionToken(secret);
    expect(verifyAdminSessionToken(token, secret)).toBe(true);
  });

  it("rejects fake static 'authenticated' cookie string (F-01 vulnerability fix)", () => {
    expect(verifyAdminSessionToken("authenticated", secret)).toBe(false);
  });

  it("rejects tampered or forged HMAC session tokens", () => {
    const validToken = createAdminSessionToken(secret);
    const [timestamp, signature] = validToken.split(".");

    // 篡改 signature
    const forgedSignatureToken = `${timestamp}.${signature.endsWith("0") ? signature.slice(0, -1) + "1" : signature.slice(0, -1) + "0"}`;
    expect(verifyAdminSessionToken(forgedSignatureToken, secret)).toBe(false);

    // 篡改 timestamp
    const forgedTimestampToken = `1234567890.${signature}`;
    expect(verifyAdminSessionToken(forgedTimestampToken, secret)).toBe(false);

    // 尝试在无 Secret 情况下校验
    expect(verifyAdminSessionToken(validToken, undefined)).toBe(false);
    expect(verifyAdminSessionToken(undefined, secret)).toBe(false);
  });

  it("rejects expired session tokens (> 7 days)", () => {
    const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
    const expiredToken = createAdminSessionToken(secret, eightDaysAgo);
    expect(verifyAdminSessionToken(expiredToken, secret)).toBe(false);
  });

  it("validates bearer tokens (raw password or valid session token)", () => {
    expect(verifyAdminBearerToken(secret, secret)).toBe(true);

    const sessionToken = createAdminSessionToken(secret);
    expect(verifyAdminBearerToken(sessionToken, secret)).toBe(true);

    expect(verifyAdminBearerToken("wrong-password", secret)).toBe(false);
  });

  it("compares strings in constant time (safeStringEqual)", () => {
    expect(safeStringEqual("secret123", "secret123")).toBe(true);
    expect(safeStringEqual("secret123", "secret456")).toBe(false);
    expect(safeStringEqual("short", "longerstring")).toBe(false);
  });
});
