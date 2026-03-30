import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import { ArrowUpRight } from 'lucide-react';
import styles from '../css/HomepageContent.module.css';

const entries = [
    {
        label: 'Community / 12 min ago',
        meta: '8 COMMENTS',
        title: '关于东区图书馆插座布局的深度考察',
        description: '实测哪几个位置不需要抢、采光更稳，且插座电压也更稳定。',
    },
    {
        label: 'Trend / 1 hour ago',
        meta: '24 COMMENTS',
        title: '避坑：选修课《当代艺术赏析》的期末形式',
        description: '并不是网上传的开卷，今年改成了闭卷论文，主题和评分点也变了。',
    },
    {
        label: 'Alert / 3 hours ago',
        meta: 'HOT',
        title: '西苑二楼食堂窗口调整，原来的麻辣烫搬到了另一侧',
        description: '新的位置排队更久，错峰过去会更合适。',
    },
] as const;

export default function MomentPage() {
    return (
        <Layout title="此刻" description="此刻｜人工整理过的校园变化记录">
            <main className={styles.homepage}>
                <section className={styles.heroSection}>
                    <div className={styles.heroCopy}>
                        <h1 className={styles.heroTitle}>此刻</h1>
                        <p className={styles.heroTagline}>把仍在变化的校园线索，整理成能回头查的公共记录。</p>
                    </div>
                </section>

                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>近期重点</h2>
                        <span className={styles.sectionLabel}>Live Stream</span>
                    </div>

                    <div className={styles.splitSection}>
                        <div className={styles.mediaColumn}>
                            <div className={styles.mediaTextBlock}>
                                <p className={styles.quote}>
                                    “实时讨论留在圈子，进入此间的，是经过筛选、补充和重新组织后的公共信息。”
                                </p>
                                <Link className={styles.inlineLink} to="/docs/contributors/contributing">
                                    提供线索
                                    <ArrowUpRight size={14} />
                                </Link>
                            </div>
                        </div>

                        <div className={styles.threadList}>
                            {entries.map((item) => (
                                <article key={item.title} className={styles.threadItem}>
                                    <div className={styles.threadMetaRow}>
                                        <span className={styles.threadLabel}>{item.label}</span>
                                        <span className={styles.threadCount}>{item.meta}</span>
                                    </div>
                                    <h3 className={styles.threadTitle}>{item.title}</h3>
                                    <p className={styles.threadDescription}>{item.description}</p>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>
            </main>
        </Layout>
    );
}
