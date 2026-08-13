// 组件：运维控制台真登出按钮 (LogoutButton)，发送 DELETE /api/admin/auth 并跳转至 /admin/login
"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await fetch("/api/admin/auth", { method: "DELETE" });
      router.replace("/admin/login");
      router.refresh();
    } catch {
      router.replace("/admin/login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="focus-ring tap-target flex items-center gap-s1 rounded-small border border-line bg-surface px-s3 py-s1text-caption font-medium hover:bg-surface-subtle disabled:opacity-50"
    >
      <LogOut className="size-icon-small" />
      <span>{loading ? "正在退出..." : "退出登录"}</span>
    </button>
  );
}
