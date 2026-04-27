"use client";

import React from "react";
import styles from "./admin.module.css";

type Metrics = {
    sourceCount: number;
    todayEvents: number;
    activeCandidates: number;
    ignoredEvents: number;
    highRiskCandidates: number;
    weakOrNoRetrieval: number;
    openKnowledgeGaps: number;
    negativeFeedback: number;
};

type Source = {
    id: string;
    name: string;
    department: string;
    category: string;
    url: string;
    is_enabled: boolean;
    last_crawled_at?: string | null;
    last_status?: string | null;
    last_error?: string | null;
};

type CandidateEvent = {
    id: string;
    source_name: string;
    department: string;
    title: string;
    source_url: string;
    published_at?: string | null;
    content_excerpt: string;
    status: string;
    risk_level: "low" | "medium" | "high";
    filter_reason: string;
    suggested_doc_path?: string | null;
    suggested_action: string;
    created_at: string;
};

type Draft = {
    id: string;
    event_id: string;
    title: string;
    target_doc_path?: string | null;
    ai_markdown: string;
    edited_markdown?: string | null;
    export_markdown?: string | null;
    status: string;
    review_note?: string | null;
    updated_at: string;
};

type Overview = {
    updatedAt: string;
    metrics: Metrics;
    sources: Source[];
    events: CandidateEvent[];
    drafts: Draft[];
};

type OpsSummary = {
    recentNegativeFeedback?: Array<{ id: string; question?: string | null; page_path?: string | null; created_at: string }>;
    recentGaps?: Array<{ id: string; sample_question: string; status: string; occurrence_count: number; source_path?: string | null }>;
    recentQueries?: Array<{ id: string; question: string; retrieval_state: string; source_count: number; created_at: string }>;
};

const emptyOverview: Overview = {
    updatedAt: "",
    metrics: {
        sourceCount: 0,
        todayEvents: 0,
        activeCandidates: 0,
        ignoredEvents: 0,
        highRiskCandidates: 0,
        weakOrNoRetrieval: 0,
        openKnowledgeGaps: 0,
        negativeFeedback: 0,
    },
    sources: [],
    events: [],
    drafts: [],
};

