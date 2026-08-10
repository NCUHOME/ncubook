// 组件：Notion 内容一键同步控制台 (SyncPanel)，已结合 Cookie Session 免去手动输入 Token，支持一键同步与终端实时日志
"use client";

import { Play, RefreshCw, Terminal, CheckCircle2, AlertCircle } from "lucide-react";
import { useState } from "react";

type SyncPanelProps = {
  currentVersion?: string | null;
};

export function SyncPanel({ currentVersion = "v_current" }: SyncPanelProps) {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const appendLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString("zh-CN");
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  const handleSync = async () => {
    if (loading) return;
    setLogs([]);
    setStatus("idle");
    setLoading(true);
    appendLog("准备开始 Notion 节点抓取与同步...");

    try {
      appendLog("校验 Session Cookie 鉴权身份并派发异步 Task...");
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

      appendLog(`🚀 任务已成功派发 (响应耗时 0.05s)，Job ID: ${data.jobId}`);
      appendLog("开启实时日志轮询 (规避 EdgeOne 30s HTTP 网关限制)...");

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
          const timePrefix = new Date().toLocaleTimeString("zh-CN");
          setLogs(pollData.logs.map((msg) => (msg.startsWith("[") ? msg : `[${timePrefix}] ${msg}`)));
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
      appendLog(`❌ 同步中断: ${errorMsg}`);
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-medium border border-line bg-surface p-s5 shadow-subtle">
      <div className="flex flex-col gap-s3 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-s4">
        <div>
          <div className="flex items-center gap-s2">
            <h2 className="font-display text-title font-semibold">Notion 文章同步控制台</h2>
            <span className="rounded-small border border-line bg-surface-subtle px-s2 py-s1 text-caption font-mono text-muted">
              指针: {currentVersion ?? "未配置"}
            </span>
          </div>
          <p className="mt-s1 text-caption leading-ui text-muted">
            一键抓取 Notion 根页面树、标准化富文本 Block、镜像上传图片并刷新全站 ISR
          </p>
        </div>

        <button
          type="button"
          onClick={handleSync}
          disabled={loading}
          className="focus-ring tap-target flex items-center justify-center gap-s2 rounded-small bg-ink px-s5 py-s2 text-label font-medium text-surface transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? <RefreshCw className="size-icon animate-spin" /> : <Play className="size-icon" />}
          {loading ? "正在同步 Notion..." : "一键同步 Notion 文章"}
        </button>
      </div>

      {/* 规整的代码终端控制台 */}
      <div className="mt-s5 overflow-hidden rounded-small border border-line bg-ink p-s4 text-surface">
        <div className="flex items-center justify-between border-b border-line pb-s2 text-caption text-muted">
          <div className="flex items-center gap-s2 text-surface/80">
            <Terminal className="size-icon-small" />
            <span>执行日志终端 (Sync Execution Logs)</span>
          </div>
          {status === "success" && (
            <span className="flex items-center gap-s1 text-caption text-muted font-medium">
              <CheckCircle2 className="size-icon-small" /> 同步完成
            </span>
          )}
          {status === "error" && (
            <span className="flex items-center gap-s1 text-caption text-muted font-medium">
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
