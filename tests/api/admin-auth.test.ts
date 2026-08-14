// 单测：测试管理员鉴权 API 路由 (/api/admin/auth)，验证 POST 登录 Cookie 签发、密码校验与 DELETE 登出
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cookieJar = new Map<string, unknown>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    set: (name: string, value: string, options: unknown) => {
      cookieJar.set(name, { value, options });
    },
    delete: (name: string) => {
      cookieJar.delete(name);
    },
    get: (name: string) => cookieJar.get(name),
  }),
}));

import { POST as postAuth, DELETE as deleteAuth } from "@/app/api/admin/auth/route";

const originalEnv = { ...process.env };

describe("admin auth API route (/api/admin/auth)", () => {
  beforeEach(() => {
    process.env.ADMIN_PASSWORD = "test-super-secret-password";
    cookieJar.clear();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("sets httpOnly admin_session cookie upon correct password submission", async () => {
    const request = new Request("http://localhost:3000/api/admin/auth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: "test-super-secret-password" }),
    });

    const response = await postAuth(request);
    expect(response.status).toBe(200);
    const data = (await response.json()) as { ok: boolean };
    expect(data.ok).toBe(true);

    expect(cookieJar.has("admin_session")).toBe(true);
    const cookie = cookieJar.get("admin_session") as { value: string; options: { httpOnly: boolean } };
    expect(cookie.options.httpOnly).toBe(true);
    expect(cookie.value).toMatch(/^\d+\.[a-f0-9]+$/);
  });

  it("rejects incorrect password with 401 and sets no cookie", async () => {
    const request = new Request("http://localhost:3000/api/admin/auth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: "wrong-password" }),
    });

    const response = await postAuth(request);
    expect(response.status).toBe(401);
    const data = (await response.json()) as { ok: boolean; error: string };
    expect(data.ok).toBe(false);
    expect(data.error).toBe("invalid_password");
    expect(cookieJar.has("admin_session")).toBe(false);
  });

  it("returns 500 when ADMIN_PASSWORD is not configured", async () => {
    delete process.env.ADMIN_PASSWORD;

    const request = new Request("http://localhost:3000/api/admin/auth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: "some-password" }),
    });

    const response = await postAuth(request);
    expect(response.status).toBe(500);
    const data = (await response.json()) as { ok: boolean; error: string };
    expect(data.ok).toBe(false);
    expect(data.error).toBe("unconfigured");
  });

  it("deletes admin_session cookie upon DELETE logout", async () => {
    cookieJar.set("admin_session", "existing-token");
    const response = await deleteAuth();

    expect(response.status).toBe(200);
    const data = (await response.json()) as { ok: boolean };
    expect(data.ok).toBe(true);
    expect(cookieJar.has("admin_session")).toBe(false);
  });
});
