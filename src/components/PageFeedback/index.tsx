import React, { useState } from 'react';
import styles from './PageFeedback.module.css';

export default function PageFeedback() {
    const [voted, setVoted] = useState<'yes' | 'no' | null>(null);

    return (
        <div className={styles.container}>
            {voted ? (
                <p className={styles.thanks}>Thanks for your feedback!</p>
            ) : (
                <>
                    <p className={styles.question}>Was this page helpful?</p>
                    <div className={styles.buttons}>
                        <button className={styles.btn} onClick={() => setVoted('yes')}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                            </svg>
                            Yes
                        </button>
                        <button className={styles.btn} onClick={() => setVoted('no')}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
                            </svg>
                            No
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
