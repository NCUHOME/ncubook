// 开发者运维后台主仪表盘页面路由 (app/admin/page.tsx)：读取 admin_session Cookie 守卫鉴权，挂载 Notion 一键同步、版本时间线与 AI 质量评估面板
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { loadPublishedRepository } from "@/lib/content/supabase";
import { fetchContentVersionsFromSupabase } from "@/lib/content/supabase-repo";
import { hasAiProviderConfig } from "@/lib/ai/service";
import { EvalPanel } from "@/src/components/features/admin/eval-panel";
import { SyncPanel } from "@/src/components/features/admin/sync-panel";
import { VersionTimeline } from "@/src/components/features/admin/version-timeline";
import { AppHeader } from "@/src/components/primitives/header";

export const metadata: Metadata = {
  title: "开发者运维控制台 - 此间",
  description: "南昌大学 AI 知识库内容一键同步、版本控制与 RAG 质量评估后台",
};

export default async function AdminDashboardPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin_session")?.value;

  if (session !== "authenticated") {
    redirect("/admin/login");
  }

  const repository = await loadPublishedRepository();
  const currentVersion = repository.getDocumentView("campus-shuttle")?.page.contentVersion ?? "v_current";
  const initialVersions = await fetchContentVersionsFromSupabase();
  const aiConnected = hasAiProviderConfig();

  return (
    <>
      <AppHeader title="运维控制台" backHref="/" />
      <main className="mx-auto max-w-4xl px-s5 pb-s7 pt-s6 space-y-s6">
        <header className="flex items-center justify-between border-b border-line pb-s4">
          <div>
            <p className="text-caption leading-ui tracking-widest text-muted">此间 (NCU Book) · Developer Portal</p>
            <h1 className="mt-s2 font-display text-display leading-heading font-semibold">
              开发者运维控制台
            </h1>
            <p className="mt-s2 text-caption leading-ui text-muted">
              管理 Notion 内容图谱一键同步、线上版本号原子止血回滚与 RAG 质量在线断言
            </p>
          </div>

          <form action="/api/admin/auth" method="POST">
            <input type="hidden" name="_method" value="DELETE" />
          </form>
        </header>

        {/* 1. Notion 一键同步控制台 (无需手动输入 Token) */}
        <SyncPanel currentVersion={currentVersion} />

        {/* 2. 真实版本控制与一键止血回滚 */}
        <VersionTimeline currentVersion={currentVersion} initialVersions={initialVersions} />

        {/* 3. RAG AI 质量评估面板 */}
        <EvalPanel aiConnected={aiConnected} />
      </main>
    </>
  );
}
