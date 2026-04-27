import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import {
    BookOpen,
    ChevronRight,
    CreditCard,
    GraduationCap,
    IdCard,
    MoreHorizontal,
    Search,
    SendHorizontal,
    ShieldCheck,
    Trophy,
    Utensils,
    Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import styles from '../css/CijianMobile.module.css';

function openAiChat(query?: string) {
    if (typeof window === 'undefined') {
        return;
    }

    window.dispatchEvent(new CustomEvent('open-ai-chat', { detail: query ? { query } : {} }));
}

type Channel = {
    title: string;
    href: string;
    icon: LucideIcon;
    label: string;
};

type LiveUpdate = {
    title: string;
    source: string;
    status: '已更新' | '需核实' | '共建中';
    date: string;
    href: string;
    icon: LucideIcon;
};

const quickPrompts = ['校园卡丢了怎么办？', '绩点怎么算？', '宿舍怎么报修？', '转专业要注意什么？'] as const;

const channels: Channel[] = [
    {
        title: '新生',
        href: '/docs/onboarding/',
        icon: IdCard,
        label: '报到 / 校园卡',
    },
    {
        title: '学业',
        href: '/docs/academics/',
        icon: GraduationCap,
        label: '绩点 / 选课',
    },
    {
        title: '生活',
        href: '/docs/campus-life/',
        icon: Utensils,
        label: '食堂 / 报修',
    },
    {
        title: '发展',
        href: '/docs/career/',
        icon: Trophy,
        label: '保研 / 竞赛',
    },
];

const liveUpdates: LiveUpdate[] = [
    {
        title: '校园卡补办信息已更新',
        source: '补充了服务点时间与所需材料',
        status: '已更新',
        date: '04-23',
        href: '/docs/onboarding/campus-card',
        icon: CreditCard,
    },
    {
        title: '绩点与学分计算补充了 FAQ',
        source: '整理了同学常见疑问，附计算示例',
        status: '需核实',
        date: '04-22',
        href: '/docs/academics/credits-gpa',
        icon: BookOpen,
    },
    {
        title: '宿舍报修流程新增入口说明',
        source: '新增线上报修入口与进度查询方式',
        status: '共建中',
        date: '04-21',
        href: '/docs/campus-life/repair',
        icon: Wrench,
    },
];

function getStatusClass(status: LiveUpdate['status']) {
    if (status === '需核实') {
        return `${styles.statusPill} ${styles.statusWarning}`;
    }

    if (status === '共建中') {
        return `${styles.statusPill} ${styles.statusInfo}`;
    }

    return styles.statusPill;
}

function AskComposer() {
    const [query, setQuery] = React.useState('');

    const submit = () => {
        const trimmed = query.trim() || '校园卡丢了怎么办？';
        openAiChat(trimmed);
        setQuery('');
    };

    return (
        <div className={styles.askTool}>
            <div className={styles.askInputRow}>
                <Search className={styles.askSearchIcon} size={18} strokeWidth={1.8} aria-hidden="true" />
                <input
                    className={styles.askInput}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            submit();
                        }
                    }}
                    placeholder="搜索攻略，或问小家园"
                    aria-label="向小家园提问"
                />
                <button className={styles.sendButton} type="button" onClick={submit} aria-label="发送问题">
                    <SendHorizontal size={16} strokeWidth={2} aria-hidden="true" />
                </button>
            </div>
            <div className={styles.quickChipGrid} aria-label="快捷提问">
                {quickPrompts.map((prompt) => (
                    <button key={prompt} className={styles.quickChip} type="button" onClick={() => openAiChat(prompt)}>
                        {prompt}
                    </button>
                ))}
            </div>
        </div>
    );
}

