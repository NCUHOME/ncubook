// 开发者运维后台主仪表盘页面路由 (app/admin/page.tsx)：挂载 AppHeader、Notion 一键同步控制台、版本时间线与 AI 质量评估面板
import type { Metadata } from "next";
import { loadPublishedRepository } from "@/lib/content/supabase";
import { EvalPanel } from "@/src/components/features/admin/eval-panel";
import { SyncPanel } from "@/src/components/features/admin/sync-panel";
import { VersionTimeline } from "@/src/components/features/admin/version-timeline";
import { AppHeader } from "@/src/components/primitives/header";

export const metadata: Metadata = {
  title: "开发者运维控制台 - 此间",
  description: "南昌大学 AI 知识库内容一键同步、版本控制与 RAG 质量评估后台",
};

export default async function AdminDashboardPage() {
  const repository = await loadPublishedRepository();
  const currentVersion = repository.getDocumentView("campus-shuttle")?.page.contentVersion ?? "v_current";
  const token = process.env.PUBLICATION_ADMIN_TOKEN ?? "";

  return (
    <>
      <AppHeader title="开发者运维控制台" backHref="/" />
      <main className="mx-auto max-w-4xl px-s5 pb-s7 pt-s6 space-y-s6">
        <header>
          <p className="text-caption leading-ui tracking-widest text-muted">此间 (NCU Book) · Developer Portal</p>
          <h1 className="mt-s2 font-display text-heading leading-heading font-semibold">
            开发者运维控制台
          </h1>
        </header>

        {/* 1. Notion 一键同步控制台 */}
        <SyncPanel currentVersion={currentVersion} adminToken={token} />

        {/* 2. 版本控制与一键止血回滚 */}
        <VersionTimeline currentVersion={currentVersion} adminToken={token} />

        {/* 3. RAG AI 质量评估面板 */}
        <EvalPanel />
      </main>
    </>
  );
}
