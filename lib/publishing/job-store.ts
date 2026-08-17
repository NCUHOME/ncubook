// Notion 发布引擎：Supabase 持久化 Job 存储与并发互斥锁 (严格 Fail-Closed，无内存 Map 兜底)
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
  if (!supabase) return null;

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
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase publication storage is unavailable");

  const { error } = await supabase
    .from("sync_jobs")
    .update({ status: "released", fail_reason: "任务已由运维管理员手动强制解锁", finished_at: new Date().toISOString() })
    .eq("status", "running");

  if (error) {
    throw new Error(`Failed to release zombie jobs: ${error.message}`);
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
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase publication storage is unavailable");

  const jobId = contentVersion;
  const initialLogs = [
    formatLog("🚀 同步任务已成功发起，正在准备拉取 Notion 最新文章..."),
    formatLog("正在建立与 Notion 校园知识库的高速连接..."),
  ];

  const { data: jobRow, error: jobError } = await supabase
    .from("sync_jobs")
    .insert({
      content_version: contentVersion,
      command: "publish",
      status: "running",
    })
    .select("id")
    .single();

  if (jobError || !jobRow) {
    throw new Error(`Failed to create sync job: ${jobError?.message ?? "unknown error"}`);
  }

  const { error: logsError } = await supabase.from("sync_job_logs").insert(
    initialLogs.map((log, seq) => ({
      job_id: jobRow.id,
      seq,
      level: "info" as const,
      event: log,
    })),
  );

  if (logsError) {
    console.error(JSON.stringify({ event: "create_initial_job_logs_failed", contentVersion, error: logsError.message }));
  }

  return {
    jobId,
    contentVersion,
    status: "running",
    progressPct: 15,
    stage: "正在准备",
    logs: initialLogs,
    createdAt: Date.now(),
  };
}

export async function getPersistentJob(jobId: string): Promise<PersistentSyncJob | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

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

    if (!job) return null;

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
    return null;
  }
}

export async function updateJobLogs(jobId: string, newLogs: string[]): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase publication storage is unavailable");

  const { data: jobRow, error: findError } = await supabase
    .from("sync_jobs")
    .select("id")
    .eq("content_version", jobId)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (findError || !jobRow) {
    throw new Error(`Cannot update logs for job ${jobId}: job not found`);
  }

  const { count } = await supabase
    .from("sync_job_logs")
    .select("*", { count: "exact", head: true })
    .eq("job_id", jobRow.id);

  const currentSeq = count ?? 0;
  const newEntries = newLogs.slice(currentSeq);
  if (newEntries.length > 0) {
    const { error: insertError } = await supabase.from("sync_job_logs").insert(
      newEntries.map((log, index) => ({
        job_id: jobRow.id,
        seq: currentSeq + index,
        level: "info" as const,
        event: log,
      })),
    );
    if (insertError) {
      console.error(JSON.stringify({ event: "insert_job_logs_failed", jobId, error: insertError.message }));
    }
  }

  await supabase
    .from("sync_jobs")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", jobRow.id);
}

export async function finishPersistentJob(
  jobId: string,
  resultStatus: "success" | "error",
  finalLogs: string[],
  errorMessage?: string,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase publication storage is unavailable");

  const { data: jobRow, error: findError } = await supabase
    .from("sync_jobs")
    .select("id")
    .eq("content_version", jobId)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (findError || !jobRow) {
    throw new Error(`Cannot finish job ${jobId}: job not found`);
  }

  await updateJobLogs(jobId, finalLogs);
  const { error: updateError } = await supabase
    .from("sync_jobs")
    .update({
      status: resultStatus === "success" ? "succeeded" : "failed",
      fail_reason: errorMessage || null,
      finished_at: new Date().toISOString(),
    })
    .eq("id", jobRow.id);

  if (updateError) {
    throw new Error(`Failed to update job status: ${updateError.message}`);
  }
}
