// 组件：版本控制与一键止血回滚时间线 (VersionTimeline)，基于 Supabase 真实版本列表与指针控制
"use client";

import { History, RotateCcw, AlertTriangle, CheckCircle2, Clock, ShieldAlert } from "lucide-react";
import { useState } from "react";
import type { VersionRecord } from "@/lib/content/supabase-repo";

type VersionTimelineProps = {
  currentVersion?: string | null;
  initialVersions?: VersionRecord[];
};

export function VersionTimeline({ currentVersion = "v_current", initialVersions = [] }: VersionTimelineProps) {
  const [activeCurrent, setActiveCurrent] = useState<string>(currentVersion ?? "v_current");
  const [loadingVersion, setLoadingVersion] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // 合并与兜底版本构建
  const displayVersions: VersionRecord[] = initialVersions.length > 0
    ? initialVersions.map((item) => ({
        ...item,
        isCurrent: item.version === activeCurrent,
      }))
    : [
        {
          version: activeCurrent ?? "v_current",
          status: "published",
          createdAt: new Date().toISOString(),
          isCurrent: true,
        },
      ];

  const handleRollback = async (targetVersion: string) => {
    if (loadingVersion || targetVersion === activeCurrent) return;
    setLoadingVersion(targetVersion);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/publish-notion", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ operation: "rollback", version: targetVersion }),
      });

      const data = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error ?? `HTTP ${response.status} 触发切线回滚失败`);
      }

      setActiveCurrent(targetVersion);
      setMessage(`✅ 已成功切线止血至历史版本 ${targetVersion}！全站 ISR 指针即刻生效。`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "切线回滚失败";
      setMessage(`❌ 回滚异常: ${errorMsg}`);
    } finally {
      setLoadingVersion(null);
    }
  };

  return (
    <section className="rounded-medium border border-line bg-surface p-s5 shadow-subtle">
      <div className="flex items-center justify-between border-b border-line pb-s4">
        <div>
          <div className="flex items-center gap-s2">
            <History className="size-icon" />
            <h2 className="font-display text-title font-semibold">版本控制与一键止血回滚</h2>
          </div>
          <p className="mt-s1 text-caption leading-ui text-muted">
            管理 Supabase 原子版本节点；线上发现内容误删或重大错误时，可秒级一键切线止血
          </p>
        </div>
      </div>

      {message && (
        <div className="mt-s4 flex items-center gap-s2 rounded-small border border-line bg-surface-subtle p-s3 text-label">
          <AlertTriangle className="size-icon-small text-muted" />
          <span>{message}</span>
        </div>
      )}

      <div className="mt-s4 space-y-s3">
        {displayVersions.map((item) => {
          const formattedTime = formatDate(item.createdAt);
          return (
            <div
              key={item.version}
              className={`flex flex-col gap-s3 rounded-small border p-s4 text-label sm:flex-row sm:items-center sm:justify-between transition-colors ${
                item.isCurrent
                  ? "border-ink bg-surface shadow-subtle"
                  : item.status === "failed"
                    ? "border-line bg-surface-subtle opacity-60"
                    : "border-line bg-surface hover:bg-surface-subtle/50"
              }`}
            >
              <div className="flex flex-col gap-s1">
                <div className="flex items-center gap-s2 flex-wrap">
                  <span className="font-mono text-body font-bold text-ink">{item.version}</span>
                  {item.isCurrent && (
                    <span className="flex items-center gap-s1 rounded-small bg-ink px-s2 py-s1 text-caption font-mono font-medium text-surface">
                      <CheckCircle2 className="size-icon-small text-surface" />
                      当前线上生效
                    </span>
                  )}
                  {!item.isCurrent && item.status === "published" && (
                    <span className="rounded-small border border-line bg-surface-subtle px-s2 py-s1 text-caption font-mono text-muted">
                      止血备选节点
                    </span>
                  )}
                  {item.status === "failed" && (
                    <span className="flex items-center gap-s1 rounded-small border border-line bg-surface-subtle px-s2 py-s1 text-caption font-mono text-muted">
                      <ShieldAlert className="size-icon-small text-muted" />
                      发版中途中断
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-s2 text-caption text-muted">
                  <Clock className="size-icon-small" />
                  <span>发布时间: {formattedTime}</span>
                </div>
              </div>

              {!item.isCurrent && item.status === "published" && (
                <button
                  type="button"
                  onClick={() => handleRollback(item.version)}
                  disabled={loadingVersion === item.version}
                  className="focus-ring tap-target flex items-center justify-center gap-s1 rounded-small border border-line bg-surface px-s4 py-s2 text-label font-medium hover:bg-surface-subtle disabled:opacity-50"
                >
                  <RotateCcw className="size-icon-small" />
                  {loadingVersion === item.version ? "正在切线..." : "一键切线止血到此版本"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return isoString;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
  } catch {
    return isoString;
  }
}
