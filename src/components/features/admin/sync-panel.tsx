// 组件：Notion 内容一键同步控制台 (SyncPanel)，包含当前发版状态、一键全量/单页同步按钮与 Terminal 实时日志终端
"use client";

import { Play, RefreshCw, Terminal, CheckCircle2, AlertCircle } from "lucide-react";
import { useState } from "react";

type SyncPanelProps = {
  currentVersion?: string | null;
  adminToken?: string;
};

export function SyncPanel({ currentVersion = "v_current", adminToken = "" }: SyncPanelProps) {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [tokenInput, setTokenInput] = useState(adminToken);

  const appendLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString("zh-CN");
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  const handleSync = async () => {
    if (loading) return;
    setLoading(true);
    setStatus("idle");
    setLogs([]);
    appendLog("准备开始 Notion 节点抓取与同步...");

    try {
      appendLog("校验管理员权限令牌 (Bearer Authentication)...");
      const response = await fetch("/api/admin/publish-notion", {
        method: "POST",
        headers: {
          authorization: `Bearer ${tokenInput}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ operation: "publish", dryRun: false, all: true }),
      });

      const data = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        contentVersion?: string;
        pagesCount?: number;
      } | null;

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error ?? `HTTP ${response.status} 触发同步失败`);
      }

      appendLog(`✅ Notion 文章同步成功！最新发版号: ${data.contentVersion ?? "已更新"}`);
      appendLog(`已增量同步 ${data.pagesCount ?? "全量"} 篇校园文档与 Block 树`);
      appendLog("已触发全站 ISR 标签 (published-content-pointer) 刷新");
      setStatus("success");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "未知同步异常";
      appendLog(`❌ 同步中断: ${errorMsg}`);
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-round border border-line bg-surface p-s5 shadow-subtle">
      <div className="flex flex-col gap-s3 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-s4">
        <div>
          <div className="flex items-center gap-s2">
            <h2 className="font-display text-title font-semibold">Notion 文章同步控制台</h2>
            <span className="rounded-round border border-line bg-surface-subtle px-s2 py-s1 text-caption text-muted">
              指针: {currentVersion ?? "未配置"}
            </span>
          </div>
          <p className="mt-s1 text-caption leading-ui text-muted">
            一键抓取 Notion 根页面树、标准化富文本 Block、镜像上传图片并刷新全站 ISR
          </p>
        </div>

        <div className="flex items-center gap-s3">
          <button
            type="button"
            onClick={handleSync}
            disabled={loading}
            className="focus-ring tap-target flex items-center justify-center gap-s2 rounded-round bg-ink px-s5 py-s2 text-label font-medium text-surface transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? <RefreshCw className="size-icon animate-spin" /> : <Play className="size-icon" />}
            {loading ? "正在同步 Notion..." : "一键同步 Notion 文章"}
          </button>
        </div>
      </div>

      <div className="mt-s4">
        <label htmlFor="admin-token" className="block text-caption text-muted">
          管理员 Bearer Token (PUBLICATION_ADMIN_TOKEN)
        </label>
        <input
          id="admin-token"
          type="password"
          value={tokenInput}
          onChange={(e) => setTokenInput(e.target.value)}
          placeholder="请输入 PUBLICATION_ADMIN_TOKEN"
          className="focus-ring mt-s2 w-full max-w-md rounded-round border border-line bg-surface px-s3 py-s2 text-label font-mono"
        />
      </div>

      {/* 日志终端控制台 */}
      <div className="mt-s5 overflow-hidden rounded-round border border-line bg-ink p-s4 text-surface">
        <div className="flex items-center justify-between border-b border-white/15 pb-s2 text-caption text-surface/70">
          <div className="flex items-center gap-s2">
            <Terminal className="size-icon-small" />
            <span>执行日志终端 (Sync Execution Logs)</span>
          </div>
          {status === "success" && (
            <span className="flex items-center gap-s1 text-caption text-green-400">
              <CheckCircle2 className="size-icon-small" /> 同步完成
            </span>
          )}
          {status === "error" && (
            <span className="flex items-center gap-s1 text-caption text-red-400">
              <AlertCircle className="size-icon-small" /> 同步异常
            </span>
          )}
        </div>
        <pre className="mt-s3 max-h-48 overflow-y-auto font-mono text-caption leading-relaxed text-surface/90">
          {logs.length === 0 ? "点击「一键同步 Notion 文章」查看实时控制台日志..." : logs.join("\n")}
        </pre>
      </div>
    </section>
  );
}
