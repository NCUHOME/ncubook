// 组件：Admin 控制台多 Tab 容器 (AdminTabs)，组织同步版本、AI 评测看板与调试沙盒
"use client";

import { useEffect, useState } from "react";
import { RefreshCw, BarChart3, FlaskConical } from "lucide-react";
import type { VersionRecord } from "@/lib/content/server";
import { SyncPanel } from "@/src/components/admin/sync-panel";
import { VersionTimeline } from "@/src/components/admin/version-timeline";
import { EvalDashboard } from "@/src/components/admin/eval-dashboard";
import { QAPlayground } from "@/src/components/admin/qa-playground";

type AdminTabsProps = {
  currentVersion?: string | null;
  initialVersions?: VersionRecord[];
};

export type AdminTabKey = "sync" | "evals" | "playground";

export function AdminTabs({ currentVersion = "未同步", initialVersions = [] }: AdminTabsProps) {
  const [activeTab, setActiveTab] = useState<AdminTabKey>("sync");

  // 支持 URL Hash 记忆当前激活的 Tab
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash === "sync" || hash === "evals" || hash === "playground") {
      setActiveTab(hash);
    }
  }, []);

  const handleTabChange = (tab: AdminTabKey) => {
    setActiveTab(tab);
    window.location.hash = tab;
  };

  return (
    <div className="space-y-s6">
      {/* 顶部 Tab 切换控制器 */}
      <nav aria-label="控制台模块切换" className="flex items-center gap-s2 border-b border-line pb-s1 overflow-x-auto">
        <button
          type="button"
          onClick={() => handleTabChange("sync")}
          className={`focus-ring tap-target flex items-center gap-s2 rounded-small px-s4 py-s3 text-label font-medium transition-colors ${
            activeTab === "sync"
              ? "bg-ink text-surface shadow-subtle"
              : "text-muted hover:text-ink hover:bg-surface-subtle"
          }`}
        >
          <RefreshCw className="size-icon-small" />
          <span>内容发布与版本</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("evals")}
          className={`focus-ring tap-target flex items-center gap-s2 rounded-small px-s4 py-s3 text-label font-medium transition-colors ${
            activeTab === "evals"
              ? "bg-ink text-surface shadow-subtle"
              : "text-muted hover:text-ink hover:bg-surface-subtle"
          }`}
        >
          <BarChart3 className="size-icon-small" />
          <span>AI 质量评测</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("playground")}
          className={`focus-ring tap-target flex items-center gap-s2 rounded-small px-s4 py-s3 text-label font-medium transition-colors ${
            activeTab === "playground"
              ? "bg-ink text-surface shadow-subtle"
              : "text-muted hover:text-ink hover:bg-surface-subtle"
          }`}
        >
          <FlaskConical className="size-icon-small" />
          <span>问答测试沙盒</span>
        </button>
      </nav>

      {/* 模块 1: 内容发布与真实版本时间线 */}
      {activeTab === "sync" && (
        <div className="space-y-s6">
          <SyncPanel currentVersion={currentVersion} />
          <VersionTimeline currentVersion={currentVersion} initialVersions={initialVersions} />
        </div>
      )}

      {/* 模块 2: AI 质量评测看板 */}
      {activeTab === "evals" && <EvalDashboard />}

      {/* 模块 3: 问答测试沙盒与白盒探针 */}
      {activeTab === "playground" && <QAPlayground />}
    </div>
  );
}
