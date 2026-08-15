// 管理员问答测试沙盒与 RAG 白盒探针 API 路由 (app/api/admin/ask/inspect/route.ts)
// 消解内部 HTTP Loopback，直接调用生产 AnswerService，支持真实全链路与基准探针分析
import { NextResponse } from "next/server";
import { createProductionAnswerService, type AnswerService } from "@/lib/ai/ask";
import { buildAnswerPrompt } from "@/lib/ai/prompt";
import { createSupabaseRetrievalRepository, retrieveGroundingSources, type RetrievalSource } from "@/lib/ai/retrieve";
import { createAnswerFixture, type AnswerSession } from "@/lib/ai/session";
import { authenticateAdminRequest } from "@/lib/publishing/auth";
import { getSupabaseAdmin } from "@/lib/integrations/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let productionServiceCache: AnswerService | undefined;

export async function POST(request: Request) {
  const isAuthenticated = await authenticateAdminRequest(request);
  if (!isAuthenticated) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const startedAt = performance.now();

  try {
    const body = (await request.json().catch(() => ({}))) as {
      question?: string;
      pageContext?: { pageId: string; anchor?: string };
      maxCandidates?: number;
      forceMock?: boolean;
    };

    const question = (body.question ?? "").trim();
    if (!question) {
      return NextResponse.json({ ok: false, error: "问题内容不能为空" }, { status: 400 });
    }

    const pageContext = body.pageContext?.pageId ? body.pageContext : undefined;
    const maxCandidates = Math.min(20, Math.max(1, body.maxCandidates ?? 8));
    const forceMock = Boolean(body.forceMock);

    let session: AnswerSession;
    let candidates: RetrievalSource[] = [];
    let promptSnapshot = { system: "", user: "" };
    let mode: "live" | "mock" = "live";
    let executionError: string | null = null;

    const supabase = getSupabaseAdmin();
    const hasAiKey = Boolean(process.env.AI_PROVIDER_API_KEY);

    if (!forceMock && supabase && hasAiKey) {
      // 真实全链路模式：直接内部调用服务，消除内部 HTTP 自循环回环 (HTTP Loopback)
      mode = "live";
      try {
        const repo = createSupabaseRetrievalRepository(supabase);
        candidates = await retrieveGroundingSources({
          question,
          pageContext,
          repository: repo,
          maxCandidates,
        });

        promptSnapshot = buildAnswerPrompt(question, candidates);

        try {
          productionServiceCache ??= createProductionAnswerService();
          session = await productionServiceCache({ question, pageContext });
        } catch (serviceErr) {
          executionError = serviceErr instanceof Error ? serviceErr.message : "大模型生成服务执行异常";
          // 真实模型异常时，记录真实错误并使用基准 fixture 保底，向管理员如实上报 executionError
          session = createAnswerFixture(question, pageContext);
        }
      } catch (retrievalErr) {
        executionError = retrievalErr instanceof Error ? retrievalErr.message : "检索服务执行异常";
        session = createAnswerFixture(question, pageContext);
        mode = "mock";
      }
    } else {
      // 基准评测模式：绝不伪造虚假打分数据，检索候选如实反映
      mode = "mock";
      session = createAnswerFixture(question, pageContext);
      if (supabase) {
        try {
          const repo = createSupabaseRetrievalRepository(supabase);
          candidates = await retrieveGroundingSources({
            question,
            pageContext,
            repository: repo,
            maxCandidates,
          });
        } catch {
          candidates = [];
        }
      } else {
        candidates = [];
      }
      promptSnapshot = buildAnswerPrompt(question, candidates);
    }

    const latencyMs = Number((performance.now() - startedAt).toFixed(1));

    // Token 预估
    const systemTokens = Math.ceil(promptSnapshot.system.length / 1.8);
    const userTokens = Math.ceil(promptSnapshot.user.length / 1.8);
    const totalEstimatedTokens = systemTokens + userTokens;

    // 事实归因树
    const attributionTree = session.claims.map((claim) => {
      const cited = claim.citationIds.map((cId) => {
        const cit = session.citations.find((c) => c.id === cId);
        return {
          citationId: cId,
          pageTitle: cit?.pageTitle ?? "未知文档",
          anchor: cit?.anchor ?? "b-root",
          excerpt: cit?.excerpt ?? "",
        };
      });
      return {
        claimId: claim.id,
        text: claim.text,
        status: claim.status,
        citations: cited,
      };
    });

    return NextResponse.json({
      ok: true,
      session,
      inspection: {
        question,
        pageContext,
        mode,
        latencyMs,
        executionError,
        candidates: candidates.map((c) => ({
          id: c.id,
          pageId: c.pageId,
          pageTitle: c.pageTitle,
          anchor: c.anchor,
          exactText: c.exactText,
          lexicalScore: c.lexicalScore,
          vectorScore: c.vectorScore,
          combinedScore: Number((c.lexicalScore * 1 + c.vectorScore * 2).toFixed(2)),
          riskLevel: c.riskLevel,
        })),
        promptSnapshot,
        tokenEstimates: {
          systemTokens,
          userTokens,
          totalEstimatedTokens,
        },
        attributionTree,
      },
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "探针调试异常";
    return NextResponse.json({ ok: false, error: errorMsg }, { status: 500 });
  }
}
