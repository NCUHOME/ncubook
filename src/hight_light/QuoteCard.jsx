import React from 'react';
import styles from './QuoteCard.module.css';

export default function QuoteCard({ children, icon = '💡' }) {
  return (
    <div className={styles.quoteContainer}>
      <div className={styles.quoteIcon}>{icon}</div>
      <div className={styles.quoteContent}>
        <div className={styles.quoteText}>{children}</div>
      </div>
      <div className={styles.quoteBorder}></div>
    </div>
  );
}
