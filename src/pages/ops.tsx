import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import {
    Activity,
    AlertTriangle,
    ArrowLeft,
    BookOpenText,
    CheckCircle2,
    Clock3,
    ClipboardCheck,
    Database,
    ExternalLink,
    Link2,
    ListChecks,
    RefreshCw,
    ShieldCheck,
    ThumbsDown,
    ThumbsUp,
} from 'lucide-react';
import styles from '../css/CijianMobile.module.css';

const OPS_API_URL = 'https://ncubook-api.vercel.app/api/ops/summary';
const OPS_SYNC_SNAPSHOT_URL = '/ops-sync-status.json';
const DEMO_UPDATED_AT = '2026-04-23T09:30:00+08:00';
const FEISHU_BASE_URL = 'https://ncuhomer.feishu.cn/wiki/QFvewamk0i5MWvkI8zVcDxWcnPb?table=tbllSr5HwymQ2YAq&view=vewFx874nB';

type OpsSummary = {
    windowDays: number;
    updatedAt: string;
    metrics: {
        totalQueries: number;
        weakOrNoRetrieval: number;
        openKnowledgeGaps: number;
        feedbackCount: number;
        helpfulFeedback: number;
        notHelpfulFeedback: number;
        avgLatencyMs: number;
    };
    gapStatusCounts: {
        open: number;
        triaged: number;
        in_progress: number;
        resolved: number;
        ignored: number;
    };
    recentNegativeFeedback: Array<{
        id: string;
        target_type: 'agent_answer' | 'page';
        query_log_id?: string | null;
        page_path?: string | null;
        question?: string | null;
        answer_excerpt?: string | null;
        comment?: string | null;
        created_at: string;
    }>;
    recentGaps: Array<{
        id: string;
        sample_question: string;
        source_path?: string | null;
        trigger_reason: string;
        status: string;
        occurrence_count: number;
        last_seen_at: string;
        resolution_note?: string | null;
    }>;
    recentQueries: Array<{
        id: string;
        question: string;
        current_path?: string | null;
        retrieval_state: string;
        source_count: number;
        max_similarity: number;
        latency_ms?: number | null;
        created_at: string;
    }>;
};

type SyncSnapshotItem = {
    syncKey: string;
    entityType: 'feedback' | 'gap';
    itemId: string;
    title: string;
    pagePath: string;
    sourceLabel: string;
    statusLabel: string;
    occurredAt: string;
    recordId?: string;
    error?: string;
};

type SyncSnapshot = {
    updatedAt: string;
    source: string;
    totals: {
        pendingBeforeSync: number;
        syncedAfterRun: number;
        failed: number;
        created: number;
        updated: number;
    };
    feedback: {
        totalEligible: number;
        created: number;
        updated: number;
    };
    knowledgeGaps: {
        totalEligible: number;
        created: number;
        updated: number;
    };
    recentPendingBeforeSync: SyncSnapshotItem[];
    recentSynced: SyncSnapshotItem[];
    recentFailed: SyncSnapshotItem[];
};

