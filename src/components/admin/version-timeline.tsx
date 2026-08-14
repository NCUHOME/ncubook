// 组件：版本控制与一键恢复时间线 (VersionTimeline)，基于 Supabase 真实版本记录与指针控制
"use client";

import { History, RotateCcw, AlertTriangle, CheckCircle2, Clock, Info } from "lucide-react";
import { useEffect, useState } from "react";
import type { VersionRecord } from "@/lib/content/server";

type VersionTimelineProps = {
  currentVersion?: string | null;
  initialVersions?: VersionRecord[];
};

export function VersionTimeline({ currentVersion = "未同步", initialVersions = [] }: VersionTimelineProps) {
  const [activeCurrent, setActiveCurrent] = useState<string>(currentVersion ?? "未同步");
  const [versions, setVersions] = useState<VersionRecord[]>(initialVersions);
  const [loadingVersion, setLoadingVersion] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // 加载最新真实版本列表
  const refreshVersions = async () => {
    try {
      const res = await fetch("/api/admin/publish-notion?action=versions");
      const data = (await res.json().catch(() => null)) as { ok?: boolean; versions?: VersionRecord[] } | null;
      if (data?.ok && Array.isArray(data.versions)) {
        setVersions(data.versions);
        const currentItem = data.versions.find((v) => v.isCurrent);
        if (currentItem) setActiveCurrent(currentItem.version);
      }
    } catch {
      // 容错使用 initialVersions
    }
  };

  // 监听发布完成事件，实时同步刷新版本历史列表
  useEffect(() => {
    const handlePublished = () => {
      refreshVersions();
    };
    window.addEventListener("content-published", handlePublished);
    return () => window.removeEventListener("content-published", handlePublished);
  }, []);

  const effectiveCurrent =
    activeCurrent && activeCurrent !== "未同步"
      ? activeCurrent
      : versions.find((v) => v.isCurrent)?.version || versions[0]?.version || "未同步";

  // 严格仅保留真实版本记录，绝不加入任何假数据
  const displayVersions: VersionRecord[] = versions.map((item) => ({
    ...item,
    isCurrent: item.version === effectiveCurrent,
  }));

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
        throw new Error(data?.error ?? `HTTP ${response.status} 恢复失败`);
      }

      setActiveCurrent(targetVersion);
      setMessage(`✅ 已成功将线上网站恢复至历史版本 ${targetVersion}！前端已同步更新。`);
      refreshVersions();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "恢复失败";
      setMessage(`❌ 恢复异常: ${errorMsg}`);
    } finally {
      setLoadingVersion(null);
    }
  };

  return (
    <section className="rounded-medium border border-line bg-surface p-s5 shadow-subtle">
      <div className="border-b border-line pb-s4">
        <div className="flex items-center gap-s2">
          <History className="size-icon" />
          <h2 className="font-display text-title font-semibold">网站版本历史与恢复</h2>
        </div>
        <p className="mt-s1 text-caption leading-ui text-muted">
          记录每次同步发版的历史快照。若线上发生误删或排版错误，可在历史版本旁一键恢复
        </p>
      </div>

      {message && (
        <div className="mt-s4 flex items-center gap-s2 rounded-small border border-line bg-surface-subtle p-s3 text-label">
          <AlertTriangle className="size-icon-small text-muted flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* 无版本记录时的真实空状态 */}
      {displayVersions.length === 0 && (
        <div className="mt-s4 flex items-center gap-s2 rounded-small border border-line bg-surface-subtle p-s4 text-caption text-muted">
          <Info className="size-icon-small flex-shrink-0" />
          <span>当前数据库暂无已发布版本记录。点击上方「一键同步 Notion 文章」开始首次发版。</span>
        </div>
      )}

      {/* 当系统目前只有 1 个版本记录时的提示 */}
      {displayVersions.length === 1 && (
        <div className="mt-s4 flex items-center gap-s2 rounded-small border border-line bg-surface-subtle p-s3 text-caption text-muted">
          <Info className="size-icon-small flex-shrink-0" />
          <span>
            提示：当前数据库中已记录 1 次发版快照。每次点击「一键同步 Notion 文章」发版完成后，旧版本会自动保留在此列表中，供您随时一键恢复。
          </span>
        </div>
      )}

      {displayVersions.length > 0 && (
        <div className="mt-s4 space-y-s3">
          {displayVersions.map((item) => {
            const formattedTime = formatDate(item.createdAt);
            return (
              <div
                key={item.version}
                className={`flex flex-col gap-s3 rounded-small border p-s4 text-label sm:flex-row sm:items-center sm:justify-between transition-colors ${
                  item.isCurrent
                    ? "border-ink bg-surface shadow-subtle"
                    : "border-line bg-surface hover:bg-surface-subtle/50"
                }`}
              >
              <div className="flex flex-col gap-s1">
                <div className="flex items-center gap-s2 flex-wrap">
                  <span className="font-mono text-body font-bold text-ink">
                    {item.isCurrent ? "当前线上在用版本" : "历史版本节点"}
                  </span>
                  {item.isCurrent && (
                    <span className="flex items-center gap-s1 rounded-small bg-ink px-s2 py-s1 text-caption font-mono font-medium text-surface">
                      <CheckCircle2 className="size-icon-small text-surface" />
                      正在线上生效
                    </span>
                  )}
                  {!item.isCurrent && (
                    <span className="rounded-small border border-line bg-surface-subtle px-s2 py-s1 text-caption font-mono text-muted">
                      可恢复历史备份
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-s3 text-caption text-muted flex-wrap">
                  <div className="flex items-center gap-s1">
                    <Clock className="size-icon-small" />
                    <span>更新时间: {formattedTime}</span>
                  </div>
                  <span className="font-mono text-caption text-muted/70">版本号: {item.version}</span>
                </div>
              </div>

              {!item.isCurrent && (
                <button
                  type="button"
                  onClick={() => handleRollback(item.version)}
                  disabled={loadingVersion === item.version}
                  className="focus-ring tap-target flex items-center justify-center gap-s1 rounded-small border border-line bg-surface px-s4 py-s2 text-label font-medium hover:bg-surface-subtle disabled:opacity-50"
                >
                  <RotateCcw className="size-icon-small" />
                  {loadingVersion === item.version ? "正在恢复..." : "一键恢复至此版本"}
                </button>
              )}
            </div>
          );
        })}
        </div>
      )}
    </section>
  );
}

function formatDate(isoString: string): string {
  if (!isoString) return "--";
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return isoString;
    return d.toLocaleString("zh-CN", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return isoString;
  }
}
