import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
    ArrowLeft,
    CheckCircle2,
    CircleAlert,
    MapPin,
    MessageSquareText,
    Search,
    SendHorizontal,
    ShieldCheck,
} from 'lucide-react';
import styles from '../css/CijianMobile.module.css';

const API_URL = 'https://ncubook-api.vercel.app/api/chat';
const FEEDBACK_API_URL = 'https://ncubook-api.vercel.app/api/feedback';
const DEFAULT_QUESTION = '校园卡丢了怎么办？';

function openAiChat(query?: string) {
    if (typeof window === 'undefined') {
        return;
    }

    window.dispatchEvent(new CustomEvent('open-ai-chat', { detail: query ? { query } : {} }));
}

const answerSections = [
    {
        title: '先做这三步',
        items: ['立即在小家园或校园卡服务入口挂失。', '确认是否需要补办实体卡，避免余额继续被使用。', '带好本人身份证件，到校园卡服务点办理补卡。'],
    },
    {
        title: '需要准备',
        items: ['身份证或学生证', '校园卡账号信息', '补卡费用，具体金额以现场或官方入口为准'],
    },
] as const;

const sources = [
    {
        title: '校园卡使用指南',
        meta: '校园生活 · 2026-04 更新',
        status: '已回流',
    },
    {
        title: '同学补办反馈',
        meta: '小家园问答 · 待二次核实',
        status: '待核实',
    },
] as const;

const suggestions = ['补办要多少钱？', '周末能办吗？', '挂失后还能解挂吗？'] as const;

const retrievalCopy: Record<string, string> = {
    strong: '高可信命中',
    partial: '部分命中',
    weak: '弱命中',
    none: '未命中',
};

function cleanMarkdown(text: string) {
    return text
        .replace(/\n{3,}/g, '\n\n')
        .replace(/\n{2,}([-*] )/g, '\n$1')
        .replace(/([-*] .+)\n{2,}([-*] )/g, '$1\n$2')
        .trim();
}

