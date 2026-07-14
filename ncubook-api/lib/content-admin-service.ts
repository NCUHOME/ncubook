import type { SupabaseClient } from "@supabase/supabase-js";
import { generateText } from "ai";
import { getChatModel, hasChatModelConfig } from "@/lib/gemini";
import {
    buildDraftMarkdown,
    classifyOfficialContent,
    DEFAULT_OFFICIAL_SOURCES,
    extractPublishedAt,
    extractTitle,
    hashText,
    stripHtml,
    type ContentClassification,
} from "@/lib/official-content";

type OfficialSourceRow = {
    id: string;
    source_key: string;
    name: string;
    department: string;
    category: string;
    url: string;
    is_enabled: boolean;
    last_crawled_at?: string | null;
    last_status?: string | null;
    last_error?: string | null;
};

type CandidateEventRow = {
    id: string;
    source_id: string;
    snapshot_id?: string | null;
    source_name: string;
    department: string;
    title: string;
    source_url: string;
    published_at?: string | null;
    content_excerpt: string;
    status: string;
    risk_level: "low" | "medium" | "high";
    filter_reason: string;
    matched_keywords?: string[] | null;
    ignored_keywords?: string[] | null;
    suggested_doc_path?: string | null;
    suggested_action: string;
    created_at: string;
    updated_at: string;
};

function compactText(value: string, maxLength: number) {
    return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function errorMessage(error: unknown) {
    if (error instanceof Error) {
        return error.message;
    }
    return typeof error === "string" ? error : "Unknown error";
}

function extractJsonObject(text: string) {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
        return null;
    }

    try {
        return JSON.parse(match[0]) as Record<string, unknown>;
    } catch {
        return null;
    }
}

async function refineClassificationWithAI(
    input: {
        department: string;
        title: string;
        sourceUrl: string;
        contentExcerpt: string;
    },
    base: ContentClassification
): Promise<ContentClassification> {
    if (!hasChatModelConfig() || base.status === "ignored") {
        return base;
    }

    try {
        const { text } = await generateText({
            model: getChatModel(),
            system:
                "你是校园信息运营中台的筛选 Agent。只判断官网内容是否值得进入学生手册维护队列。学院新闻、会议报道、宣传稿默认排除。",
            prompt: `请基于以下官网内容做二次筛选，只输出 JSON，不要输出解释。

JSON 字段：
- status: "ignored" | "watching" | "candidate"
- riskLevel: "low" | "medium" | "high"
- reason: 中文，50字以内
- suggestedDocPath: 字符串或 null，只能是 docs/ 开头的 Markdown 路径
- suggestedAction: 中文，50字以内

判断标准：
- 影响学生办事、资格、时间、材料、费用、入口、政策，进入 candidate。
- 可能有用但不急，进入 watching。
- 新闻报道、会议、调研、讲座、领导动态、宣传稿，进入 ignored。
- 转专业、奖助学金、资格、名额、费用、截止、考试、处分为 high。

部门：${input.department}
标题：${input.title}
来源：${input.sourceUrl}
规则初判：${JSON.stringify(base)}
正文摘要：${input.contentExcerpt}`,
        });
        const payload = extractJsonObject(text);
        const status = payload?.status;
        const riskLevel = payload?.riskLevel;

        if (
            payload &&
            (status === "ignored" || status === "watching" || status === "candidate") &&
            (riskLevel === "low" || riskLevel === "medium" || riskLevel === "high")
        ) {
            return {
                ...base,
                status,
                riskLevel,
                reason: typeof payload.reason === "string" ? payload.reason : base.reason,
                suggestedDocPath:
                    typeof payload.suggestedDocPath === "string" && payload.suggestedDocPath.startsWith("docs/")
                        ? payload.suggestedDocPath
                        : base.suggestedDocPath,
                suggestedAction:
                    typeof payload.suggestedAction === "string" ? payload.suggestedAction : base.suggestedAction,
            };
        }
    } catch (error) {
        console.warn("AI classification fallback:", errorMessage(error));
    }

    return base;
}

