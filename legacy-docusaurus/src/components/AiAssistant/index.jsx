import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useHistory, useLocation } from '@docusaurus/router';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AlertTriangle, BookOpenCheck, ShieldCheck } from 'lucide-react';
import styles from './styles.module.css';
import { FEEDBACK_FORM_URL } from '@site/src/constants/feedback';
import { getRetrievalMeta, shouldShowTrustNotice } from './answerMeta.mjs';

const API_URL = 'https://ncubook-api.vercel.app/api/chat';
const FEEDBACK_API_URL = 'https://ncubook-api.vercel.app/api/feedback';

function parseTopSourcesHeader(value) {
    if (!value) return [];
    try {
        const decoded = decodeURIComponent(value);
        const parsed = JSON.parse(decoded);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .map((source) => ({
                title: String(source?.title || source?.heading || '未知来源'),
                href: String(source?.url || ''),
                heading: source?.heading ? String(source.heading) : '',
                similarity: Number(source?.similarity ?? 0),
            }))
            .filter((source) => source.href);
    } catch (error) {
        console.warn('Failed to parse source header:', error);
        return [];
    }
}

export default function AiAssistant() {
    const [isOpen, setIsOpen] = useState(false);
    const QUICK_QUESTIONS = [
        '转专业需要什么条件？',
        '食堂哪家好吃？',
        '学分绩点怎么算？',
        '校园网怎么连？',
        '考研该怎么准备？',
        '校园卡怎么办理？',
    ];
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: '你好，我是小家园。可以问我南大的流程、生活办事和资料出处。',
        },
    ]);
    const [showChips, setShowChips] = useState(true);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [streamingContent, setStreamingContent] = useState('');
    const [feedbackMap, setFeedbackMap] = useState({});
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const abortControllerRef = useRef(null);
    const messagesRef = useRef(messages);
    messagesRef.current = messages;
    const history = useHistory();
    const location = useLocation();
    const hideFloatingButton = location.pathname === '/';

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, streamingContent, scrollToBottom]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const [pendingQuery, setPendingQuery] = useState('');

    // 监听全局触发 AI 对话的事件 (例如首页中心搜索框)
    useEffect(() => {
        const handleOpenChatEvent = (event) => {
            const query = event.detail?.query;
            if (query && query.trim()) {
                setIsOpen(true);
                setPendingQuery(query.trim());
            }
        };

        window.addEventListener('open-ai-chat', handleOpenChatEvent);
        return () => window.removeEventListener('open-ai-chat', handleOpenChatEvent);
    }, []);

    const doSend = useCallback(async (queryText) => {
        if (!queryText || isLoading) return;
        setShowChips(false);

        const userMsg = { role: 'user', content: queryText };
        const newMessages = [...messagesRef.current, userMsg];
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);
        setStreamingContent('');

        // 创建 AbortController 用于取消请求
        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: newMessages.map((m) => ({
                        role: m.role,
                        content: m.content,
                    })),
                    currentPath: location.pathname,
                }),
                signal: controller.signal,
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`API 请求失败 (${response.status}): ${errText}`);
            }

            const queryLogId = response.headers.get('X-Ncubook-Query-Id') || '';
            const retrievalState = response.headers.get('X-Ncubook-Retrieval-State') || '';
            const sourceCount = Number(response.headers.get('X-Ncubook-Source-Count') || 0);
            const topSources = parseTopSourcesHeader(response.headers.get('X-Ncubook-Top-Sources'));

            // 流式读取响应
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullContent = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                fullContent += chunk;
                setStreamingContent(fullContent);
            }

            // 流式结束，添加完整消息
            if (fullContent) {
                setMessages((prev) => [
                    ...prev,
                    {
                        role: 'assistant',
                        content: fullContent,
                        queryLogId,
                        retrievalState,
                        sourceCount,
                        topSources,
                        question: queryText,
                    },
                ]);
            } else {
                setMessages((prev) => [
                    ...prev,
                    { role: 'assistant', content: '抱歉，我暂时无法回答这个问题，请稍后再试。' },
                ]);
            }
        } catch (err) {
            if (err.name === 'AbortError') return;
            setMessages((prev) => [
                ...prev,
                {
                    role: 'assistant',
                    content: `⚠️ 出错了：${err.message}\n\n请稍后重试。如果问题持续，请联系管理员。`,
                },
            ]);
        } finally {
            setIsLoading(false);
            setStreamingContent('');
            abortControllerRef.current = null;
        }
    }, [isLoading, location.pathname]);

    // 处理待发送的外部查询
    useEffect(() => {
        if (pendingQuery && isOpen && !isLoading) {
            const query = pendingQuery;
            setPendingQuery(''); // 清除 pending状态，防止重复发送
            doSend(query);
        }
    }, [pendingQuery, isOpen, isLoading, doSend]);

    const handleNavigate = useCallback(
        (url) => {
            history.push(url);
            setIsOpen(false);
        },
        [history]
    );

    // 旧路径 slug → 新分类的映射
    const SLUG_TO_CATEGORY = {
        'freshmen-guide': 'onboarding', 'essentials': 'onboarding', 'dorm-life': 'onboarding',
        'campus-card': 'onboarding', 'student-id': 'onboarding', 'network': 'onboarding',
        'credits-gpa': 'academics', 'curriculum': 'academics', 'general-courses': 'academics',
        'major-courses': 'academics', 'exams': 'academics', 'major-change': 'academics',
        'double-degree': 'academics', 'attendance': 'academics', 'english': 'academics',
        'sports': 'academics', 'class-cadre': 'academics',
        'postgraduate': 'career', 'awards': 'career', 'innovation-research': 'career',
        'dining': 'campus-life', 'campus-transport': 'campus-life', 'external-transport': 'campus-life',
        'repair': 'campus-life', 'phone-directory': 'campus-life', 'jiayuan-register': 'campus-life',
        'software': 'campus-life',
    };

    const normalizeHref = (href) => {
        if (!href) return href;
        let path = href;
        // 去掉站点域名，变成相对路径
        path = path.replace(/^https?:\/\/book\.ncuos\.com/, '');
        // 确保以 /docs/ 开头
        if (path.startsWith('/') && !path.startsWith('/docs/')) {
            path = '/docs' + path;
        }
        // 映射旧路径 /docs/study/* 和 /docs/life/*
        const oldPrefixMatch = path.match(/^\/docs\/(study|life)\/(.+?)(\/?)(#.*)?$/);
        if (oldPrefixMatch) {
            const slug = oldPrefixMatch[2];
            const hash = oldPrefixMatch[4] || '';
            if (oldPrefixMatch[1] === 'life') {
                return `/docs/campus-life/${slug}${hash}`;
            }
            const category = SLUG_TO_CATEGORY[slug];
            if (category) {
                return `/docs/${category}/${slug}${hash}`;
            }
        }
        if (path === '/docs/life' || path === '/docs/life/') {
            return '/docs/campus-life/';
        }
        if (path === '/docs/study' || path === '/docs/study/') {
            return '/docs/academics/';
        }
        return path;
    };

    const MarkdownComponents = {
        a: ({ node, ...props }) => {
            let href = normalizeHref(props.href);
            const isInternal = href && href.startsWith('/');
            if (isInternal) {
                return (
                    <a
                        href={href}
                        className={styles.pageLink}
                        onClick={(e) => {
                            e.preventDefault();
                            handleNavigate(href);
                        }}
                    >
                        {props.children}
                    </a>
                );
            }
            return (
                <a href={href} target="_blank" rel="noopener noreferrer" className={styles.pageLink}>
                    {props.children}
                </a>
            );
        },
        p: ({ node, ...props }) => {
            // Remove empty paragraphs that just contain whitespace/newlines
            if (
                node.children.length === 1 &&
                node.children[0].type === 'text' &&
                !node.children[0].value.trim()
            ) {
                return null;
            }
            return <p {...props} />;
        }
    };

    const getAiFeedbackUrl = (idx) => {
        // 找到该 assistant 消息前最近的 user 消息作为上下文
        const userQuestion = messages.slice(0, idx).reverse().find(m => m.role === 'user')?.content || '';
        const params = new URLSearchParams();
        params.set('prefill_来源（自动填写）', 'AI');
        params.set('prefill_页面（自动填写）', location.pathname);
        params.set('prefill_问题（自动填写）', userQuestion.slice(0, 200));
        return `${FEEDBACK_FORM_URL}?${params.toString()}`;
    };

    const sendAiFeedback = async (idx, vote) => {
        const currentMessages = messagesRef.current;
        const assistantMessage = currentMessages[idx] || messages[idx];
        const userQuestion = currentMessages.slice(0, idx).reverse().find(m => m.role === 'user')?.content || assistantMessage?.question || '';

        setFeedbackMap(prev => ({ ...prev, [idx]: vote }));

        try {
            const response = await fetch(FEEDBACK_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    targetType: 'agent_answer',
                    queryLogId: assistantMessage?.queryLogId || undefined,
                    vote,
                    pagePath: location.pathname,
                    question: userQuestion,
                    answer: assistantMessage?.content || '',
                }),
            });

            if (!response.ok) {
                throw new Error(`反馈写入失败：${response.status}`);
            }
        } catch (error) {
            console.warn('AI feedback failed:', error);
            setFeedbackMap(prev => ({ ...prev, [idx]: 'failed' }));
        }
    };

    const MessageFeedback = ({ idx }) => {
        const state = feedbackMap[idx];
        if (!state || state === 'failed') {
            return (
                <div className={styles.feedbackRow}>
                    {state === 'failed' && <span className={styles.feedbackThanks}>反馈暂时没有写入成功</span>}
                    <button className={styles.feedbackBtn} onClick={() => sendAiFeedback(idx, 'helpful')}>有帮助</button>
                    <button className={styles.feedbackBtn} onClick={() => sendAiFeedback(idx, 'not_helpful')}>没帮助</button>
                </div>
            );
        }
        if (state === 'helpful') {
            return <div className={styles.feedbackRow}><span className={styles.feedbackThanks}>谢谢反馈！</span></div>;
        }
        return (
            <div className={styles.feedbackRow}>
                <span className={styles.feedbackThanks}>感谢反馈！</span>
                <a className={styles.feedbackLink} href={getAiFeedbackUrl(idx)} target="_blank" rel="noopener noreferrer">帮助我们改进：填写问卷</a>
            </div>
        );
    };

    const MessageEvidence = ({ msg }) => {
        if (!msg.queryLogId && !msg.retrievalState && !msg.sourceCount) {
            return null;
        }

        const meta = getRetrievalMeta(msg.retrievalState, msg.sourceCount);
        const topSources = Array.isArray(msg.topSources) ? msg.topSources.slice(0, 3) : [];
        const toneClass = {
            strong: styles.retrievalStrong,
            partial: styles.retrievalPartial,
            weak: styles.retrievalWeak,
            none: styles.retrievalNone,
            unknown: styles.retrievalUnknown,
        }[meta.tone] || styles.retrievalUnknown;
        const StatusIcon = shouldShowTrustNotice(meta) ? AlertTriangle : ShieldCheck;

        return (
            <div className={styles.answerEvidence}>
                {shouldShowTrustNotice(meta) && (
                    <div className={`${styles.trustNotice} ${meta.tone === 'none' ? styles.trustNoticeNone : styles.trustNoticeWeak}`}>
                        <AlertTriangle size={15} strokeWidth={1.9} aria-hidden="true" />
                        <span>{meta.notice}</span>
                    </div>
                )}
                <div className={styles.answerMeta}>
                    <span className={`${styles.retrievalPill} ${toneClass}`}>
                        <StatusIcon size={13} strokeWidth={2} aria-hidden="true" />
                        {meta.label}
                    </span>
                    <span>{Number(msg.sourceCount || 0)} 条来源</span>
                    {msg.queryLogId && <span>ID {msg.queryLogId.slice(0, 8)}</span>}
                </div>
                {topSources.length > 0 && (
                    <div className={styles.sourceList} aria-label="回答引用来源">
                        {topSources.map((source, sourceIndex) => (
                            <a
                                key={`${source.href}-${sourceIndex}`}
                                className={styles.sourcePreview}
                                href={source.href}
                                onClick={(e) => {
                                    if (source.href.startsWith('/')) {
                                        e.preventDefault();
                                        handleNavigate(source.href);
                                    }
                                }}
                            >
                                <BookOpenCheck size={13} strokeWidth={1.9} aria-hidden="true" />
                                <span>{source.title}</span>
                                {source.heading && <em>{source.heading}</em>}
                            </a>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const handleSend = useCallback(() => {
        doSend(input.trim());
    }, [doSend, input]);

    const handleKeyDown = useCallback(
        (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
            }
        },
        [handleSend]
    );

    const handleStop = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            // 保留已接收的流式内容
            setStreamingContent((prev) => {
                if (prev.trim()) {
                    setMessages((msgs) => [...msgs, { role: 'assistant', content: prev }]);
                }
                return '';
            });
            setIsLoading(false);
        }
    }, []);

    // 当前正在流式输出的内容用于展示
    const displayContent = streamingContent;

    // 清理 markdown 文本，合并多余的空行，防止产生过多留白
    const cleanMarkdown = (text) =>
        text
            .replace(/\n{3,}/g, '\n\n')           // 3+ 连续换行 → 2 个
            .replace(/\n{2,}([-*] )/g, '\n$1')    // 列表项前的空行去掉
            .replace(/([-*] .+)\n{2,}([-*] )/g, '$1\n$2') // 列表项之间的空行去掉
            .trim();

    return (
        <>
            {!hideFloatingButton && (
                <button
                    className={`${styles.floatingBtn} ${isOpen ? styles.hidden : ''}`}
                    onClick={() => setIsOpen(true)}
                    title="打开小家园"
                >
                    <img src="/img/ai-logo.svg" alt="小家园" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                </button>
            )}

            {/* 聊天窗口 Modal */}
            {isOpen && (
                <div className={styles.modalOverlay} onClick={() => setIsOpen(false)}>
                    <div className={styles.chatWindow} onClick={(e) => e.stopPropagation()}>
                        {/* 极简头部 / 标题 */}
                        <div className={styles.windowHeader}>
                            <div className={styles.headerTitle}>
                                <img src="/img/ai-logo.svg" alt="小家园" className={styles.headerIconImg} /> 小家园
                            </div>
                            <button className={styles.closeBtn} onClick={() => setIsOpen(false)} title="关闭面板">
                                ✕
                            </button>
                        </div>

                        {/* 消息流式阅读区域 */}
                        <div className={styles.documentScrollContainer}>
                            <div className={styles.messagesContainer}>
                                {messages.map((msg, idx) => (
                                    <div
                                        key={idx}
                                        className={`${styles.messageBlock} ${msg.role === 'user' ? styles.userBlock : styles.assistantBlock}`}
                                    >
                                        {msg.role === 'user' ? (
                                            <div className={styles.userQueryText}>
                                                <span className={styles.userQuerySign}>Q</span> {msg.content}
                                            </div>
                                        ) : (
                                            <div className={styles.documentContent}>
                                                <ReactMarkdown components={MarkdownComponents} remarkPlugins={[remarkGfm]}>
                                                    {cleanMarkdown(msg.content)}
                                                </ReactMarkdown>
                                                {idx > 0 && <MessageEvidence msg={msg} />}
                                                {idx === 0 && showChips && (
                                                    <div className={styles.quickChips}>
                                                        {QUICK_QUESTIONS.map((q) => (
                                                            <button
                                                                key={q}
                                                                className={styles.chip}
                                                                onClick={() => doSend(q)}
                                                            >
                                                                {q}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                                {idx > 0 && !isLoading && <MessageFeedback idx={idx} />}
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {/* 流式输出中的内容 */}
                                {isLoading && displayContent && (
                                    <div className={`${styles.messageBlock} ${styles.assistantBlock}`}>
                                        <div className={styles.documentContent}>
                                            <ReactMarkdown components={MarkdownComponents} remarkPlugins={[remarkGfm]}>
                                                {cleanMarkdown(displayContent)}
                                            </ReactMarkdown>
                                            <span className={styles.cursor}>▊</span>
                                        </div>
                                    </div>
                                )}

                                {/* 等待响应的加载状态 */}
                                {isLoading && !displayContent && (
                                    <div className={`${styles.messageBlock} ${styles.assistantBlock}`}>
                                        <div className={styles.documentContent}>
                                            <div className={styles.loadingState}>
                                                思考中<span>.</span><span>.</span><span>.</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} className={styles.endAnchor} />
                            </div>
                        </div>

                        {/* 悬浮输入搜索栏 */}
                        <div className={styles.inputFloatingContainer}>
                            <div className={styles.inputWrapper}>
                                <textarea
                                    ref={inputRef}
                                    className={styles.inputField}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="询问学习指南、课外活动或校园生活..."
                                    rows={1}
                                    disabled={isLoading}
                                />
                                {isLoading ? (
                                    <button className={styles.stopBtn} onClick={handleStop} title="停止生成">
                                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
                                    </button>
                                ) : (
                                    <button
                                        className={styles.sendBtn}
                                        onClick={handleSend}
                                        disabled={!input.trim()}
                                        title="发送请求"
                                    >
                                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