export default function XiaojiayuanPage() {
    const [query, setQuery] = React.useState('');
    const [liveQuestion, setLiveQuestion] = React.useState(DEFAULT_QUESTION);
    const [liveAnswer, setLiveAnswer] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState('');
    const [retrievalState, setRetrievalState] = React.useState('');
    const [sourceCount, setSourceCount] = React.useState<number | null>(null);
    const [queryId, setQueryId] = React.useState('');
    const [feedbackState, setFeedbackState] = React.useState<'helpful' | 'not_helpful' | 'failed' | null>(null);

    const askQuestion = React.useCallback(async (questionText: string) => {
        const trimmed = questionText.trim() || DEFAULT_QUESTION;
        if (isLoading) {
            return;
        }

        setQuery('');
        setLiveQuestion(trimmed);
        setLiveAnswer('');
        setError('');
        setRetrievalState('');
        setSourceCount(null);
        setQueryId('');
        setFeedbackState(null);
        setIsLoading(true);

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [{ role: 'user', content: trimmed }],
                    currentPath: '/xiaojiayuan',
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API 请求失败 (${response.status}): ${errorText}`);
            }

            setRetrievalState(response.headers.get('X-Ncubook-Retrieval-State') || '');
            setQueryId(response.headers.get('X-Ncubook-Query-Id') || '');
            const parsedSourceCount = Number(response.headers.get('X-Ncubook-Source-Count'));
            setSourceCount(Number.isFinite(parsedSourceCount) ? parsedSourceCount : null);

            if (!response.body) {
                throw new Error('API 没有返回可读取的回答流');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullContent = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }

                fullContent += decoder.decode(value, { stream: true });
                setLiveAnswer(fullContent);
            }

            if (!fullContent.trim()) {
                setError('暂时没有生成回答，请稍后再试。');
            }
        } catch (requestError) {
            const message = requestError instanceof Error ? requestError.message : '未知错误';
            setError(`小家园暂时没有连上：${message}`);
        } finally {
            setIsLoading(false);
        }
    }, [isLoading]);

    const submit = () => {
        askQuestion(query || DEFAULT_QUESTION);
        setQuery('');
    };

    const submitFeedback = async (vote: 'helpful' | 'not_helpful') => {
        setFeedbackState(vote);

        try {
            const answer = liveAnswer || answerSections
                .map((section) => `${section.title}: ${section.items.join('；')}`)
                .join('\n');

            const response = await fetch(FEEDBACK_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    targetType: queryId ? 'agent_answer' : 'page',
                    queryLogId: queryId || undefined,
                    vote,
                    pagePath: '/xiaojiayuan',
                    question: liveQuestion,
                    answer,
                }),
            });

            if (!response.ok) {
                throw new Error(`反馈写入失败：${response.status}`);
            }
        } catch (feedbackError) {
            console.warn('Feedback failed:', feedbackError);
            setFeedbackState('failed');
        }
    };

    const hasLiveAnswer = Boolean(liveAnswer || isLoading || error);
    const retrievalText = retrievalState ? retrievalCopy[retrievalState] || retrievalState : '等待检索';

    return (
        <Layout title="小家园" description="小家园｜此间的校园知识问答助手" wrapperClassName="cijian-mobile-wrapper">
            <main className={`${styles.appPage} ${styles.qaPage}`}>
                <header className={styles.qaHeader}>
                    <Link className={styles.backLink} to="/">
                        <ArrowLeft size={18} strokeWidth={1.8} aria-hidden="true" />
                        返回
                    </Link>
                    <div>
                        <strong>小家园</strong>
                        <span>{hasLiveAnswer ? `${sourceCount ?? 0} 条来源 · ${retrievalText}` : '真实 RAG 问答'}</span>
                    </div>
                    <button className={styles.avatarButton} type="button" onClick={() => openAiChat()} aria-label="打开小家园助手">
                        <img src="/img/ai-logo.svg" alt="" />
                    </button>
                </header>

                <article className={styles.questionCard}>
                    <span className={styles.questionLabel}>我的问题</span>
                    <h1>{liveQuestion}</h1>
                    <p>{hasLiveAnswer ? '小家园正在基于知识库检索、回答，并把弱命中问题记录为信息缺口。' : '输入一个真实问题，小家园会优先给出可执行步骤，再补充来源和不确定信息。'}</p>
                </article>

                <section className={styles.answerCard} aria-labelledby="answer-title">
                    <div className={styles.answerHeader}>
                        <div>
                            <span className={styles.answerLabel}>{hasLiveAnswer ? '实时回答' : '结构化回答'}</span>
                            <h2 id="answer-title">{hasLiveAnswer ? '基于知识库生成的答复' : '建议先挂失，再确认补办方式'}</h2>
                        </div>
                        <ShieldCheck size={22} strokeWidth={1.8} aria-hidden="true" />
                    </div>

                    {hasLiveAnswer ? (
                        <div className={styles.liveAnswerWrap}>
                            <div className={styles.liveMetaRow}>
                                <span>{retrievalText}</span>
                                <span>{sourceCount ?? 0} 条来源</span>
                                {queryId && <span>ID {queryId.slice(0, 8)}</span>}
                            </div>
                            {error ? (
                                <div className={styles.liveError}>{error}</div>
                            ) : (
                                <div className={styles.markdownAnswer}>
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{cleanMarkdown(liveAnswer || '正在检索知识库并生成回答...')}</ReactMarkdown>
                                    {isLoading && <span className={styles.answerCursor}>▊</span>}
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className={styles.answerSections}>
                                {answerSections.map((section) => (
                                    <section key={section.title} className={styles.answerSection}>
                                        <h3>{section.title}</h3>
                                        <ol>
                                            {section.items.map((item) => (
                                                <li key={item}>{item}</li>
                                            ))}
                                        </ol>
                                    </section>
                                ))}
                            </div>

                            <section className={styles.placeCard}>
                                <div className={styles.placeIcon} aria-hidden="true">
                                    <MapPin size={18} strokeWidth={1.8} />
                                </div>
                                <div>
                                    <h3>办理地点</h3>
                                    <p>通常在校园卡服务点或学校指定服务窗口办理。不同校区可能有差异，建议办理前再核实一次。</p>
                                </div>
                            </section>
                        </>
                    )}

                    <div className={styles.noticeBox}>
                        <CircleAlert size={18} strokeWidth={1.8} aria-hidden="true" />
                        <div>
                            <strong>这条信息建议再核实一次</strong>
                            <p>{hasLiveAnswer ? '如果检索命中弱，系统会自动把问题沉淀进知识缺口池。' : '补卡费用、周末办理时间可能随服务窗口调整变化。'}</p>
                        </div>
                        <button type="button" onClick={() => askQuestion('这条校园卡补办信息需要核实哪些来源？')} disabled={isLoading}>
                            标记为信息缺口
                        </button>
                    </div>
                </section>

                <section className={styles.sectionStack}>
                    <div className={styles.sectionHeader}>
                        <h2>信息来源</h2>
                        <span className={styles.qaSourceCount}>{hasLiveAnswer ? `${sourceCount ?? 0} 条命中` : '2 条可追溯'}</span>
                    </div>
                    {hasLiveAnswer ? (
                        <div className={styles.opsMiniGrid}>
                            <article className={styles.opsMiniCard}>
                                <strong>{retrievalText}</strong>
                                <span>检索状态</span>
                            </article>
                            <article className={styles.opsMiniCard}>
                                <strong>{sourceCount ?? 0}</strong>
                                <span>命中文档</span>
                            </article>
                            <article className={styles.opsMiniCard}>
                                <strong>{queryId ? queryId.slice(0, 8) : '生成中'}</strong>
                                <span>日志编号</span>
                            </article>
                        </div>
                    ) : (
                        <div className={styles.sourceGrid}>
                            {sources.map((source) => (
                                <article key={source.title} className={styles.sourceCard}>
                                    <CheckCircle2 size={16} strokeWidth={1.8} aria-hidden="true" />
                                    <div>
                                        <h3>{source.title}</h3>
                                        <p>{source.meta}</p>
                                    </div>
                                    <span>{source.status}</span>
                                </article>
                            ))}
                        </div>
                    )}
                </section>

                <section className={styles.followUpPanel}>
                    <h2>继续追问</h2>
                    <div className={styles.suggestionRow}>
                        {suggestions.map((suggestion) => (
                            <button key={suggestion} type="button" onClick={() => askQuestion(suggestion)} disabled={isLoading}>
                                {suggestion}
                            </button>
                        ))}
                    </div>
                </section>

                <section className={styles.feedbackPanel}>
                    <MessageSquareText size={18} strokeWidth={1.8} aria-hidden="true" />
                    <span>
                        {feedbackState === 'failed'
                            ? '反馈暂时没有写入成功'
                            : feedbackState
                                ? '已记录，谢谢反馈'
                                : '这个回答有帮助吗？'}
                    </span>
                    {!feedbackState || feedbackState === 'failed' ? (
                        <div>
                            <button type="button" onClick={() => submitFeedback('helpful')}>
                                有帮助
                            </button>
                            <button type="button" onClick={() => submitFeedback('not_helpful')}>
                                没帮助
                            </button>
                        </div>
                    ) : null}
                </section>

                <div className={styles.stickyComposer}>
                    <Search size={17} strokeWidth={1.8} aria-hidden="true" />
                    <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                event.preventDefault();
                                submit();
                            }
                        }}
                        placeholder="继续追问"
                        aria-label="继续追问小家园"
                        disabled={isLoading}
                    />
                    <button type="button" onClick={submit} aria-label="发送追问" disabled={isLoading}>
                        <SendHorizontal size={16} strokeWidth={2} aria-hidden="true" />
                    </button>
                </div>
            </main>
        </Layout>
    );
}
