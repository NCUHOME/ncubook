import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import {
    BarChart3,
    BookOpen,
    ChevronRight,
    CreditCard,
    FileSearch,
    GraduationCap,
    IdCard,
    MessageSquareText,
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

type ProductEntry = {
    title: string;
    eyebrow: string;
    href: string;
    copy: string;
    icon: LucideIcon;
};

const quickPrompts = ['校园卡丢了怎么办？', '绩点怎么算？', '宿舍怎么报修？', '转专业要注意什么？'] as const;

const productEntries: ProductEntry[] = [
    {
        title: '学生端问答',
        eyebrow: '体验入口',
        href: '/xiaojiayuan',
        copy: '用真实校园问题触发 RAG 回答、来源展示和反馈记录。',
        icon: MessageSquareText,
    },
    {
        title: '知识来源',
        eyebrow: '内容底座',
        href: '/docs/academics/',
        copy: '把办事流程、学业规则和同学经验整理成可检索内容。',
        icon: FileSearch,
    },
    {
        title: '运营看板',
        eyebrow: '复盘入口',
        href: '/ops',
        copy: '追踪弱命中、负反馈和知识缺口，决定下一轮补什么。',
        icon: BarChart3,
    },
];

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

const ProductEntryCard: React.FC<{ entry: ProductEntry }> = ({ entry }) => {
    const Icon = entry.icon;

    return (
        <Link className={styles.entryCard} to={entry.href}>
            <div className={styles.entryIcon} aria-hidden="true">
                <Icon size={18} strokeWidth={1.8} />
            </div>
            <div>
                <span>{entry.eyebrow}</span>
                <h3>{entry.title}</h3>
                <p>{entry.copy}</p>
            </div>
            <ChevronRight size={16} strokeWidth={1.8} aria-hidden="true" />
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
                    <p className={styles.eyebrow}>AI 产品运营项目 · 南昌大学校园知识助手</p>
                    <h1 className={styles.heroTitle}>把校园信息问清楚</h1>
                    <p className={styles.heroCopy}>学生问得到答案，运营看得到缺口，内容能回流到知识库。</p>
                    <AskComposer />
                </section>

                <section className={styles.homeEntrySection} aria-label="项目核心入口">
                    <SectionHeader title="从提问到运营" />
                    <div className={styles.entryGrid}>
                        {productEntries.map((entry) => (
                            <ProductEntryCard key={entry.title} entry={entry} />
                        ))}
                    </div>
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
