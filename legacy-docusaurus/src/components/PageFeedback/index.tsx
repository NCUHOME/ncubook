import React, { useState } from 'react';
import { useLocation } from '@docusaurus/router';
import styles from './PageFeedback.module.css';
import { FEEDBACK_FORM_URL } from '@site/src/constants/feedback';

const FEEDBACK_API_URL = 'https://ncubook-api.vercel.app/api/feedback';

export default function PageFeedback() {
    const [voted, setVoted] = useState<'yes' | 'no' | null>(null);
    const [writeFailed, setWriteFailed] = useState(false);
    const location = useLocation();

    const params = new URLSearchParams();
    params.set('prefill_来源（自动填写）', '文档页');
    params.set('prefill_页面（自动填写）', location.pathname);
    const formUrl = `${FEEDBACK_FORM_URL}?${params.toString()}`;

    const submitFeedback = async (vote: 'helpful' | 'not_helpful') => {
        setVoted(vote === 'helpful' ? 'yes' : 'no');
        setWriteFailed(false);

        try {
            const response = await fetch(FEEDBACK_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    targetType: 'page',
                    vote,
                    pagePath: location.pathname,
                }),
            });

            if (!response.ok) {
                throw new Error(`反馈写入失败：${response.status}`);
            }
        } catch (error) {
            console.warn('Page feedback failed:', error);
            setWriteFailed(true);
        }
    };

    return (
        <div className={styles.container}>
            {voted ? (
                <div className={styles.thanks}>
                    <p>{writeFailed ? '反馈暂时没有写入成功，但你仍然可以填写问卷。' : '感谢反馈！'}</p>
                    {voted === 'no' && (
                        <a
                            className={styles.formLink}
                            href={formUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            帮助我们改进：填写问卷
                        </a>
                    )}
                </div>
            ) : (
                <>
                    <p className={styles.question}>这个页面有帮助吗？</p>
                    <div className={styles.buttons}>
                        <button className={styles.btn} onClick={() => submitFeedback('helpful')}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                            </svg>
                            有帮助
                        </button>
                        <button className={styles.btn} onClick={() => submitFeedback('not_helpful')}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
                            </svg>
                            没帮助
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
