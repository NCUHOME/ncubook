import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import {
    ArrowLeft,
    BookOpenText,
    CheckCircle2,
    Clock3,
    HomeIcon,
    Menu,
    MessageSquarePlus,
    ShieldCheck,
    Sparkles,
} from 'lucide-react';
import styles from '../css/CijianMobile.module.css';

const entries = [
    {
        title: '转专业政策补充说明正在核实',
        description: '已有同学提交了不同学院的加试要求，编辑组正在对照教务处通知和学院文件。',
        source: '教务处通知 · 同学补白',
        status: '待核实',
        time: '今天 18:40',
    },
    {
        title: '校园卡补办流程已回流到指南',
        description: '补齐了挂失入口、办理地点和常见追问，页面底部新增了反馈入口。',
        source: '小家园问答 · 生活指南',
        status: '已回流',
        time: '今天 16:20',
    },
    {
        title: '前湖校区报修入口需要补充处理时效',
        description: '现有文档已经覆盖入口和截图，但缺少不同维修类型的等待时间。',
        source: '同学反馈',
        status: '补白中',
        time: '昨天 21:15',
    },
] as const;

const checks = ['来源能追溯', '状态有标记', '更新会回流'] as const;

function openAiChat(query?: string) {
    if (typeof window === 'undefined') {
        return;
    }

    window.dispatchEvent(new CustomEvent('open-ai-chat', { detail: query ? { query } : {} }));
}

export default function MomentPage() {
    return (
        <Layout title="此刻" description="此刻｜人工整理过的校园变化记录" wrapperClassName="cijian-mobile-wrapper">
            <main className={`${styles.appPage} ${styles.momentPage}`}>
                <header className={styles.productTopbar}>
                    <button className={styles.iconButton} type="button" aria-label="打开导航">
                        <Menu size={18} strokeWidth={1.8} aria-hidden="true" />
                    </button>
                    <div className={styles.brandBlock}>
                        <span className={styles.brandTitle}>此刻</span>
                        <span className={styles.brandSubtitle}>被整理过的校园变化记录</span>
                    </div>
                    <Link className={styles.avatarButton} to="/" aria-label="回到此间首页">
                        <HomeIcon size={18} strokeWidth={1.8} aria-hidden="true" />
                    </Link>
                </header>

                <section className={styles.momentHero}>
                    <Link className={styles.backLink} to="/">
                        <ArrowLeft size={18} strokeWidth={1.8} aria-hidden="true" />
                        首页
                    </Link>
                    <p className={styles.eyebrow}>实时讨论留在圈子，进入此间的是可回头查的公共信息</p>
                    <h1>把正在变化的信息，整理成可靠记录</h1>
                    <p>此刻不是论坛，也不是信息流。它记录“正在发生但还未稳定”的校园线索，并标注来源、状态和下一步处理方式。</p>
                    <div className={styles.momentCheckRow}>
                        {checks.map((check) => (
                            <span key={check}>
                                <CheckCircle2 size={14} strokeWidth={1.8} aria-hidden="true" />
                                {check}
                            </span>
                        ))}
                    </div>
                </section>

                <section className={styles.sectionStack}>
                    <div className={styles.sectionHeader}>
                        <h2>近期重点</h2>
                        <button className={styles.inlineActionButton} type="button" onClick={() => openAiChat('最近哪些校园信息正在变化？')}>
                            问小家园
                        </button>
                    </div>
                    <div className={styles.momentTimeline}>
                        {entries.map((entry) => (
                            <article key={entry.title} className={styles.momentItem}>
                                <div className={styles.momentDot} aria-hidden="true" />
                                <div className={styles.momentItemBody}>
                                    <div className={styles.momentMeta}>
                                        <span>{entry.time}</span>
                                        <strong>{entry.status}</strong>
                                    </div>
                                    <h3>{entry.title}</h3>
                                    <p>{entry.description}</p>
                                    <div className={styles.sourceMini}>
                                        <Sparkles size={14} strokeWidth={1.8} aria-hidden="true" />
                                        {entry.source}
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>

                <section className={styles.momentContribution}>
                    <MessageSquarePlus size={20} strokeWidth={1.8} aria-hidden="true" />
                    <div>
                        <h2>你看到的信息也可以进入此间</h2>
                        <p>提交线索时最好带上来源、截图或办理体验。我们会把高频问题整理进指南，而不是让它散在聊天记录里。</p>
                    </div>
                    <Link className={styles.ghostButton} to="/docs/contributors/contributing">
                        提供线索
                    </Link>
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
                    <Link className={styles.bottomNavItemActive} to="/moment">
                        <Clock3 size={16} strokeWidth={1.8} aria-hidden="true" />
                        此刻
                    </Link>
                </nav>
            </main>
        </Layout>
    );
}