function formatTime(value?: string | null) {
    if (!value) return "暂无";
    return new Intl.DateTimeFormat("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(value));
}

function getRiskLabel(risk: CandidateEvent["risk_level"]) {
    if (risk === "high") return "高风险";
    if (risk === "medium") return "中风险";
    return "低风险";
}

function MarkdownPreview({ markdown }: { markdown: string }) {
    return <pre className={styles.preview}>{markdown || "还没有草稿内容。"}</pre>;
}

export default function AdminConsole() {
    const [token, setToken] = React.useState("");
    const [overview, setOverview] = React.useState<Overview>(emptyOverview);
    const [ops, setOps] = React.useState<OpsSummary | null>(null);
    const [selectedEventId, setSelectedEventId] = React.useState<string | null>(null);
    const [selectedDraftId, setSelectedDraftId] = React.useState<string | null>(null);
    const [editedMarkdown, setEditedMarkdown] = React.useState("");
    const [reviewNote, setReviewNote] = React.useState("");
    const [status, setStatus] = React.useState("输入访问 Token 后加载中台数据。");
    const [isLoading, setIsLoading] = React.useState(false);

    const selectedEvent = overview.events.find((event) => event.id === selectedEventId) || overview.events[0];
    const selectedDraft =
        overview.drafts.find((draft) => draft.id === selectedDraftId) ||
        overview.drafts.find((draft) => draft.event_id === selectedEvent?.id) ||
        null;

    React.useEffect(() => {
        const saved = window.localStorage.getItem("ncubook_admin_token") || "";
        setToken(saved);
        if (saved) {
            void loadAll(saved);
        }
    }, []);

    React.useEffect(() => {
        if (selectedDraft) {
            setSelectedDraftId(selectedDraft.id);
            setEditedMarkdown(selectedDraft.edited_markdown || selectedDraft.ai_markdown || "");
            setReviewNote(selectedDraft.review_note || "");
        }
    }, [selectedDraft?.id]);

    async function api(path: string, init: RequestInit = {}, activeToken = token) {
        const response = await fetch(path, {
            ...init,
            headers: {
                "Content-Type": "application/json",
                "X-Admin-Token": activeToken,
                "X-Ops-Token": activeToken,
                ...(init.headers || {}),
            },
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(payload.details || payload.setup || payload.error || `请求失败：${response.status}`);
        }
        return payload;
    }

    async function loadAll(activeToken = token) {
        if (!activeToken) {
            setStatus("请输入访问 Token。");
            return;
        }

        setIsLoading(true);
        try {
            window.localStorage.setItem("ncubook_admin_token", activeToken);
            const [overviewPayload, opsPayload] = await Promise.all([
                api("/api/admin/overview", {}, activeToken),
                api("/api/ops/summary", {}, activeToken).catch(() => null),
            ]);
            setOverview(overviewPayload);
            setOps(opsPayload);
            setSelectedEventId(overviewPayload.events?.[0]?.id || null);
            setStatus(`已加载，更新时间 ${formatTime(overviewPayload.updatedAt)}。`);
        } catch (error) {
            setStatus(error instanceof Error ? error.message : "加载失败");
        } finally {
            setIsLoading(false);
        }
    }

    async function runCrawl() {
        setIsLoading(true);
        try {
            const payload = await api("/api/admin/crawl/run", { method: "POST" });
            setStatus(`抓取完成：检查 ${payload.result.checked} 个来源，新增 ${payload.result.created} 条事件。`);
            await loadAll();
        } catch (error) {
            setStatus(error instanceof Error ? error.message : "抓取失败");
        } finally {
            setIsLoading(false);
        }
    }

    async function generateDraft(eventId: string) {
        setIsLoading(true);
        try {
            const payload = await api("/api/admin/drafts/generate", {
                method: "POST",
                body: JSON.stringify({ eventId }),
            });
            setSelectedDraftId(payload.draft.id);
            setEditedMarkdown(payload.draft.edited_markdown || payload.draft.ai_markdown || "");
            setStatus("AI 初稿已生成，可在右侧编辑。");
            await loadAll();
        } catch (error) {
            setStatus(error instanceof Error ? error.message : "生成草稿失败");
        } finally {
            setIsLoading(false);
        }
    }

    async function saveDraft() {
        if (!selectedDraft) return;
        setIsLoading(true);
        try {
            await api(`/api/admin/drafts/${selectedDraft.id}`, {
                method: "PATCH",
                body: JSON.stringify({
                    editedMarkdown,
                    reviewNote,
                    title: selectedDraft.title,
                    targetDocPath: selectedDraft.target_doc_path,
                }),
            });
            setStatus("草稿已保存。");
            await loadAll();
        } catch (error) {
            setStatus(error instanceof Error ? error.message : "保存失败");
        } finally {
            setIsLoading(false);
        }
    }

    async function approveDraft() {
        if (!selectedDraft) return;
        setIsLoading(true);
        try {
            await saveDraft();
            await api(`/api/admin/drafts/${selectedDraft.id}/approve`, {
                method: "POST",
                body: JSON.stringify({ reviewNote }),
            });
            setStatus("已审核通过，最终 Markdown 修改稿已生成。");
            await loadAll();
        } catch (error) {
            setStatus(error instanceof Error ? error.message : "审核失败");
        } finally {
            setIsLoading(false);
        }
    }

    const metricCards = [
        ["来源", overview.metrics.sourceCount],
        ["今日事件", overview.metrics.todayEvents],
        ["待处理", overview.metrics.activeCandidates],
        ["已忽略", overview.metrics.ignoredEvents],
        ["高风险", overview.metrics.highRiskCandidates],
        ["弱命中", overview.metrics.weakOrNoRetrieval],
        ["知识缺口", overview.metrics.openKnowledgeGaps],
        ["负反馈", overview.metrics.negativeFeedback],
    ];

    return (
        <main className={styles.shell}>
            <section className={styles.hero}>
                <div>
                    <span className={styles.kicker}>NCUBOOK ADMIN</span>
                    <h1>校园信息运营中台</h1>
                    <p>
                        先筛选值得维护的官网信息，再由 AI 生成可编辑初稿，最后人工审核导出 Markdown 修改稿。
                    </p>
                </div>
                <div className={styles.authBox}>
                    <label htmlFor="token">访问 Token</label>
                    <input
                        id="token"
                        value={token}
                        onChange={(event) => setToken(event.target.value)}
                        placeholder="ADMIN_TOKEN / OPS_READ_TOKEN"
                    />
                    <button type="button" onClick={() => loadAll()} disabled={isLoading}>
                        加载中台
                    </button>
                </div>
            </section>

            <div className={styles.statusLine}>
                <span>{status}</span>
                <button type="button" onClick={runCrawl} disabled={isLoading || !token}>
                    手动抓取官网
                </button>
            </div>

            <section className={styles.metricGrid} aria-label="信息雷达">
                {metricCards.map(([label, value]) => (
                    <article key={label} className={styles.metricCard}>
                        <strong>{value}</strong>
                        <span>{label}</span>
                    </article>
                ))}
            </section>

            <section className={styles.board}>
                <div className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <h2>候选队列</h2>
                        <span>{overview.events.length} 条</span>
                    </div>
                    <div className={styles.eventList}>
                        {overview.events.map((event) => (
                            <button
                                key={event.id}
                                type="button"
                                className={`${styles.eventCard} ${selectedEvent?.id === event.id ? styles.activeCard : ""}`}
                                onClick={() => {
                                    setSelectedEventId(event.id);
                                    const draft = overview.drafts.find((item) => item.event_id === event.id);
                                    setSelectedDraftId(draft?.id || null);
                                }}
                            >
                                <span className={styles.metaRow}>
                                    <b>{event.department}</b>
                                    <i className={styles[event.risk_level]}>{getRiskLabel(event.risk_level)}</i>
                                    <em>{event.status}</em>
                                </span>
                                <strong>{event.title}</strong>
                                <small>{event.filter_reason}</small>
                            </button>
                        ))}
                        {overview.events.length === 0 && <p className={styles.empty}>暂无候选。可以先手动抓取一次官网。</p>}
                    </div>
                </div>

                <div className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <h2>任务详情</h2>
                        {selectedEvent && (
                            <button type="button" onClick={() => generateDraft(selectedEvent.id)} disabled={isLoading}>
                                生成 AI 初稿
                            </button>
                        )}
                    </div>
                    {selectedEvent ? (
                        <article className={styles.detail}>
                            <span className={styles.kicker}>{selectedEvent.source_name}</span>
                            <h3>{selectedEvent.title}</h3>
                            <p>{selectedEvent.content_excerpt}</p>
                            <dl>
                                <div>
                                    <dt>建议动作</dt>
                                    <dd>{selectedEvent.suggested_action}</dd>
                                </div>
                                <div>
                                    <dt>建议页面</dt>
                                    <dd>{selectedEvent.suggested_doc_path || "待确认"}</dd>
                                </div>
                                <div>
                                    <dt>发布时间</dt>
                                    <dd>{selectedEvent.published_at || "待核实"}</dd>
                                </div>
                                <div>
                                    <dt>来源</dt>
                                    <dd>
                                        <a href={selectedEvent.source_url} target="_blank" rel="noreferrer">
                                            打开官网来源
                                        </a>
                                    </dd>
                                </div>
                            </dl>
                        </article>
                    ) : (
                        <p className={styles.empty}>请选择一条候选任务。</p>
                    )}
                </div>
            </section>

            <section className={styles.editorBoard}>
                <div className={styles.editorPane}>
                    <div className={styles.panelHeader}>
                        <h2>Markdown 草稿编辑</h2>
                        <div className={styles.actionGroup}>
                            <button type="button" onClick={saveDraft} disabled={!selectedDraft || isLoading}>
                                保存
                            </button>
                            <button type="button" onClick={approveDraft} disabled={!selectedDraft || isLoading}>
                                审核通过
                            </button>
                        </div>
                    </div>
                    <textarea
                        value={editedMarkdown}
                        onChange={(event) => setEditedMarkdown(event.target.value)}
                        placeholder="生成初稿后，可以在这里编辑 Markdown。"
                    />
                    <input
                        className={styles.noteInput}
                        value={reviewNote}
                        onChange={(event) => setReviewNote(event.target.value)}
                        placeholder="审核备注，例如：已核对来源，等待合并到校园卡页面"
                    />
                </div>
                <div className={styles.previewPane}>
                    <div className={styles.panelHeader}>
                        <h2>预览 / 导出</h2>
                        <span>{selectedDraft?.status || "no draft"}</span>
                    </div>
                    <MarkdownPreview markdown={selectedDraft?.export_markdown || editedMarkdown} />
                </div>
            </section>

            <section className={styles.qualityBoard}>
                <div className={styles.panelHeader}>
                    <h2>质量与反馈</h2>
                    <span>由原 /ops 并入</span>
                </div>
                <div className={styles.qualityGrid}>
                    <div>
                        <h3>知识缺口</h3>
                        {(ops?.recentGaps || []).slice(0, 5).map((gap) => (
                            <article key={gap.id} className={styles.qualityItem}>
                                <strong>{gap.sample_question}</strong>
                                <span>{gap.status} · 出现 {gap.occurrence_count} 次 · {gap.source_path || "未知页面"}</span>
                            </article>
                        ))}
                    </div>
                    <div>
                        <h3>负反馈</h3>
                        {(ops?.recentNegativeFeedback || []).slice(0, 5).map((item) => (
                            <article key={item.id} className={styles.qualityItem}>
                                <strong>{item.question || "页面反馈"}</strong>
                                <span>{item.page_path || "未知页面"} · {formatTime(item.created_at)}</span>
                            </article>
                        ))}
                    </div>
                    <div>
                        <h3>弱命中问题</h3>
                        {(ops?.recentQueries || [])
                            .filter((query) => ["weak", "none", "partial"].includes(query.retrieval_state))
                            .slice(0, 5)
                            .map((query) => (
                                <article key={query.id} className={styles.qualityItem}>
                                    <strong>{query.question}</strong>
                                    <span>{query.retrieval_state} · 来源 {query.source_count} 个 · {formatTime(query.created_at)}</span>
                                </article>
                            ))}
                    </div>
                </div>
            </section>

            <section className={styles.sourceBoard}>
                <div className={styles.panelHeader}>
                    <h2>来源白名单</h2>
                    <span>{overview.sources.length} 个来源</span>
                </div>
                <div className={styles.sourceGrid}>
                    {overview.sources.map((source) => (
                        <article key={source.id} className={styles.sourceCard}>
                            <b>{source.department}</b>
                            <strong>{source.name}</strong>
                            <span>{source.category} · {source.last_status || "未抓取"} · {formatTime(source.last_crawled_at)}</span>
                            {source.last_error && <small>{source.last_error}</small>}
                        </article>
                    ))}
                </div>
            </section>
        </main>
    );
}