function ProductTopbar() {
    return (
        <header className={styles.productTopbar}>
            <div className={styles.brandBlock}>
                <span className={styles.brandTitle}>此间</span>
                <span className={styles.brandSubtitle}>
                    南昌大学生存手册
                    <ShieldCheck size={12} strokeWidth={1.8} aria-hidden="true" />
                </span>
            </div>
            <div className={styles.moduleActionGroup}>
                <button className={styles.iconButton} type="button" onClick={() => openAiChat()} aria-label="搜索或提问">
                    <Search size={18} strokeWidth={1.8} aria-hidden="true" />
                </button>
                <button className={styles.iconButton} type="button" aria-label="更多">
                    <MoreHorizontal size={18} strokeWidth={1.8} aria-hidden="true" />
                </button>
            </div>
        </header>
    );
}

const ChannelCard: React.FC<{ channel: Channel }> = ({ channel }) => {
    const Icon = channel.icon;

    return (
        <Link className={styles.channelCard} to={channel.href}>
            <div className={styles.channelIcon} aria-hidden="true">
                <Icon size={26} strokeWidth={1.8} />
            </div>
            <div className={styles.channelContent}>
                <h3>{channel.title}</h3>
                <span>{channel.label}</span>
            </div>
            <ChevronRight className={styles.channelChevron} size={17} strokeWidth={1.8} aria-hidden="true" />
        </Link>
    );
};

function SectionHeader({ title, action, href }: { title: string; action?: string; href?: string }) {
    return (
        <div className={styles.sectionHeader}>
            <h2>{title}</h2>
            {action && href && (
                <Link className={styles.sectionAction} to={href}>
                    {action}
                    <ChevronRight size={14} strokeWidth={1.8} aria-hidden="true" />
                </Link>
            )}
        </div>
    );
}

export default function Home() {
    return (
        <Layout title="此间" description="此间｜南昌大学学生知识入口" wrapperClassName="cijian-mobile-wrapper">
            <main className={`${styles.appPage} ${styles.homePage}`}>
                <ProductTopbar />

                <section className={styles.heroPanel}>
                    <p className={styles.eyebrow}>校园攻略、同学经验和小家园问答</p>
                    <h1 className={styles.heroTitle}>把校园信息问清楚</h1>
                    <AskComposer />
                </section>

                <section className={styles.categoryDock} aria-label="常用分类">
                    <div className={styles.channelGrid}>
                        {channels.map((channel) => (
                            <ChannelCard key={channel.title} channel={channel} />
                        ))}
                    </div>
                </section>

                <section className={styles.sectionStack}>
                    <SectionHeader title="最新更新" action="查看更多" href="/moment" />
                    <div className={styles.updateList}>
                        {liveUpdates.map((update) => (
                            <Link key={update.title} className={styles.updateItem} to={update.href}>
                                <span className={styles.updateIcon} aria-hidden="true">
                                    <update.icon size={24} strokeWidth={1.8} />
                                </span>
                                <div className={styles.updateContent}>
                                    <h3>{update.title}</h3>
                                    <p>{update.source}</p>
                                </div>
                                <span className={styles.updateMeta}>
                                    <span className={getStatusClass(update.status)}>{update.status}</span>
                                    <span className={styles.updateDate}>{update.date}</span>
                                    <ChevronRight size={16} strokeWidth={1.8} aria-hidden="true" />
                                </span>
                            </Link>
                        ))}
                    </div>
                </section>

                <section className={styles.contributionBand}>
                    <div className={styles.contributionIcon} aria-hidden="true">
                        <ShieldCheck size={22} strokeWidth={1.8} />
                    </div>
                    <div>
                        <h2>发现信息过期？</h2>
                        <p>你的修正会帮助更多同学获得准确的信息</p>
                    </div>
                    <Link className={styles.ghostButton} to="/docs/contributors/contributing">
                        提交修正
                        <ChevronRight size={16} strokeWidth={1.8} aria-hidden="true" />
                    </Link>
                </section>

                <footer className={styles.homeFootnote}>
                    <ShieldCheck size={14} strokeWidth={1.8} aria-hidden="true" />
                    <span>来源可追踪 · 重要信息需核实 · 不替你办理</span>
                </footer>
            </main>
        </Layout>
    );
}
