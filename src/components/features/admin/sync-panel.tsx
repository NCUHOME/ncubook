// 组件：Notion 内容一键同步控制台 (SyncPanel)，支持通俗易懂的流式日志、自动滚底与完成高亮
"use client";

import { Play, RefreshCw, Terminal, CheckCircle2, AlertCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type SyncPanelProps = {
  currentVersion?: string | null;
};

export function SyncPanel({ currentVersion = "未同步" }: SyncPanelProps) {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "running" | "success" | "error">("idle");
  const terminalRef = useRef<HTMLPreElement>(null);

  // 日志更新时自动滚动到终端底部
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  const appendLocalLog = (message: string) => {
    const time = new Date().toLocaleTimeString("zh-CN", { hour12: false });
    setLogs((prev) => [...prev, `[${time}] ${message}`]);
  };

  const handleSync = async () => {
    if (loading) return;
    setLogs([]);
    setStatus("running");
    setLoading(true);
    appendLocalLog("正在准备发起 Notion 文章同步请求...");

    try {
      const response = await fetch("/api/admin/publish-notion", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ operation: "publish", dryRun: false, all: true, async: true }),
      });

      const data = (await response.json().catch(() => null)) as {
        ok?: boolean;
        jobId?: string;
        error?: string;
        reason?: string;
      } | null;

      if (!response.ok || !data?.ok || !data.jobId) {
        if (data?.error === "unauthorized") {
          throw new Error("登录会话已失效，请重新登录控制台。");
        }
        throw new Error(data?.reason ?? data?.error ?? `HTTP ${response.status} 触发同步失败`);
      }

      const jobId = data.jobId;
      let isDone = false;
      let pollCount = 0;

      while (!isDone && pollCount < 120) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        pollCount += 1;

        const pollRes = await fetch(`/api/admin/publish-notion?jobId=${encodeURIComponent(jobId)}`);
        const pollData = (await pollRes.json().catch(() => null)) as {
          ok?: boolean;
          status?: "running" | "success" | "error";
          logs?: string[];
          error?: string;
        } | null;

        if (pollData?.logs && Array.isArray(pollData.logs)) {
          // 直接使用服务端返回的带精准不可变时间戳的日志数组
          setLogs(pollData.logs);
        }

        if (pollData?.status === "success") {
          isDone = true;
          setStatus("success");
        } else if (pollData?.status === "error") {
          isDone = true;
          throw new Error(pollData.error ?? "后台同步发版失败");
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "未知同步异常";
      appendLocalLog(`❌ 同步中断: ${errorMsg}`);
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-medium border border-line bg-surface p-s5 shadow-subtle">
      <div className="flex flex-col gap-s3 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-s4">
        <div>
          <div className="flex items-center gap-s2 flex-wrap">
            <h2 className="font-display text-title font-semibold">Notion 文章一键更新控制台</h2>
            <span className="rounded-small border border-line bg-surface-subtle px-s2 py-s1 text-caption font-mono text-muted">
              当前线上指针: {currentVersion ?? "未同步"}
            </span>
          </div>
          <p className="mt-s1 text-caption leading-ui text-muted">
            一键抓取 Notion 校园指南文章与图片，生成最新网页快照并刷新线上前端
          </p>
        </div>

        <button
          type="button"
          onClick={handleSync}
          disabled={loading}
          className="focus-ring tap-target flex items-center justify-center gap-s2 rounded-small bg-ink px-s5 py-s2 text-label font-medium text-surface transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? <RefreshCw className="size-icon animate-spin" /> : <Play className="size-icon" />}
          {loading ? "正在更新文章..." : "一键同步 Notion 文章"}
        </button>
      </div>

      {/* 规整的实时日志终端 */}
      <div className="mt-s5 overflow-hidden rounded-small border border-line bg-ink p-s4 text-surface">
        <div className="flex items-center justify-between border-b border-line pb-s2 text-caption text-muted">
          <div className="flex items-center gap-s2 text-surface/80">
            <Terminal className="size-icon-small" />
            <span>实时更新日志 (Live Execution Terminal)</span>
          </div>
          {status === "running" && (
            <span className="flex items-center gap-s1 text-caption text-surface font-medium animate-pulse">
              <RefreshCw className="size-icon-small animate-spin" /> 正在处理中...
            </span>
          )}
          {status === "success" && (
            <span className="flex items-center gap-s1 text-caption text-surface font-semibold">
              <CheckCircle2 className="size-icon-small text-surface" /> 🎉 同步完成
            </span>
          )}
          {status === "error" && (
            <span className="flex items-center gap-s1 text-caption text-surface font-medium">
              <AlertCircle className="size-icon-small" /> 同步异常
            </span>
          )}
        </div>
        <pre
          ref={terminalRef}
          className="mt-s3 max-h-56 overflow-y-auto font-mono text-caption leading-relaxed text-surface/90 scroll-smooth"
        >
          {logs.length === 0 ? "点击右上角「一键同步 Notion 文章」查看实时更新进度..." : logs.join("\n")}
        </pre>
      </div>
    </section>
  );
}
