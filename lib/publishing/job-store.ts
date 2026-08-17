// Notion 发布引擎：Supabase 持久化 Job 存储与并发互斥锁 (M-5 独立 sync_jobs 与 sync_job_logs 表存储)
import { getSupabaseAdmin } from "@/lib/integrations/supabase";

export type PersistentSyncJob = {
  jobId: string;
  contentVersion: string;
  status: "running" | "success" | "error";
  progressPct: number;
  stage: string;
  logs: string[];
  result?: Record<string, unknown>;
  error?: string;
  createdAt: number;
};

// 内存兜底 Store (当未配置 Supabase 时备用)
const fallbackMemoryJobs = new Map<string, PersistentSyncJob>();

export function calculateProgressAndStage(
  logs: string[],
  status: "running" | "success" | "error",
): { progressPct: number; stage: string } {
  if (status === "success") return { progressPct: 100, stage: "已完成" };
  if (status === "error") return { progressPct: 0, stage: "已中断" };

  let progressPct = 15;
  let stage = "正在准备";

  for (const log of logs) {
    const pageMatch = log.match(/已完成\s+(\d+)\/(\d+)\s+篇/);
    if (pageMatch && pageMatch[1] && pageMatch[2]) {
      const current = parseInt(pageMatch[1], 10);
      const total = parseInt(pageMatch[2], 10);
      if (total > 0) {
        progressPct = Math.min(94, 70 + Math.round((current / total) * 24));
        stage = `同步文章图片 (${current}/${total})`;
      }
    } else if (log.includes("[阶段 1/5]") || log.includes("正在连接 Notion")) {
      progressPct = Math.max(progressPct, 20);
      stage = "连接知识库";
    } else if (log.includes("[阶段 2/5]") || log.includes("成功找到")) {
      progressPct = Math.max(progressPct, 40);
      stage = "读取文章列表";
    } else if (log.includes("[阶段 3/5]") || log.includes("修改时间")) {
      progressPct = Math.max(progressPct, 60);
      stage = "校验文章格式";
    } else if (log.includes("[阶段 4/5]") || log.includes("同步文章图片")) {
      progressPct = Math.max(progressPct, 70);
      stage = "下载图片与排版";
    } else if (log.includes("[阶段 5/5]") || log.includes("正在发布")) {
      progressPct = Math.max(progressPct, 95);
      stage = "发布至网站";
    } else if (log.includes("全量完成") || log.includes("成功发布")) {
      progressPct = 100;
      stage = "已完成";
    }
  }

  return { progressPct, stage };
}

export async function findActiveRunningJob(): Promise<PersistentSyncJob | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    const now = Date.now();
    for (const job of fallbackMemoryJobs.values()) {
      if (job.status === "running" && now - job.createdAt < 15 * 60 * 1000) {
        return job;
      }
    }
    return null;
  }

  try {
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: job, error } = await supabase
      .from("sync_jobs")
      .select("id, content_version, status, fail_reason, started_at")
      .eq("status", "running")
      .gte("started_at", fifteenMinsAgo)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !job) return null;

    const { data: logsData } = await supabase
      .from("sync_job_logs")
      .select("event")
      .eq("job_id", job.id)
      .order("seq", { ascending: true });

    const logs: string[] = (logsData ?? []).map((row) => row.event);
    if (logs.length === 0) logs.push("🚀 发现后台正在处理中的同步任务...");

    const { progressPct, stage } = calculateProgressAndStage(logs, "running");

    return {
      jobId: job.content_version || job.id,
      contentVersion: job.content_version || job.id,
      status: "running",
      progressPct,
      stage,
      logs,
      createdAt: new Date(job.started_at).getTime(),
    };
  } catch (error) {
    console.error(JSON.stringify({ event: "get_running_job_failed", error: error instanceof Error ? error.message : String(error) }));
    return null;
  }
}

// 强制解锁死锁/僵尸挂起任务
export async function forceReleaseZombieJobs(): Promise<void> {
  for (const [, job] of fallbackMemoryJobs.entries()) {
    if (job.status === "running") {
      job.status = "error";
      job.error = "任务已由运维管理员手动解除挂起锁";
    }
  }

  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      await supabase
        .from("sync_jobs")
        .update({ status: "released", fail_reason: "任务已由运维管理员手动强制解锁", finished_at: new Date().toISOString() })
        .eq("status", "running");
    } catch (error) {
      console.error(JSON.stringify({ event: "force_release_zombie_jobs_failed", error: error instanceof Error ? error.message : String(error) }));
    }
  }
}

function formatLog(msg: string): string {
  const time = new Date().toLocaleTimeString("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour12: false,
  });
  return `[${time}] ${msg}`;
}