async function generateMarkdownDraftWithAI(input: {
    title: string;
    sourceUrl: string;
    department: string;
    publishedAt?: string | null;
    contentExcerpt: string;
    classification: ContentClassification;
}) {
    const fallback = buildDraftMarkdown(input);
    if (!hasChatModelConfig()) {
        return fallback;
    }

    try {
        const { text } = await generateText({
            model: getChatModel(),
            system:
                "你是南昌大学校园手册的内容运营编辑。你只能根据官方来源写可审核 Markdown 初稿，不能声称已经发布，不能编造官方原文没有的信息。",
            prompt: `请写一份可编辑的 Markdown 初稿，用于此间/小家园内容中台人工审核。

必须包含这些板块：
- 标题建议
- 学生可读摘要
- 适用对象和时间范围
- 办理路径 / 注意事项
- 官方来源链接
- 需人工核实字段
- 建议更新到哪个手册页面
- 风险提示

规则：
- 不要写成新闻稿。
- 不要自动宣布政策结论，涉及资格、名额、费用、处分、奖助学金、转专业时必须提示以官方通知/学院细则为准。
- 保留来源链接。

部门：${input.department}
标题：${input.title}
发布时间：${input.publishedAt || "待核实"}
来源：${input.sourceUrl}
建议页面：${input.classification.suggestedDocPath || "待确认"}
风险级别：${input.classification.riskLevel}
筛选理由：${input.classification.reason}
官网摘要：${input.contentExcerpt}`,
        });

        return text.trim() || fallback;
    } catch (error) {
        console.warn("AI draft fallback:", errorMessage(error));
        return fallback;
    }
}

async function recordAuditLog(
    supabase: SupabaseClient,
    action: string,
    entityType: string,
    entityId: string | null,
    detail: Record<string, unknown> = {}
) {
    await supabase.from("content_audit_logs").insert({
        action,
        entity_type: entityType,
        entity_id: entityId,
        detail,
    });
}

export async function ensureDefaultSources(supabase: SupabaseClient) {
    const { error } = await supabase.from("official_sources").upsert(DEFAULT_OFFICIAL_SOURCES, {
        onConflict: "source_key",
        ignoreDuplicates: false,
    });

    if (error) {
        throw error;
    }
}

export async function listOfficialSources(supabase: SupabaseClient) {
    await ensureDefaultSources(supabase);

    const { data, error } = await supabase
        .from("official_sources")
        .select("*")
        .order("department", { ascending: true })
        .order("name", { ascending: true });

    if (error) {
        throw error;
    }

    return data ?? [];
}