const demoSummary: OpsSummary = {
    windowDays: 7,
    updatedAt: DEMO_UPDATED_AT,
    metrics: {
        totalQueries: 128,
        weakOrNoRetrieval: 19,
        openKnowledgeGaps: 8,
        feedbackCount: 36,
        helpfulFeedback: 27,
        notHelpfulFeedback: 9,
        avgLatencyMs: 1840,
    },
    gapStatusCounts: {
        open: 8,
        triaged: 3,
        in_progress: 2,
        resolved: 14,
        ignored: 1,
    },
    recentNegativeFeedback: [
        {
            id: 'feedback-major-change',
            target_type: 'agent_answer',
            query_log_id: 'query-major-change',
            page_path: '/docs/academics/major-change',
            question: '转专业要看绩点还是排名？',
            answer_excerpt: '回答没有说明以学院当年通知为准，也没有提示政策变动风险。',
            created_at: '2026-04-23T09:05:00+08:00',
        },
        {
            id: 'feedback-canteen-hour',
            target_type: 'agent_answer',
            query_log_id: 'query-canteen-hour',
            page_path: '/docs/campus-life/dining',
            question: '食堂晚上几点关门？',
            answer_excerpt: '用户反馈营业时间不准确，需要补最新来源。',
            created_at: '2026-04-23T08:45:00+08:00',
        },
    ],
    recentGaps: [
        {
            id: 'gap-campus-card-weekend',
            sample_question: '校园卡服务点周末能不能补办？',
            source_path: '/xiaojiayuan',
            trigger_reason: 'low_retrieval_confidence',
            status: 'open',
            occurrence_count: 6,
            last_seen_at: '2026-04-23T08:52:00+08:00',
        },
        {
            id: 'gap-dorm-aircon',
            sample_question: '宿舍空调报修一般多久能处理？',
            source_path: '/docs/campus-life/repair',
            trigger_reason: 'no_retrieved_context',
            status: 'triaged',
            occurrence_count: 4,
            last_seen_at: '2026-04-23T07:55:00+08:00',
        },
    ],
    recentQueries: [
        {
            id: 'query-campus-card',
            question: '校园卡丢了怎么办？',
            current_path: '/xiaojiayuan',
            retrieval_state: 'partial',
            source_count: 3,
            max_similarity: 0.54,
            latency_ms: 1640,
            created_at: '2026-04-23T09:18:00+08:00',
        },
        {
            id: 'query-major-change',
            question: '转专业要看绩点还是排名？',
            current_path: '/docs/academics/major-change',
            retrieval_state: 'strong',
            source_count: 5,
            max_similarity: 0.71,
            latency_ms: 2110,
            created_at: '2026-04-23T08:38:00+08:00',
        },
    ],
};

const demoSyncSnapshot: SyncSnapshot = {
    updatedAt: DEMO_UPDATED_AT,
    source: 'lark-cli user sync',
    totals: {
        pendingBeforeSync: 4,
        syncedAfterRun: 28,
        failed: 1,
        created: 3,
        updated: 5,
    },
    feedback: {
        totalEligible: 9,
        created: 3,
        updated: 4,
    },
    knowledgeGaps: {
        totalEligible: 6,
        created: 0,
        updated: 1,
    },
    recentPendingBeforeSync: [
        {
            syncKey: 'feedback-major-change',
            entityType: 'feedback',
            itemId: 'feedback-major-change',
            title: '转专业要看绩点还是排名？',
            pagePath: '/docs/academics/major-change',
            sourceLabel: 'Agent 回答',
            statusLabel: '待同步',
            occurredAt: '2026-04-23T09:05:00+08:00',
        },
        {
            syncKey: 'gap-card-weekend',
            entityType: 'gap',
            itemId: 'gap-card-weekend',
            title: '校园卡服务点周末能不能补办？',
            pagePath: '/xiaojiayuan',
            sourceLabel: '知识缺口',
            statusLabel: '待同步',
            occurredAt: '2026-04-23T08:52:00+08:00',
        },
    ],
    recentSynced: [
        {
            syncKey: 'feedback-canteen-hour',
            entityType: 'feedback',
            itemId: 'feedback-canteen-hour',
            title: '食堂晚上几点关门？',
            pagePath: '/docs/campus-life/dining',
            sourceLabel: 'Agent 回答',
            statusLabel: '已同步创建',
            occurredAt: '2026-04-23T08:45:00+08:00',
            recordId: 'rec_demo_1',
        },
        {
            syncKey: 'gap-aircon',
            entityType: 'gap',
            itemId: 'gap-aircon',
            title: '宿舍空调报修一般多久能处理？',
            pagePath: '/docs/campus-life/repair',
            sourceLabel: '知识缺口',
            statusLabel: '已同步更新',
            occurredAt: '2026-04-23T07:55:00+08:00',
            recordId: 'rec_demo_2',
        },
    ],
    recentFailed: [
        {
            syncKey: 'feedback-demo-failed',
            entityType: 'feedback',
            itemId: 'feedback-demo-failed',
            title: '奖学金评定细则在哪里看？',
            pagePath: '/docs/career/awards',
            sourceLabel: '文档页面',
            statusLabel: '同步失败',
            occurredAt: '2026-04-23T07:20:00+08:00',
            error: '字段写入失败，建议检查飞书字段配置',
        },
    ],
};

const retrievalCopy: Record<string, string> = {
    strong: '高可信',
    partial: '部分命中',
    weak: '弱命中',
    none: '未命中',
};

