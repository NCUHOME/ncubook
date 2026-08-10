// 组件：版本控制与一键止血回滚时间线 (VersionTimeline)，基于 Cookie 鉴权支持零代码一键回滚
"use client";

import { History, RotateCcw, AlertTriangle } from "lucide-react";
import { useState } from "react";

type VersionItem = {
  version: string;
  status: "published" | "pending" | "failed";
  isCurrent: boolean;
};

type VersionTimelineProps = {
  currentVersion?: string | null;
};

export function VersionTimeline({ currentVersion = "v_current" }: VersionTimelineProps) {
  const [loadingVersion, setLoadingVersion] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // 历史版本列表
  const versions: VersionItem[] = [
    { version: currentVersion ?? "v_current", status: "published", isCurrent: true },
    { version: "v_20260809_120000", status: "published", isCurrent: false },
    { version: "v_20260808_183000", status: "published", isCurrent: false },
  ];

  const handleRollback = async (targetVersion: string) => {
    if (loadingVersion || targetVersion === currentVersion) return;
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
        throw new Error(data?.error ?? `HTTP ${response.status} 触发回滚失败`);
      }

      setMessage(`✅ 已成功回滚至版本 ${targetVersion}！全站 ISR 指针已更新。`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "回滚失败";
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
            线上发生误删或格式错误时，可在历史版本旁一键点击止血回滚
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
        {versions.map((item) => (
          <div
            key={item.version}
            className="flex items-center justify-between rounded-small border border-line p-s3 text-label"
          >
            <div className="flex items-center gap-s3">
              <span className="font-mono text-body font-medium">{item.version}</span>
              {item.isCurrent && (
                <span className="rounded-small border border-line bg-ink px-s2 py-s1 text-caption font-mono text-surface">
                  当前线上版本
                </span>
              )}
            </div>

            {!item.isCurrent && (
              <button
                type="button"
                onClick={() => handleRollback(item.version)}
                disabled={loadingVersion === item.version}
                className="focus-ring tap-target flex items-center gap-s1 rounded-small border border-line px-s3 py-s1 text-caption font-medium hover:bg-surface-subtle disabled:opacity-50"
              >
                <RotateCcw className="size-icon-small" />
                {loadingVersion === item.version ? "正在回滚..." : "一键回滚到此版本"}
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
