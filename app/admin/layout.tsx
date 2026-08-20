// 管理后台独立布局骨架 (app/admin/layout.tsx)：提供全宽/宽屏 max-w-6xl 专业开发者控制台容器
import type { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-surface-subtle/40">
      <div className="mx-auto w-full max-w-6xl px-s4 md:px-s8 py-s6">{children}</div>
    </div>
  );
}