const gapReasonCopy: Record<string, string> = {
    low_retrieval_confidence: '弱命中',
    no_retrieved_context: '未检索到资料',
};

const gapStatusList = [
    { key: 'open', label: '待分派', description: '已进入缺口池，还没判断优先级' },
    { key: 'triaged', label: '已分诊', description: '确认值得补，等待整理来源' },
    { key: 'in_progress', label: '处理中', description: '正在补文档、改切片或调提示词' },
    { key: 'resolved', label: '已解决', description: '已回流知识库或规则' },
    { key: 'ignored', label: '已忽略', description: '超出产品范围或不适合回答' },
] as const;

function formatDateTime(value: string) {
    return new Intl.DateTimeFormat('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));
}

function formatLatency(value: number) {
    if (!value) {
        return '暂无';
    }
    return value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${value}ms`;
}

function percent(part: number, total: number) {
    if (!total) {
        return '0%';
    }
    return `${Math.round((part / total) * 100)}%`;
}

export default function OpsPage() {
    const [summary, setSummary] = React.useState<OpsSummary>(demoSummary);
    const [syncSnapshot, setSyncSnapshot] = React.useState<SyncSnapshot>(demoSyncSnapshot);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isDemo, setIsDemo] = React.useState(true);
    const [error, setError] = React.useState('');

    const loadSummary = React.useCallback(async () => {
        setIsLoading(true);
        setError('');

        try {
            const [response, snapshotResponse] = await Promise.all([
                fetch(OPS_API_URL, { cache: 'no-store' }),
                fetch(`${OPS_SYNC_SNAPSHOT_URL}?t=${Date.now()}`, { cache: 'no-store' }),
            ]);
            const payload = await response.json();

            if (!response.ok) {
                throw new Error(payload?.setup || payload?.error || `运营接口请求失败：${response.status}`);
            }

            setSummary(payload);
            if (snapshotResponse.ok) {
                setSyncSnapshot(await snapshotResponse.json());
            } else {
                setSyncSnapshot(demoSyncSnapshot);
            }
            setIsDemo(false);
        } catch (loadError) {
            setSummary({
                ...demoSummary,
                updatedAt: new Date().toISOString(),
            });
            setSyncSnapshot({
                ...demoSyncSnapshot,
                updatedAt: new Date().toISOString(),
            });
            setIsDemo(true);
            setError(loadError instanceof Error ? loadError.message : '运营数据暂时不可用');
        } finally {
            setIsLoading(false);
        }
    }, []);

    React.useEffect(() => {
        loadSummary();
    }, [loadSummary]);

    const metrics = [
        {
            label: `近 ${summary.windowDays} 天提问`,
            value: summary.metrics.totalQueries,
            icon: Activity,
        },
        {
            label: '弱命中或未命中',
            value: summary.metrics.weakOrNoRetrieval,
            icon: AlertTriangle,
        },
        {
            label: '开放知识缺口',
            value: summary.metrics.openKnowledgeGaps,
            icon: ListChecks,
        },
        {
            label: '用户反馈',
            value: summary.metrics.feedbackCount,
            icon: ThumbsUp,
        },
        {
            label: '没帮助反馈',
            value: summary.metrics.notHelpfulFeedback,
            icon: ThumbsDown,
        },
        {
            label: '平均响应耗时',
            value: formatLatency(summary.metrics.avgLatencyMs),
            icon: Clock3,
        },
    ];

    return (
        <Layout title="运营台" description="小家园 Agent 运营台｜查看问题日志、知识缺口和检索质量" wrapperClassName="cijian-mobile-wrapper">
            <main className={`${styles.appPage} ${styles.opsPage}`}>
                <section className={styles.opsHero}>
                    <div className={styles.opsHeroTop}>
                        <Link className={styles.backLink} to="/">
                            <ArrowLeft size={18} strokeWidth={1.8} aria-hidden="true" />
                            返回
                        </Link>
                        <button className={styles.opsRefreshButton} type="button" onClick={loadSummary} disabled={isLoading}>
                            <RefreshCw size={15} strokeWidth={1.9} aria-hidden="true" />
                            刷新
                        </button>
                    </div>
                    <span className={styles.eyebrow}>Agent 运营闭环</span>
                    <h1>问题日志、知识缺口和迭代优先级放在一处</h1>
                    <p>这不是给普通同学看的页面，而是展示产品运营能力的后台样张：看 Agent 解决不了什么，再决定下一批知识库补什么。</p>
                    <div className={styles.momentCheckRow}>
                        <span>
                            <Database size={14} strokeWidth={1.8} aria-hidden="true" />
                            {isDemo ? '演示数据' : '真实数据'}
                        </span>
                        <span>
                            <Clock3 size={14} strokeWidth={1.8} aria-hidden="true" />
                            {formatDateTime(summary.updatedAt)}
                        </span>
                        <span>
                            <AlertTriangle size={14} strokeWidth={1.8} aria-hidden="true" />
                            弱命中率 {percent(summary.metrics.weakOrNoRetrieval, summary.metrics.totalQueries)}
                        </span>
                    </div>
                    {error && <div className={styles.liveError}>{error}</div>}
                </section>

                <section className={styles.opsStatusBoard} aria-label="知识缺口处理状态">
                    <div className={styles.opsStatusBoardHeader}>
                        <div>
                            <span className={styles.eyebrow}>处理状态</span>
                            <h2>知识缺口从发现到回流的流转</h2>
                        </div>
                        <ClipboardCheck size={22} strokeWidth={1.8} aria-hidden="true" />
                    </div>
                    <div className={styles.opsStatusGrid}>
                        {gapStatusList.map((status) => (
                            <article key={status.key} className={styles.opsStatusCard}>
                                <strong>{summary.gapStatusCounts?.[status.key] ?? 0}</strong>
                                <span>{status.label}</span>
                                <p>{status.description}</p>
                            </article>
                        ))}
                    </div>
                </section>

                <section className={styles.opsSyncBoard} aria-label="飞书同步状态">
                    <div className={styles.opsStatusBoardHeader}>
                        <div>
                            <span className={styles.eyebrow}>飞书联动</span>
                            <h2>本地同步快照</h2>
                        </div>
                        <Link2 size={22} strokeWidth={1.8} aria-hidden="true" />
                    </div>
                    <p className={styles.opsSyncCopy}>
                        用本机飞书用户身份把 Supabase 里的负反馈和知识缺口同步到飞书多维表格。这里展示的是最近一次 <code>npm run sync:feishu</code> 的结果。
                    </p>
                    <div className={styles.opsStatusGrid}>
                        <article className={styles.opsStatusCard}>
                            <strong>{syncSnapshot.totals.pendingBeforeSync}</strong>
                            <span>同步前待处理</span>
                            <p>最近一次开始同步前，飞书里还没有的记录数量。</p>
                        </article>
                        <article className={styles.opsStatusCard}>
                            <strong>{syncSnapshot.totals.syncedAfterRun}</strong>
                            <span>已同步到飞书</span>
                            <p>当前飞书表里带 AgentSync 标记的记录数。</p>
                        </article>
                        <article className={styles.opsStatusCard}>
                            <strong>{syncSnapshot.totals.failed}</strong>
                            <span>本次失败</span>
                            <p>同步时写飞书失败的记录，优先排查字段和权限。</p>
                        </article>
                    </div>
                    <div className={styles.opsMetaLine}>
                        <span>{syncSnapshot.source}</span>
                        <span>{formatDateTime(syncSnapshot.updatedAt)}</span>
                        <span>新增 {syncSnapshot.totals.created}</span>
                        <span>更新 {syncSnapshot.totals.updated}</span>
                    </div>
                </section>

                <section className={styles.opsMetricGrid} aria-label="运营指标">
                    {metrics.map((metric) => {
                        const Icon = metric.icon;
                        return (
                            <article key={metric.label} className={styles.opsMetricCard}>
                                <div className={styles.opsMetricIcon}>
                                    <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
                                </div>
                                <strong>{metric.value}</strong>
                                <span>{metric.label}</span>
                            </article>
                        );
                    })}
                </section>

                <section className={styles.sectionStack}>
                    <div className={styles.sectionHeader}>
                        <h2>飞书同步结果</h2>
                        <a className={styles.sectionAction} href={FEISHU_BASE_URL} target="_blank" rel="noreferrer">
                            打开飞书反馈后台
                            <ExternalLink size={14} strokeWidth={1.8} aria-hidden="true" />
                        </a>
                    </div>
                    <div className={styles.opsDualColumn}>
                        <div className={styles.opsList}>
                            <div className={styles.sectionHeader}>
                                <h2>最近已同步</h2>
                                <span className={styles.qaSourceCount}>飞书已收</span>
                            </div>
                            {syncSnapshot.recentSynced.length > 0 ? (
                                syncSnapshot.recentSynced.map((item) => (
                                    <article key={item.syncKey} className={styles.opsListItem}>
                                        <div className={styles.opsListItemHeader}>
                                            <h3>{item.title}</h3>
                                            <span className={styles.opsSuccessPill}>{item.statusLabel}</span>
                                        </div>
                                        <div className={styles.opsMetaLine}>
                                            <span>{item.sourceLabel}</span>
                                            <span>{formatDateTime(item.occurredAt)}</span>
                                            {item.pagePath && <span>{item.pagePath}</span>}
                                            {item.recordId && <span>{item.recordId}</span>}
                                        </div>
                                    </article>
                                ))
                            ) : (
                                <div className={styles.opsEmptyState}>还没有同步记录。先运行一次本地同步命令，飞书看板才会长出真实数据。</div>
                            )}
                        </div>
                        <div className={styles.opsList}>
                            <div className={styles.sectionHeader}>
                                <h2>最近失败</h2>
                                <span className={styles.qaSourceCount}>优先排查</span>
                            </div>
                            {syncSnapshot.recentFailed.length > 0 ? (
                                syncSnapshot.recentFailed.map((item) => (
                                    <article key={item.syncKey} className={`${styles.opsListItem} ${styles.opsNegativeItem}`}>
                                        <div className={styles.opsListItemHeader}>
                                            <h3>{item.title}</h3>
                                            <span className={styles.opsDangerPill}>{item.statusLabel}</span>
                                        </div>
                                        <p>{item.error || '同步失败，建议重新运行本地同步并检查飞书字段配置。'}</p>
                                        <div className={styles.opsMetaLine}>
                                            <span>{item.sourceLabel}</span>
                                            <span>{formatDateTime(item.occurredAt)}</span>
                                            {item.pagePath && <span>{item.pagePath}</span>}
                                        </div>
                                    </article>
                                ))
                            ) : (
                                <div className={styles.opsEmptyState}>最近一次同步没有失败项，说明飞书链路现在是通的。</div>
                            )}
                        </div>
                    </div>
                </section>

                <section className={styles.sectionStack}>
                    <div className={styles.sectionHeader}>
                        <h2>同步前待处理</h2>
                        <span className={styles.qaSourceCount}>本次入队</span>
                    </div>
                    <div className={styles.opsList}>
                        {syncSnapshot.recentPendingBeforeSync.length > 0 ? (
                            syncSnapshot.recentPendingBeforeSync.map((item) => (
                                <article key={item.syncKey} className={styles.opsListItem}>
                                    <div className={styles.opsListItemHeader}>
                                        <h3>{item.title}</h3>
                                        <span className={styles.opsStatusPill}>{item.statusLabel}</span>
                                    </div>
                                    <div className={styles.opsMetaLine}>
                                        <span>{item.sourceLabel}</span>
                                        <span>{formatDateTime(item.occurredAt)}</span>
                                        {item.pagePath && <span>{item.pagePath}</span>}
                                    </div>
                                </article>
                            ))
                        ) : (
                            <div className={styles.opsEmptyState}>最近一次同步前没有积压项，说明飞书和 Supabase 基本对齐。</div>
                        )}
                    </div>
                </section>

                <section className={styles.sectionStack}>
                    <div className={styles.sectionHeader}>
                        <h2>知识缺口</h2>
                        <span className={styles.qaSourceCount}>按出现次数排序</span>
                    </div>
                    <div className={styles.opsList}>
                        {summary.recentGaps.length > 0 ? (
                            summary.recentGaps.map((gap) => (
                                <article key={gap.id} className={styles.opsListItem}>
                                    <div className={styles.opsListItemHeader}>
                                        <h3>{gap.sample_question}</h3>
                                        <span className={styles.opsStatusPill}>{gap.status}</span>
                                    </div>
                                    <p>{gap.resolution_note || '需要补来源、补流程，或把人工经验整理进知识库。'}</p>
                                    <div className={styles.opsMetaLine}>
                                        <span>{gapReasonCopy[gap.trigger_reason] || gap.trigger_reason}</span>
                                        <span>出现 {gap.occurrence_count} 次</span>
                                        <span>{formatDateTime(gap.last_seen_at)}</span>
                                        {gap.source_path && <span>{gap.source_path}</span>}
                                    </div>
                                </article>
                            ))
                        ) : (
                            <div className={styles.opsEmptyState}>暂时没有开放知识缺口。继续观察弱命中问题，下一版可以增加人工分派和解决状态。</div>
                        )}
                    </div>
                </section>

                <section className={styles.sectionStack}>
                    <div className={styles.sectionHeader}>
                        <h2>负反馈样本</h2>
                        <span className={styles.qaSourceCount}>优先复盘</span>
                    </div>
                    <div className={styles.opsList}>
                        {summary.recentNegativeFeedback.length > 0 ? (
                            summary.recentNegativeFeedback.map((feedback) => (
                                <article key={feedback.id} className={`${styles.opsListItem} ${styles.opsNegativeItem}`}>
                                    <div className={styles.opsListItemHeader}>
                                        <h3>{feedback.question || feedback.page_path || '页面反馈'}</h3>
                                        <span className={styles.opsDangerPill}>没帮助</span>
                                    </div>
                                    <p>{feedback.comment || feedback.answer_excerpt || '用户点击了没帮助，建议结合 query log 回看回答质量。'}</p>
                                    <div className={styles.opsMetaLine}>
                                        <span>{feedback.target_type === 'agent_answer' ? 'Agent 回答' : '文档页面'}</span>
                                        <span>{formatDateTime(feedback.created_at)}</span>
                                        {feedback.page_path && <span>{feedback.page_path}</span>}
                                        {feedback.query_log_id && <span>ID {feedback.query_log_id.slice(0, 8)}</span>}
                                    </div>
                                </article>
                            ))
                        ) : (
                            <div className={styles.opsEmptyState}>暂时没有负反馈。等用户点击“没帮助”后，这里会成为优先复盘列表。</div>
                        )}
                    </div>
                </section>

                <section className={styles.sectionStack}>
                    <div className={styles.sectionHeader}>
                        <h2>最近提问</h2>
                        <span className={styles.qaSourceCount}>检索质量</span>
                    </div>
                    <div className={styles.opsList}>
                        {summary.recentQueries.length > 0 ? (
                            summary.recentQueries.map((query) => (
                                <article key={query.id} className={styles.opsListItem}>
                                    <div className={styles.opsListItemHeader}>
                                        <h3>{query.question}</h3>
                                        <span className={styles.opsStatusPill}>{retrievalCopy[query.retrieval_state] || query.retrieval_state}</span>
                                    </div>
                                    <div className={styles.opsMetaLine}>
                                        <span>{query.source_count} 条来源</span>
                                        <span>相似度 {Number(query.max_similarity ?? 0).toFixed(2)}</span>
                                        <span>{formatLatency(Number(query.latency_ms ?? 0))}</span>
                                        <span>{formatDateTime(query.created_at)}</span>
                                        {query.current_path && <span>{query.current_path}</span>}
                                    </div>
                                </article>
                            ))
                        ) : (
                            <div className={styles.opsEmptyState}>暂时没有问题日志。用户开始提问后，这里会展示检索质量和响应耗时。</div>
                        )}
                    </div>
                </section>

                <nav className={styles.bottomNav} aria-label="移动端主导航">
                    <Link to="/">
                        <CheckCircle2 size={16} strokeWidth={1.8} aria-hidden="true" />
                        首页
                    </Link>
                    <Link to="/docs/academics/">
                        <BookOpenText size={16} strokeWidth={1.8} aria-hidden="true" />
                        指南
                    </Link>
                    <Link to="/xiaojiayuan">
                        <ShieldCheck size={16} strokeWidth={1.8} aria-hidden="true" />
                        小家园
                    </Link>
                    <Link className={styles.bottomNavItemActive} to="/ops">
                        <ListChecks size={16} strokeWidth={1.8} aria-hidden="true" />
                        运营
                    </Link>
                </nav>
            </main>
        </Layout>
    );
}
