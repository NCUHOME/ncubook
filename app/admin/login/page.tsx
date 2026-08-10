// 开发者运维控制台登录页面 (app/admin/login/page.tsx)：输入环境变量 ADMIN_PASSWORD 校验并设置 Cookie
"use client";

import { Lock, ArrowRight, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AppHeader } from "@/src/components/primitives/header";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (loading || !password.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        reason?: string;
      } | null;

      if (!response.ok || !data?.ok) {
        throw new Error(data?.reason ?? "密码校验错误");
      }

      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AppHeader title="控制台登录" backHref="/" />
      <main className="mx-auto max-w-md px-s5 pb-s7 pt-s7">
        <div className="rounded-medium border border-line bg-surface p-s6 shadow-subtle">
          <div className="flex items-center gap-s2">
            <Lock className="size-icon" />
            <h1 className="font-display text-title font-semibold">开发者运维控制台登录</h1>
          </div>
          <p className="mt-s2 text-caption leading-ui text-muted">
            请输入环境变量 <code className="font-mono">ADMIN_PASSWORD</code> 设置的控制台访问密码
          </p>

          <form onSubmit={handleSubmit} className="mt-s5 space-y-s4">
            <div>
              <label htmlFor="admin-password" className="block text-caption font-medium text-muted">
                控制台登录密码
              </label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入 ADMIN_PASSWORD"
                required
                autoFocus
                className="focus-ring mt-s2 w-full rounded-small border border-line bg-surface px-s3 py-s2 text-label font-mono"
              />
            </div>

            {error && (
              <div className="flex items-center gap-s2 rounded-small border border-line bg-surface-subtle p-s3 text-caption text-muted">
                <AlertCircle className="size-icon-small text-muted" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="focus-ring tap-target flex w-full items-center justify-center gap-s2 rounded-small bg-ink px-s4 py-s2 text-label font-medium text-surface hover:opacity-90 disabled:opacity-50"
            >
              <span>{loading ? "正在验证..." : "登录控制台"}</span>
              <ArrowRight className="size-icon-small" />
            </button>
          </form>
        </div>
      </main>
    </>
  );
}
