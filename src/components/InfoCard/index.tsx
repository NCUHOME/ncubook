import React from 'react';
import styles from './InfoCard.module.css';

interface InfoCardProps {
    label: string;
    value: string;
    linkText?: string;
    linkUrl?: string;
}

export default function InfoCard({ label, value, linkText, linkUrl }: InfoCardProps) {
    return (
        <div className={styles.card}>
            <div>
                <div className={styles.label}>{label}</div>
                <div className={styles.value}>{value}</div>
            </div>
            {linkText && linkUrl && (
                <a href={linkUrl} className={styles.link}>
                    {linkText}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                    </svg>
                </a>
            )}
        </div>
    );
}
