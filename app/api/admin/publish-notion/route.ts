// API 路由：Notion 远程发布与版本回滚 Webhook 触发入口 (支持 Session/Token 鉴权、Supabase 持久化 Job 存储、并发互斥锁与异常收尾)
import { after } from "next/server";
import { authenticateAdminRequest } from "@/lib/publishing/auth";
import {
  createPersistentJob,
  findActiveRunningJob,
  finishPersistentJob,
  forceReleaseZombieJobs,
  getPersistentJob,
  updateJobLogs,
} from "@/lib/publishing/job-store";
import { runNotionPublicationCommand } from "@/lib/publishing/pipeline";
import { parseCommand, type PublicationCommand } from "@/lib/publishing/route";
import { fetchContentVersionsFromSupabase } from "@/lib/content/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const isAuthenticated = await authenticateAdminRequest(request);
  if (!isAuthenticated) {
    return Response.json({ ok: false, error: "unauthorized", reason: "未登录或鉴权秘钥无效" }, { status: 401 });
  }

  const url = new URL(request.url);
  const action = url.searchParams.get("action");
  if (action === "versions") {
    const versions = await fetchContentVersionsFromSupabase();
    return Response.json({ ok: true, versions }, { status: 200 });
  }

  const jobId = url.searchParams.get("jobId");
  if (!jobId) return Response.json({ ok: false, error: "missing_job_id" }, { status: 400 });

  const job = await getPersistentJob(jobId);
  if (!job) return Response.json({ ok: false, error: "job_not_found" }, { status: 404 });

  return Response.json(
    {
      ok: true,
      jobId: job.jobId,
      status: job.status,
      progressPct: job.progressPct,
      stage: job.stage,
      logs: job.logs,
      result: job.result,
      error: job.error,
    },
    { status: 200 },
  );
}

export async function POST(request: Request): Promise<Response> {
  const isAuthenticated = await authenticateAdminRequest(request);
  if (!isAuthenticated) {
    return Response.json({ ok: false, error: "unauthorized", reason: "未登录或鉴权秘钥无效" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);

  // 支持强行解开死锁挂起任务
  if (payload?.forceUnlock === true) {
    await forceReleaseZombieJobs();
    return Response.json({ ok: true, message: "已成功手动解除僵尸任务挂起锁" }, { status: 200 });
  }

  const command = parseCommand(payload);
  if (!command) {
    return Response.json({ ok: false, error: "invalid_publication_command" }, { status: 400 });
  }

  // 网页版本切线与回滚指令：立即高效切线，无需异步长时间轮询
  if (command.operation === "rollback") {
    try {
      const result = await runNotionPublicationCommand(command);
      return Response.json({ ok: true, operation: "rollback", version: command.version, result }, { status: 200 });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return Response.json({ ok: false, error: "rollback_failed", reason: errorMsg }, { status: 500 });
    }
  }

  // 网页历史版本彻底删除指令：立即清理关联数据库与 Storage 资源
  if (command.operation === "delete") {
    try {
      const result = await runNotionPublicationCommand(command);
      return Response.json({ ok: true, operation: "delete", version: command.version, result }, { status: 200 });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return Response.json({ ok: false, error: "delete_failed", reason: errorMsg }, { status: 400 });
    }
  }

  // 网页控制台默认使用 async 异步非阻塞模式，0.05 秒立刻返回，规避 EdgeOne 30s 限制
  const isAsync = payload?.async !== false;

  try {
    // 互斥锁检查：是否有状态为 running / pending 的任务在跑
    const activeJob = await findActiveRunningJob();
    if (activeJob) {
      return Response.json(
        {
          ok: true,
          async: true,
          jobId: activeJob.jobId,
          status: "running",
          progressPct: activeJob.progressPct,
          stage: activeJob.stage,
          logs: activeJob.logs,
          reason: "已有发版任务在后台运行中，互斥锁已激活防重触发",
        },
        { status: 200 },
      );
    }

    const contentVersion = `content-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 17)}`;
    const publishCommand: PublicationCommand = { ...command, contentVersion };
    const job = await createPersistentJob(contentVersion);
    const jobId = job.jobId;
    const jobLogs = [...job.logs];

    // 网页端默认使用 Next.js 15 官方 after() 上下文调度后台任务，0.05秒极速返回规避 EdgeOne 30s 网关超时
    if (isAsync) {
      after(async () => {
        try {
          await runNotionPublicationCommand(publishCommand, (logMsg) => {
            jobLogs.push(logMsg);
            updateJobLogs(jobId, jobLogs).catch(() => null);
          });
          await finishPersistentJob(jobId, "success", jobLogs);
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          jobLogs.push(`❌ 同步中断: ${errorMsg}`);
          await finishPersistentJob(jobId, "error", jobLogs, errorMsg);
        }
      });

      return Response.json(
        {
          ok: true,
          async: true,
          jobId,
          status: "running",
          logs: jobLogs,
        },
        { status: 200 },
      );
    }

    // 同步阻塞模式 (供 CLI / CI/CD 快速脚本使用)
    const result = await runNotionPublicationCommand(publishCommand, (logMsg) => {
      jobLogs.push(logMsg);
    });
    await finishPersistentJob(jobId, "success", jobLogs);
    return Response.json({ ok: true, jobId, status: "success", result }, { status: 200 });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(JSON.stringify({ event: "create_publish_job_failed", error: errorMsg }));
    return Response.json({ ok: false, error: "trigger_failed", reason: errorMsg }, { status: 500 });
  }
}
