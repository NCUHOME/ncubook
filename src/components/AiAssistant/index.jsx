import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useHistory, useLocation } from '@docusaurus/router';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './styles.module.css';

// 后端 API 地址（开发环境用 localhost:3001，生产环境改为 Vercel 部署地址）
const API_URL =
    typeof window !== 'undefined' && window.location.hostname === 'localhost'
        ? 'http://localhost:3001/api/chat'
        : 'https://ncubook-api.vercel.app/api/chat';

export default function AiAssistant() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content:
                '你好！我是小家园 🏠，南昌大学生存手册的 AI 助手。\n问我任何关于南大学习、生活的问题吧！我会根据手册内容为你解答，并推荐相关页面。',
        },
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [streamingContent, setStreamingContent] = useState('');
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const abortControllerRef = useRef(null);
    const history = useHistory();
    const location = useLocation();

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

        const userMsg = { role: 'user', content: queryText };
        const newMessages = [...messages, userMsg];
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
                setMessages((prev) => [...prev, { role: 'assistant', content: fullContent }]);
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
    }, [isLoading, messages, location.pathname]);

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

    const MarkdownComponents = {
        a: ({ node, ...props }) => {
            const isInternal = props.href && props.href.startsWith('/');
            if (isInternal) {
                return (
                    <a
                        href={props.href}
                        className={styles.pageLink}
                        onClick={(e) => {
                            e.preventDefault();
                            handleNavigate(props.href);
                        }}
                    >
                        📄 {props.children}
                    </a>
                );
            }
            return (
                <a href={props.href} target="_blank" rel="noopener noreferrer" className={styles.pageLink}>
                    🔗 {props.children}
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
            setIsLoading(false);
            setStreamingContent('');
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
            {/* 悬浮按钮 */}
            <button
                className={`${styles.floatingBtn} ${isOpen ? styles.hidden : ''}`}
                onClick={() => setIsOpen(true)}
                title="唤出小家园"
            >
                <span className={styles.pulse}></span>
                🏠
            </button>

            {/* 聊天窗口 Modal */}
            {isOpen && (
                <div className={styles.modalOverlay} onClick={() => setIsOpen(false)}>
                    <div className={styles.chatWindow} onClick={(e) => e.stopPropagation()}>
                        {/* 极简头部 / 标题 */}
                        <div className={styles.windowHeader}>
                            <div className={styles.headerTitle}>
                                <img src="/img/ai-copilot.png" alt="AI Copilot" className={styles.headerIconImg} /> 小家园 AI 助手
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