export async function createPersistentJob(contentVersion: string): Promise<PersistentSyncJob> {
  const jobId = contentVersion;
  const initialLogs = [
    formatLog("🚀 同步任务已成功发起，正在准备拉取 Notion 最新文章..."),
    formatLog("正在建立与 Notion 校园知识库的高速连接..."),
  ];

  const job: PersistentSyncJob = {
    jobId,
    contentVersion,
    status: "running",
    progressPct: 15,
    stage: "正在准备",
    logs: initialLogs,
    createdAt: Date.now(),
  };

  fallbackMemoryJobs.set(jobId, job);

  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const { data: jobRow } = await supabase
        .from("sync_jobs")
        .insert({
          content_version: contentVersion,
          command: "publish",
          status: "running",
        })
        .select("id")
        .single();

      if (jobRow) {
        await supabase.from("sync_job_logs").insert(
          initialLogs.map((log, seq) => ({
            job_id: jobRow.id,
            seq,
            level: "info" as const,
            event: log,
          })),
        );
      }
    } catch (error) {
      console.error(JSON.stringify({ event: "create_persistent_job_failed", contentVersion, error: error instanceof Error ? error.message : String(error) }));
    }
  }

  return job;
}

export async function getPersistentJob(jobId: string): Promise<PersistentSyncJob | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return fallbackMemoryJobs.get(jobId) ?? null;
  }

  try {
    let { data: job } = await supabase
      .from("sync_jobs")
      .select("id, content_version, status, fail_reason, started_at")
      .eq("content_version", jobId)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!job) {
      const byIdResult = await supabase
        .from("sync_jobs")
        .select("id, content_version, status, fail_reason, started_at")
        .eq("id", jobId)
        .maybeSingle();
      job = byIdResult.data;
    }

    if (!job) {
      return fallbackMemoryJobs.get(jobId) ?? null;
    }

    const { data: logsData } = await supabase
      .from("sync_job_logs")
      .select("event")
      .eq("job_id", job.id)
      .order("seq", { ascending: true });

    const logs: string[] = (logsData ?? []).map((row) => row.event);
    const failureReason = job.fail_reason ?? undefined;

    const jobStatus: "running" | "success" | "error" =
      job.status === "succeeded" ? "success" : job.status === "failed" || job.status === "released" ? "error" : "running";

    const { progressPct, stage } = calculateProgressAndStage(logs, jobStatus);

    return {
      jobId: job.content_version || job.id,
      contentVersion: job.content_version || job.id,
      status: jobStatus,
      progressPct,
      stage,
      logs,
      ...(failureReason ? { error: failureReason } : {}),
      createdAt: new Date(job.started_at).getTime(),
    };
  } catch (error) {
    console.error(JSON.stringify({ event: "get_persistent_job_failed", jobId, error: error instanceof Error ? error.message : String(error) }));
    return fallbackMemoryJobs.get(jobId) ?? null;
  }
}

export async function updateJobLogs(jobId: string, newLogs: string[]): Promise<void> {
  const job = fallbackMemoryJobs.get(jobId);
  if (job) {
    job.logs = newLogs;
    const { progressPct, stage } = calculateProgressAndStage(newLogs, job.status);
    job.progressPct = progressPct;
    job.stage = stage;
  }

  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const { data: jobRow } = await supabase
        .from("sync_jobs")
        .select("id")
        .eq("content_version", jobId)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (jobRow) {
        const { count } = await supabase
          .from("sync_job_logs")
          .select("*", { count: "exact", head: true })
          .eq("job_id", jobRow.id);

        const currentSeq = count ?? 0;
        const newEntries = newLogs.slice(currentSeq);
        if (newEntries.length > 0) {
          await supabase.from("sync_job_logs").insert(
            newEntries.map((log, index) => ({
              job_id: jobRow.id,
              seq: currentSeq + index,
              level: "info" as const,
              event: log,
            })),
          );
        }
        await supabase
          .from("sync_jobs")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", jobRow.id);
      }
    } catch (error) {
      console.error(JSON.stringify({ event: "update_job_logs_failed", jobId, error: error instanceof Error ? error.message : String(error) }));
    }
  }
}

export async function finishPersistentJob(
  jobId: string,
  resultStatus: "success" | "error",
  finalLogs: string[],
  errorMessage?: string,
): Promise<void> {
  const job = fallbackMemoryJobs.get(jobId);
  if (job) {
    job.status = resultStatus;
    job.logs = finalLogs;
    job.progressPct = resultStatus === "success" ? 100 : 0;
    job.stage = resultStatus === "success" ? "已完成" : "已中断";
    if (errorMessage) job.error = errorMessage;
  }

  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const { data: jobRow } = await supabase
        .from("sync_jobs")
        .select("id")
        .eq("content_version", jobId)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (jobRow) {
        await updateJobLogs(jobId, finalLogs);
        await supabase
          .from("sync_jobs")
          .update({
            status: resultStatus === "success" ? "succeeded" : "failed",
            fail_reason: errorMessage || null,
            finished_at: new Date().toISOString(),
          })
          .eq("id", jobRow.id);
      }
    } catch (error) {
      console.error(JSON.stringify({ event: "finish_persistent_job_failed", jobId, resultStatus, error: error instanceof Error ? error.message : String(error) }));
    }
  }
}
