// 组件：Admin 控制台多 Tab 容器 (AdminTabs)，支持 Keep-Alive 秒切与状态持久化缓存
"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  RefreshCw,
  Settings,
  MessageSquare,
  FlaskConical,
} from "lucide-react";
import type { VersionRecord } from "@/lib/content/server";
import { AnalyticsDashboard } from "@/src/components/admin/analytics-dashboard";
import { SyncPanel } from "@/src/components/admin/sync-panel";
import { VersionTimeline } from "@/src/components/admin/version-timeline";
import { SiteConfigPanel } from "@/src/components/admin/site-config-panel";
import { FeedbackPanel } from "@/src/components/admin/feedback-panel";
import { EvalDashboard } from "@/src/components/admin/eval-dashboard";
import { QAPlayground } from "@/src/components/admin/qa-playground";

type AdminTabsProps = {
  currentVersion?: string | null;
  initialVersions?: VersionRecord[];
};

export type AdminTabKey = "analytics" | "sync" | "settings" | "feedbacks" | "ai-lab";

export function AdminTabs({ currentVersion = "未同步", initialVersions = [] }: AdminTabsProps) {
  const [activeTab, setActiveTab] = useState<AdminTabKey>("analytics");
  const [visitedTabs, setVisitedTabs] = useState<Set<AdminTabKey>>(new Set(["analytics"]));
  const [aiSubTab, setAiSubTab] = useState<"evals" | "playground">("evals");

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (
      hash === "analytics" ||
      hash === "sync" ||
      hash === "settings" ||
      hash === "feedbacks" ||
      hash === "ai-lab"
    ) {
      setActiveTab(hash as AdminTabKey);
      setVisitedTabs((prev) => new Set([...prev, hash as AdminTabKey]));
    }
  }, []);

  const handleTabChange = (tab: AdminTabKey) => {
    setActiveTab(tab);
    setVisitedTabs((prev) => new Set([...prev, tab]));
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${tab}`);
    }
  };

  const tabs: Array<{ key: AdminTabKey; label: string; icon: typeof BarChart3 }> = [
    { key: "analytics", label: "数据洞察与埋点", icon: BarChart3 },
    { key: "sync", label: "内容发布与版本", icon: RefreshCw },
    { key: "settings", label: "网站与目录配置", icon: Settings },
    { key: "feedbacks", label: "用户反馈监控", icon: MessageSquare },
    { key: "ai-lab", label: "AI 评测与沙盒", icon: FlaskConical },
  ];

  return (
    <div className="space-y-s6">
      {/* 顶部 Tab 切换控制器：采用防折叠水平滑动栏，彻底杜绝竖排折字 */}
      <nav
        aria-label="控制台模块切换"
        className="flex items-center gap-s2 border-b border-line pb-s2 overflow-x-auto no-scrollbar scroll-smooth"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabChange(tab.key)}
              className={`focus-ring tap-target flex shrink-0 items-center gap-s2 rounded-small px-s4 py-s2.5 text-label font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? "bg-ink text-surface shadow-subtle"
                  : "text-muted hover:text-ink hover:bg-surface-subtle"
              }`}
            >
              <Icon className="size-icon-small shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* 模块 0: 全站数据洞察与埋点大盘 (Keep-Alive DOM 保留) */}
      {visitedTabs.has("analytics") && (
        <div className={activeTab === "analytics" ? "block" : "hidden"} role="tabpanel">
          <AnalyticsDashboard />
        </div>
      )}

      {/* 模块 1: 内容发布与真实版本时间线 */}
      {visitedTabs.has("sync") && (
        <div className={activeTab === "sync" ? "block space-y-s6" : "hidden"} role="tabpanel">
          <SyncPanel currentVersion={currentVersion} />
          <VersionTimeline currentVersion={currentVersion} initialVersions={initialVersions} />
        </div>
      )}

      {/* 模块 2: 网站公告与全局配置 */}
      {visitedTabs.has("settings") && (
        <div className={activeTab === "settings" ? "block" : "hidden"} role="tabpanel">
          <SiteConfigPanel />
        </div>
      )}

      {/* 模块 3: 用户反馈监控与工单流转 */}
      {visitedTabs.has("feedbacks") && (
        <div className={activeTab === "feedbacks" ? "block" : "hidden"} role="tabpanel">
          <FeedbackPanel />
        </div>
      )}

      {/* 模块 4: AI 质量评测与问答沙盒实验室 */}
      {visitedTabs.has("ai-lab") && (
        <div className={activeTab === "ai-lab" ? "block space-y-s6" : "hidden"} role="tabpanel">
          <div className="flex items-center gap-s2 border-b border-line pb-s2">
            <button
              type="button"
              onClick={() => setAiSubTab("evals")}
              className={`focus-ring rounded-pill px-s4 py-s1 text-caption font-medium transition-colors ${
                aiSubTab === "evals" ? "bg-brand text-surface" : "bg-surface-subtle text-muted hover:text-ink"
              }`}
            >
              35 项黄金基准评测看板
            </button>
            <button
              type="button"
              onClick={() => setAiSubTab("playground")}
              className={`focus-ring rounded-pill px-s4 py-s1 text-caption font-medium transition-colors ${
                aiSubTab === "playground" ? "bg-brand text-surface" : "bg-surface-subtle text-muted hover:text-ink"
              }`}
            >
              AI 问答调试沙盒
            </button>
          </div>

          <div className={aiSubTab === "evals" ? "block" : "hidden"}>
            <EvalDashboard />
          </div>
          <div className={aiSubTab === "playground" ? "block" : "hidden"}>
            <QAPlayground />
          </div>
        </div>
      )}
    </div>
  );
}
