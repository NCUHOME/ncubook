// 开发者运维后台主仪表盘页面路由 (app/admin/page.tsx)：读取 admin_session Cookie 守卫鉴权
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { fetchContentVersionsFromSupabase, getLivePublishedContentPointer } from "@/lib/content/server";
import { getAdminSecret, verifyAdminSessionToken } from "@/lib/publishing/auth";
import { LogoutButton } from "@/src/components/admin/logout-button";
import { AdminTabs } from "@/src/components/admin/admin-tabs";

export const metadata: Metadata = {
  title: "管理控制台 - 此间",
  description: "南昌大学 AI 知识库内容同步、版本运维与数据大盘",
};

export default async function AdminDashboardPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin_session")?.value;
  const secret = getAdminSecret();

  if (!secret || !verifyAdminSessionToken(session, secret)) {
    redirect("/admin/login");
  }

  const currentVersion = await getLivePublishedContentPointer();
  const initialVersions = await fetchContentVersionsFromSupabase();

  return (
    <div className="space-y-s6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-s4 border-b border-line pb-s4">
        <div>
          <div className="flex items-center gap-s2">
            <span className="text-caption font-semibold tracking-widest text-brand">DEVELOPER PORTAL</span>
            <span className="text-caption text-muted">· 此间知识库后台</span>
          </div>
          <h1 className="mt-s1 font-display text-display leading-heading font-semibold text-ink">
            管理控制台
          </h1>
          <p className="mt-s1 text-caption text-muted">
            校园指南知识库发布同步、站点配置、数据洞察与 AI 质量管控
          </p>
        </div>

        <div className="flex items-center gap-s3">
          <LogoutButton />
        </div>
      </header>

      {/* 控制台核心模块 Tab 容器 */}
      <AdminTabs currentVersion={currentVersion} initialVersions={initialVersions} />
    </div>
  );
}
