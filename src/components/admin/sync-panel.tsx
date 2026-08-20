// 组件：Notion 内容一键同步控制台 (SyncPanel)，支持百分比进度条、预检干跑 (Dry-Run) 开关、自愈断路器与手动解锁
"use client";

import { Play, RefreshCw, Terminal, CheckCircle2, AlertCircle, ShieldAlert, TestTube, Copy, Check, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type SyncPanelProps = {
  currentVersion?: string | null;
};

export function SyncPanel({ currentVersion = "未同步" }: SyncPanelProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [dryRun, setDryRun] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "running" | "success" | "error">("idle");
  const [progressPct, setProgressPct] = useState(0);
  const [stageText, setStageText] = useState("");
  const [copied, setCopied] = useState(false);
  const terminalRef = useRef<HTMLPreElement>(null);

  // 日志更新时自动滚动到终端底部
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  const handleCopyVersion = () => {
    if (!currentVersion || currentVersion === "未同步") return;
    navigator.clipboard.writeText(currentVersion);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const appendLocalLog = (message: string) => {
    const time = new Date().toLocaleTimeString("zh-CN", { hour12: false });
    setLogs((prev) => [...prev, `[${time}] ${message}`]);
  };

  const handleForceUnlock = async () => {
    try {
      appendLocalLog("正在发起强行解除僵尸任务请求...");
      await fetch("/api/admin/publish-notion", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ forceUnlock: true }),
      });
      appendLocalLog("[解锁] 挂起任务锁已强制解除，您可以重新开始同步。");
      setStatus("idle");
      setLoading(false);
      setProgressPct(0);
    } catch {
      appendLocalLog("[错误] 强制解锁请求失败，请检查网络");
    }
  };

  const handleSync = async () => {
    if (loading) return;
    setLogs([]);
    setStatus("running");
    setLoading(true);
    setProgressPct(10);
    setStageText("正在发起连接");
    appendLocalLog(`正在发起 Notion 文章同步${dryRun ? " [预检模式]" : ""}...`);

    try {
      const response = await fetch("/api/admin/publish-notion", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ operation: "publish", dryRun, all: true, async: true }),
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
      let consecutiveErrors = 0;

      while (!isDone) {
        await new Promise((resolve) => setTimeout(resolve, 1500));

        try {
          const pollRes = await fetch(`/api/admin/publish-notion?jobId=${encodeURIComponent(jobId)}`);
          const pollData = (await pollRes.json().catch(() => null)) as {
            ok?: boolean;
            status?: "running" | "success" | "error";
            progressPct?: number;
            stage?: string;
            logs?: string[];
            error?: string;
          } | null;

          consecutiveErrors = 0; // 重置错误计数

          if (pollData?.logs && Array.isArray(pollData.logs)) {
            setLogs(pollData.logs);
          }
          if (typeof pollData?.progressPct === "number") {
            setProgressPct(pollData.progressPct);
          }
          if (pollData?.stage) {
            setStageText(pollData.stage);
          }

          if (pollData?.status === "success") {
            isDone = true;
            setStatus("success");
            setProgressPct(100);
            setStageText("已完成");
            // 触发事件并刷新 Server Components
            if (typeof window !== "undefined") {
              window.dispatchEvent(new Event("content-published"));
            }
            router.refresh();
          } else if (pollData?.status === "error") {
            isDone = true;
            throw new Error(pollData.error ?? "后台同步发版失败");
          }
        } catch (pollErr) {
          consecutiveErrors += 1;
          if (consecutiveErrors > 5) {
            throw pollErr;
          }
          // 容错休眠重试
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "未知同步异常";
      appendLocalLog(`[错误] 同步中断: ${errorMsg}`);
      setStatus("error");
      setProgressPct(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-medium border border-line bg-surface p-s5 shadow-subtle">
      <div className="flex flex-col gap-s3 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-s4">
        <div>
          <div className="flex items-center gap-s2 flex-wrap">
            <h2 className="font-display text-title font-semibold">Notion 文章更新</h2>
            <button
              type="button"
              onClick={handleCopyVersion}
              title="点击复制版本号"
              className="flex items-center gap-s1 rounded-small border border-line bg-surface-subtle px-s2 py-s1 text-caption font-mono text-muted hover:text-ink hover:border-ink transition-colors"
            >
              <span>当前线上指针: {currentVersion ?? "未同步"}</span>
              {copied ? <Check className="size-icon-small text-ink" /> : <Copy className="size-icon-small" />}
            </button>
          </div>
          <p className="mt-s1 text-caption leading-ui text-muted">
            拉取 Notion 校园指南文章与资源，生成最新发布快照并更新前端
          </p>
        </div>

        <div className="flex items-center gap-s3 flex-wrap">
          {/* 预检干跑 Toggle 开关 */}
          <label className="flex items-center gap-s2 cursor-pointer text-caption text-muted hover:text-ink transition-colors">
            <input
              type="checkbox"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
              className="rounded-small border-line"
            />
            <span className="flex items-center gap-s1 font-medium">
              <TestTube className="size-icon-small" />
              预检模式 (仅检查不发布)
            </span>
          </label>

          <button
            type="button"
            onClick={handleSync}
            disabled={loading}
            className="focus-ring tap-target flex items-center justify-center gap-s2 rounded-small bg-ink px-s5 py-s2 text-label font-medium text-surface transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? <RefreshCw className="size-icon animate-spin" /> : <Play className="size-icon" />}
            {loading ? "正在同步文章..." : dryRun ? "预检 Notion" : "同步 Notion 文章"}
          </button>
        </div>
      </div>

      {/* 百分比进度条 */}
      {status === "running" && (
        <div className="mt-s4 space-y-s1">
          <div className="flex items-center justify-between text-caption text-muted font-medium">
            <span>当前进度: {stageText}</span>
            <span>{progressPct}%</span>
          </div>
          <div className="h-s1 w-full overflow-hidden rounded-small bg-surface-subtle border border-line">
            <div
              className="h-full bg-ink transition-all duration-500 ease-out"
              style={{ width: `${Math.max(5, Math.min(100, progressPct))}%` }}
            />
          </div>
        </div>
      )}

      {/* 规整的实时日志终端 */}
      <div className="mt-s5 overflow-hidden rounded-small border border-line bg-ink p-s4 text-surface">
        <div className="flex items-center justify-between border-b border-line pb-s2 text-caption text-muted">
          <div className="flex items-center gap-s2 text-surface/80">
            <Terminal className="size-icon-small" />
            <span>实时同步日志</span>
            {logs.length > 0 && (
              <button
                type="button"
                onClick={() => setLogs([])}
                className="flex items-center gap-s1 text-surface/60 hover:text-surface ml-s2 transition-colors"
                title="清空终端日志"
              >
                <Trash2 className="size-icon-small" />
                <span>清空</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-s3">
            {status === "running" && (
              <button
                type="button"
                onClick={handleForceUnlock}
                className="flex items-center gap-s1 rounded-small border border-surface bg-surface px-s2 py-s1 text-caption font-semibold text-ink hover:bg-surface-subtle transition-colors shadow-subtle"
                title="若长时间卡住可点击强行解锁"
              >
                <ShieldAlert className="size-icon-small text-ink" /> 强制解锁挂起任务
              </button>
            )}
            {status === "running" && (
              <span className="flex items-center gap-s1 text-caption text-surface font-medium animate-pulse">
                <RefreshCw className="size-icon-small animate-spin" /> 正在处理中...
              </span>
            )}
            {status === "success" && (
              <span className="flex items-center gap-s1 text-caption text-surface font-semibold">
                <CheckCircle2 className="size-icon-small text-surface" /> 同步完成
              </span>
            )}
            {status === "error" && (
              <span className="flex items-center gap-s1 text-caption text-surface font-medium">
                <AlertCircle className="size-icon-small" /> 同步中断
              </span>
            )}
          </div>
        </div>
        <pre
          ref={terminalRef}
          className="mt-s3 max-h-56 overflow-y-auto font-mono text-caption leading-relaxed text-surface/90 scroll-smooth"
        >
          {logs.length === 0 ? "点击右上角「同步 Notion 文章」查看实时进度..." : logs.join("\n")}
        </pre>
      </div>
    </section>
  );
}
