import React from 'react';
import type { LucideIcon } from 'lucide-react';
import styles from './FeatureCard.module.css';

interface FeatureCardProps {
    title: string;
    description: string;
    to: string;
    icon: LucideIcon;
}

export function FeatureCard({ title, description, to, icon: Icon }: FeatureCardProps) {
    return (
        <a href={to} className={styles.card}>
            <div className={styles.iconContainer}>
                <Icon size={18} />
            </div>
            <h3 className={styles.title}>{title}</h3>
            <p className={styles.description}>{description}</p>
            <div className={styles.actionLink}>
                Read more
                <span className={styles.actionIcon}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                    </svg>
                </span>
            </div>
        </a>
    );
}

interface FeatureGridProps {
    children: React.ReactNode;
}

export function FeatureGrid({ children }: FeatureGridProps) {
    return <div className={styles.gridContainer}>{children}</div>;
}