async function fetchOfficialPage(source: OfficialSourceRow) {
    const response = await fetch(source.url, {
        headers: {
            "User-Agent": "ncubook-official-content-bot/1.0",
            Accept: "text/html,application/xhtml+xml,application/pdf;q=0.8,*/*;q=0.5",
        },
    });

    if (!response.ok) {
        throw new Error(`Fetch failed: ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/pdf") || source.url.endsWith(".pdf")) {
        const bytes = Buffer.from(await response.arrayBuffer());
        return {
            title: source.name,
            text: `${source.name}。该来源为 PDF 文件，需要人工打开来源链接核验。`,
            publishedAt: null,
            contentHash: hashText(bytes.toString("base64")),
        };
    }

    const html = await response.text();
    const title = extractTitle(html, source.name);
    const text = stripHtml(html);

    return {
        title,
        text,
        publishedAt: extractPublishedAt(html),
        contentHash: hashText(`${title}\n${text}`),
    };
}

async function createSnapshotAndEvent({
    supabase,
    source,
    page,
    classification,
}: {
    supabase: SupabaseClient;
    source: OfficialSourceRow;
    page: Awaited<ReturnType<typeof fetchOfficialPage>>;
    classification: ContentClassification;
}) {
    const contentExcerpt = compactText(page.text, 1200);

    const { data: snapshot, error: snapshotError } = await supabase
        .from("official_snapshots")
        .insert({
            source_id: source.id,
            url: source.url,
            title: page.title,
            content_excerpt: contentExcerpt,
            content_hash: page.contentHash,
            published_at: page.publishedAt,
            raw_text: compactText(page.text, 8000),
        })
        .select("id")
        .single();

    if (snapshotError) {
        if (snapshotError.code === "23505") {
            return { created: false, status: "unchanged" };
        }
        throw snapshotError;
    }

    const eventHash = hashText(`${source.id}:${page.contentHash}`);
    const { error: eventError } = await supabase.from("official_candidate_events").insert({
        source_id: source.id,
        snapshot_id: snapshot.id,
        event_hash: eventHash,
        source_name: source.name,
        department: source.department,
        title: page.title,
        source_url: source.url,
        published_at: page.publishedAt,
        content_excerpt: contentExcerpt,
        status: classification.status,
        risk_level: classification.riskLevel,
        filter_reason: classification.reason,
        matched_keywords: classification.matchedKeywords,
        ignored_keywords: classification.ignoredKeywords,
        suggested_doc_path: classification.suggestedDocPath,
        suggested_action: classification.suggestedAction,
    });

    if (eventError && eventError.code !== "23505") {
        throw eventError;
    }

    await recordAuditLog(supabase, "candidate.created", "official_candidate_event", null, {
        sourceKey: source.source_key,
        status: classification.status,
        riskLevel: classification.riskLevel,
    });

    return { created: true, status: classification.status };
}

export async function runOfficialSourceCrawl(supabase: SupabaseClient) {
    await ensureDefaultSources(supabase);

    const { data: sources, error } = await supabase
        .from("official_sources")
        .select("*")
        .eq("is_enabled", true)
        .order("department", { ascending: true });

    if (error) {
        throw error;
    }

    const result = {
        checked: 0,
        created: 0,
        ignored: 0,
        watching: 0,
        candidate: 0,
        unchanged: 0,
        failed: 0,
        errors: [] as Array<{ source: string; error: string }>,
    };

    for (const source of (sources ?? []) as OfficialSourceRow[]) {
        result.checked += 1;

        try {
            const page = await fetchOfficialPage(source);
            const baseClassification = classifyOfficialContent({
                sourceKey: source.source_key,
                department: source.department,
                title: page.title,
                text: page.text,
                url: source.url,
                publishedAt: page.publishedAt,
            });
            const classification = await refineClassificationWithAI(
                {
                    department: source.department,
                    title: page.title,
                    sourceUrl: source.url,
                    contentExcerpt: compactText(page.text, 1200),
                },
                baseClassification
            );

            const created = await createSnapshotAndEvent({
                supabase,
                source,
                page,
                classification,
            });

            if (created.created) {
                result.created += 1;
                result[classification.status] += 1;
            } else {
                result.unchanged += 1;
            }

            await supabase
                .from("official_sources")
                .update({
                    last_crawled_at: new Date().toISOString(),
                    last_status: created.status,
                    last_error: null,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", source.id);
        } catch (error) {
            const message = errorMessage(error);
            result.failed += 1;
            result.errors.push({ source: source.name, error: message });
            await supabase
                .from("official_sources")
                .update({
                    last_crawled_at: new Date().toISOString(),
                    last_status: "failed",
                    last_error: message,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", source.id);
        }
    }

    await recordAuditLog(supabase, "crawl.run", "official_sources", null, result);
    return result;
}

export async function listCandidateEvents(supabase: SupabaseClient) {
    const { data, error } = await supabase
        .from("official_candidate_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(80);

    if (error) {
        throw error;
    }

    return (data ?? []) as CandidateEventRow[];
}

export async function listContentDrafts(supabase: SupabaseClient) {
    const { data, error } = await supabase
        .from("content_drafts")
        .select("*, official_candidate_events(title, source_url, department, risk_level, filter_reason)")
        .order("updated_at", { ascending: false })
        .limit(40);

    if (error) {
        throw error;
    }

    return data ?? [];
}

export async function getAdminOverview(supabase: SupabaseClient) {
    await ensureDefaultSources(supabase);

    const since = new Date();
    since.setHours(0, 0, 0, 0);

    const [
        sources,
        events,
        drafts,
        todayEvents,
        candidateCount,
        ignoredCount,
        highRiskCount,
        weakQueries,
        openGaps,
        negativeFeedback,
    ] = await Promise.all([
        supabase.from("official_sources").select("*").order("department", { ascending: true }),
        supabase
            .from("official_candidate_events")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(20),
        supabase
            .from("content_drafts")
            .select("*, official_candidate_events(title, source_url, department, risk_level, filter_reason)")
            .order("updated_at", { ascending: false })
            .limit(12),
        supabase
            .from("official_candidate_events")
            .select("id", { count: "exact", head: true })
            .gte("created_at", since.toISOString()),
        supabase
            .from("official_candidate_events")
            .select("id", { count: "exact", head: true })
            .in("status", ["candidate", "drafted"]),
        supabase
            .from("official_candidate_events")
            .select("id", { count: "exact", head: true })
            .eq("status", "ignored"),
        supabase
            .from("official_candidate_events")
            .select("id", { count: "exact", head: true })
            .eq("risk_level", "high")
            .in("status", ["candidate", "drafted"]),
        supabase
            .from("agent_query_logs")
            .select("id", { count: "exact", head: true })
            .in("retrieval_state", ["weak", "none"]),
        supabase
            .from("agent_knowledge_gaps")
            .select("id", { count: "exact", head: true })
            .eq("status", "open"),
        supabase
            .from("agent_feedback")
            .select("id", { count: "exact", head: true })
            .eq("vote", "not_helpful"),
    ]);

    const firstError =
        sources.error ||
        events.error ||
        drafts.error ||
        todayEvents.error ||
        candidateCount.error ||
        ignoredCount.error ||
        highRiskCount.error;

    if (firstError) {
        throw firstError;
    }

    return {
        updatedAt: new Date().toISOString(),
        metrics: {
            sourceCount: sources.data?.length ?? 0,
            todayEvents: todayEvents.count ?? 0,
            activeCandidates: candidateCount.count ?? 0,
            ignoredEvents: ignoredCount.count ?? 0,
            highRiskCandidates: highRiskCount.count ?? 0,
            weakOrNoRetrieval: weakQueries.count ?? 0,
            openKnowledgeGaps: openGaps.count ?? 0,
            negativeFeedback: negativeFeedback.count ?? 0,
        },
        sources: sources.data ?? [],
        events: events.data ?? [],
        drafts: drafts.data ?? [],
    };
}

export async function generateDraftForEvent(supabase: SupabaseClient, eventId: string) {
    const { data: event, error } = await supabase
        .from("official_candidate_events")
        .select("*")
        .eq("id", eventId)
        .single();

    if (error) {
        throw error;
    }

    const classification: ContentClassification = {
        status: "candidate",
        riskLevel: event.risk_level,
        reason: event.filter_reason,
        matchedKeywords: event.matched_keywords ?? [],
        ignoredKeywords: event.ignored_keywords ?? [],
        suggestedDocPath: event.suggested_doc_path,
        suggestedAction: event.suggested_action,
    };
    const markdown = await generateMarkdownDraftWithAI({
        title: event.title,
        sourceUrl: event.source_url,
        department: event.department,
        publishedAt: event.published_at,
        contentExcerpt: event.content_excerpt,
        classification,
    });

    const { data: draft, error: draftError } = await supabase
        .from("content_drafts")
        .upsert(
            {
                event_id: event.id,
                title: event.title,
                target_doc_path: event.suggested_doc_path,
                ai_markdown: markdown,
                edited_markdown: markdown,
                source_links: [{ title: event.title, url: event.source_url }],
                status: "drafted",
                updated_at: new Date().toISOString(),
            },
            { onConflict: "event_id" }
        )
        .select("*")
        .single();

    if (draftError) {
        throw draftError;
    }

    await supabase
        .from("official_candidate_events")
        .update({ status: "drafted", updated_at: new Date().toISOString() })
        .eq("id", event.id);
    await recordAuditLog(supabase, "draft.generate", "content_draft", draft.id, {
        eventId: event.id,
        targetDocPath: event.suggested_doc_path,
    });

    return draft;
}

export async function updateDraft(
    supabase: SupabaseClient,
    draftId: string,
    input: { editedMarkdown?: string; title?: string; targetDocPath?: string | null; reviewNote?: string | null }
) {
    const update: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
    };

    if (typeof input.editedMarkdown === "string") update.edited_markdown = input.editedMarkdown;
    if (typeof input.title === "string") update.title = input.title;
    if ("targetDocPath" in input) update.target_doc_path = input.targetDocPath || null;
    if ("reviewNote" in input) update.review_note = input.reviewNote || null;

    const { data, error } = await supabase
        .from("content_drafts")
        .update(update)
        .eq("id", draftId)
        .select("*")
        .single();

    if (error) {
        throw error;
    }

    await recordAuditLog(supabase, "draft.update", "content_draft", draftId, {
        title: input.title,
        targetDocPath: input.targetDocPath,
    });
    return data;
}

export async function approveDraft(supabase: SupabaseClient, draftId: string, reviewNote?: string | null) {
    const { data: draft, error } = await supabase
        .from("content_drafts")
        .select("*")
        .eq("id", draftId)
        .single();

    if (error) {
        throw error;
    }

    const exportMarkdown = draft.edited_markdown || draft.ai_markdown;
    const { data, error: updateError } = await supabase
        .from("content_drafts")
        .update({
            status: "approved",
            export_markdown: exportMarkdown,
            review_note: reviewNote ?? draft.review_note ?? null,
            approved_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq("id", draftId)
        .select("*")
        .single();

    if (updateError) {
        throw updateError;
    }

    await supabase
        .from("official_candidate_events")
        .update({ status: "approved", updated_at: new Date().toISOString() })
        .eq("id", draft.event_id);
    await recordAuditLog(supabase, "draft.approve", "content_draft", draftId, {
        eventId: draft.event_id,
        targetDocPath: draft.target_doc_path,
    });

    return data;
}
