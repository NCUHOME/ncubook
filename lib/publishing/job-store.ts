// Notion 发布引擎：Supabase 持久化 Job 存储与并发互斥锁 (支持 Serverless 多实例轮询与自动防重锁)
import { getSupabaseAdmin, hasSupabaseConfig } from "@/lib/integrations/supabase";

export type PersistentSyncJob = {
  jobId: string;
  contentVersion: string;
  status: "running" | "success" | "error";
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

    let logs: string[] = ["🚀 发现后台正在运行中的同步发版任务..."];
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
      logs,
      createdAt: new Date(data.created_at).getTime(),
    };
  } catch {
    return null;
  }
}

function formatLog(msg: string): string {
  const time = new Date().toLocaleTimeString("zh-CN", { hour12: false });
  return `[${time}] ${msg}`;
}

export async function createPersistentJob(contentVersion: string): Promise<PersistentSyncJob> {
  const jobId = contentVersion;
  const initialLogs = [
    formatLog("🚀 同步任务已成功发起，正在安全准备向后台派发处理..."),
    formatLog("正在建立与 Notion 校园知识库及云数据库的高速通道..."),
  ];

  const job: PersistentSyncJob = {
    jobId,
    contentVersion,
    status: "running",
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
        logs = [`❌ 同步异常: ${data.failure_reason}`];
      }
    }

    const jobStatus: "running" | "success" | "error" =
      data.status === "published" ? "success" : data.status === "failed" ? "error" : "running";

    return {
      jobId: data.id,
      contentVersion: data.id,
      status: jobStatus,
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
