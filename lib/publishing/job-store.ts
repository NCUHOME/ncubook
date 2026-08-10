// Notion 发布引擎：Supabase 持久化 Job 存储与并发互斥锁 (支持 Serverless 多实例轮询、进度百分比、僵尸任务自动自愈与强解锁)
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
    const { data, error } = await supabase
      .from("content_versions")
      .select("id, status, failure_reason, created_at")
      .eq("status", "pending")
      .gte("created_at", fifteenMinsAgo)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;

    let logs: string[] = ["🚀 发现后台正在处理中的同步任务..."];
    if (typeof data.failure_reason === "string" && data.failure_reason.startsWith("[")) {
      try {
        logs = JSON.parse(data.failure_reason) as string[];
      } catch {
        // use default
      }
    }

    return {
      jobId: data.id,
      contentVersion: data.id,
      status: "running",
      progressPct: 50,
      stage: "同步处理中",
      logs,
      createdAt: new Date(data.created_at).getTime(),
    };
  } catch {
    return null;
  }
}

// 强制解锁死锁/僵尸挂起任务
export async function forceReleaseZombieJobs(): Promise<void> {
  for (const [id, job] of fallbackMemoryJobs.entries()) {
    if (job.status === "running") {
      job.status = "error";
      job.error = "任务已由运维管理员手动解除挂起锁";
    }
  }

  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      await supabase
        .from("content_versions")
        .update({ status: "failed", failure_reason: "任务已由运维管理员手动强制解锁" })
        .eq("status", "pending");
    } catch {
      // ignore
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
    progressPct: 10,
    stage: "正在连接 Notion",
    logs: initialLogs,
    createdAt: Date.now(),
  };

  fallbackMemoryJobs.set(jobId, job);

  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      await supabase.from("content_versions").insert({
        id: contentVersion,
        source_root_id: process.env.NOTION_ROOT_PAGE_ID || "root",
        status: "pending",
        failure_reason: JSON.stringify(initialLogs),
      });
    } catch {
      // 容错使用内存态
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
    const { data, error } = await supabase
      .from("content_versions")
      .select("id, status, checksum, failure_reason, created_at")
      .eq("id", jobId)
      .maybeSingle();

    if (error || !data) {
      return fallbackMemoryJobs.get(jobId) ?? null;
    }

    let logs: string[] = [];
    let failureReason: string | undefined;

    if (typeof data.failure_reason === "string") {
      if (data.failure_reason.startsWith("[")) {
        try {
          logs = JSON.parse(data.failure_reason) as string[];
        } catch {
          logs = [data.failure_reason];
        }
      } else {
        failureReason = data.failure_reason;
        logs = [`❌ 同步中断: ${data.failure_reason}`];
      }
    }

    const jobStatus: "running" | "success" | "error" =
      data.status === "published" ? "success" : data.status === "failed" ? "error" : "running";

    // 根据最新日志计算通俗易懂的进度百分比
    let progressPct = jobStatus === "success" ? 100 : jobStatus === "error" ? 0 : 20;
    let stage = jobStatus === "success" ? "已发布" : jobStatus === "error" ? "已中断" : "处理中";

    const lastLog = logs[logs.length - 1] ?? "";
    if (lastLog.includes("[阶段 1/5]") || lastLog.includes("正在连接 Notion")) {
      progressPct = 20;
      stage = "连接知识库";
    } else if (lastLog.includes("[阶段 2/5]") || lastLog.includes("成功找到")) {
      progressPct = 40;
      stage = "读取文章列表";
    } else if (lastLog.includes("[阶段 3/5]") || lastLog.includes("修改时间")) {
      progressPct = 60;
      stage = "校验文章格式";
    } else if (lastLog.includes("[阶段 4/5]") || lastLog.includes("同步文章图片")) {
      progressPct = 80;
      stage = "同步下载图片";
    } else if (lastLog.includes("[阶段 5/5]") || lastLog.includes("正在发布")) {
      progressPct = 95;
      stage = "发布至网站";
    } else if (lastLog.includes("全量完成") || lastLog.includes("成功发布")) {
      progressPct = 100;
      stage = "已完成";
    }

    return {
      jobId: data.id,
      contentVersion: data.id,
      status: jobStatus,
      progressPct,
      stage,
      logs,
      ...(failureReason ? { error: failureReason } : {}),
      ...(data.checksum ? { result: { checksum: data.checksum } } : {}),
      createdAt: new Date(data.created_at).getTime(),
    };
  } catch {
    return fallbackMemoryJobs.get(jobId) ?? null;
  }
}

export async function updateJobLogs(jobId: string, newLogs: string[]): Promise<void> {
  const job = fallbackMemoryJobs.get(jobId);
  if (job) {
    job.logs = newLogs;
  }

  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      await supabase
        .from("content_versions")
        .update({ failure_reason: JSON.stringify(newLogs) })
        .eq("id", jobId);
    } catch {
      // ignore
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
      if (resultStatus === "error") {
        await supabase
          .from("content_versions")
          .update({
            status: "failed",
            failure_reason: errorMessage || JSON.stringify(finalLogs),
          })
          .eq("id", jobId);
      } else {
        await supabase
          .from("content_versions")
          .update({
            failure_reason: JSON.stringify(finalLogs),
          })
          .eq("id", jobId);
      }
    } catch {
      // ignore
    }
  }
}
