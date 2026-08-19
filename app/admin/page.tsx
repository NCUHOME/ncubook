// 开发者运维后台主仪表盘页面路由 (app/admin/page.tsx)：读取 admin_session Cookie 守卫鉴权，挂载 Notion 一键同步、版本时间线与登出按钮 (无 EvalPanel)
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { fetchContentVersionsFromSupabase, getLivePublishedContentPointer } from "@/lib/content/server";
import { getAdminSecret, verifyAdminSessionToken } from "@/lib/publishing/auth";
import { LogoutButton } from "@/src/components/admin/logout-button";
import { AdminTabs } from "@/src/components/admin/admin-tabs";
import { AppHeader } from "@/src/components/primitives/header";

export const metadata: Metadata = {
  title: "管理控制台 - 此间",
  description: "南昌大学 AI 知识库内容同步与版本管理后台",
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
    <>
      <AppHeader title="管理控制台" backHref="/" />
      <main className="mx-auto max-w-4xl px-s5 pb-s7 pt-s6 space-y-s6">
        <header className="flex items-center justify-between border-b border-line pb-s4">
          <div>
            <p className="text-caption leading-ui tracking-widest text-muted">此间 (NCU Book) · Developer Portal</p>
            <h1 className="mt-s2 font-display text-display leading-heading font-semibold">
              管理控制台
            </h1>
            <p className="mt-s2 text-caption leading-ui text-muted">
              校园指南知识库与 AI 管理系统
            </p>
          </div>

          <LogoutButton />
        </header>

        {/* 管理员核心运维、AI 质量评测与沙盒三大模块 Tab 容器 */}
        <AdminTabs currentVersion={currentVersion} initialVersions={initialVersions} />
      </main>
    </>
  );
}
