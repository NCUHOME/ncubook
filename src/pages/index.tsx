import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import styles from '../css/HomepageContent.module.css';

function openAiChat(query?: string) {
    window.dispatchEvent(new CustomEvent('open-ai-chat', { detail: query ? { query } : {} }));
}

const quickQuestions = [
    '学分绩点怎么算',
    '转专业怎么申请',
    '校园报修去哪',
    '常用电话在哪看',
] as const;

const featuredGuides = [
    {
        index: '01',
        title: '学业',
        href: '/docs/academics/',
        listTitle: '核心目录',
        items: ['学分绩点计算细则', '跨院系转专业指南', '缓考与补考申请'],
        asideTitle: '最近更新',
        asideText: '2024 版培养方案调整说明已同步至资料库。',
    },
    {
        index: '02',
        title: '生活',
        href: '/docs/campus-life/',
        listTitle: '核心目录',
        items: ['校园网与公共设施报修', '学生证与各类证明补办', '勤工助学岗位申请'],
        asideTitle: '温馨提示',
        asideText: '教务大厅已启用无纸化办公，优先通过线上渠道提交申请。',
    },
] as const;

const momentThreads = [
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

const contributeCards = [
    {
        label: 'Draft / 需要校对',
        title: '2024 转专业政策变动',
        description: '目前词条只覆盖理工类学院，文史类学院的加试要求还缺失。',
        href: '/docs/contributors/contributing',
    },
    {
        label: 'Gap / 发现空白',
        title: '历届优秀毕业论文存档',
        description: '教务系统未公开 2020 年以前的摘要，是否还有可补充的备份。',
        href: '/docs/contributors/contributing',
    },
    {
        label: 'Fix / 信息过时',
        title: '校园卡充值网点分布',
        description: '西区二舍充值点已撤除，需要确认新的自助充值机位置。',
        href: '/docs/contributors/contributing',
    },
    {
        label: 'Co-build / 共同创建',
        title: '校园内流浪猫观察日志',
        description: '更新投喂点、绝育情况和友善互动指南，补齐公共经验。',
        href: '/docs/contributors/',
    },
] as const;

function HeroSection() {
    return (
        <section className={styles.heroSection}>
            <div className={styles.heroCopy}>
                <h1 className={styles.heroTitle}>此间</h1>
                <p className={styles.heroTagline}>让信息回到真实，也回到人。</p>
            </div>
        </section>
    );
}

function AskSection() {
    const [query, setQuery] = React.useState('');

    const submit = () => {
        const trimmed = query.trim();

        if (!trimmed) {
            return;
        }

        openAiChat(trimmed);
        setQuery('');
    };

    return (
        <section className={styles.askSection}>
            <div className={styles.askField}>
                <input
                    type="text"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            submit();
                        }
                    }}
                    className={styles.askInput}
                    placeholder="不知道从哪里开始，就先问"
                />
                <button type="button" className={styles.askButton} onClick={submit} aria-label="向此间提问">
                    <ArrowRight size={28} strokeWidth={1.8} />
                </button>
            </div>
            <div className={styles.quickQuestionRow}>
                {quickQuestions.map((question) => (
                    <button
                        key={question}
                        type="button"
                        className={styles.quickQuestion}
                        onClick={() => openAiChat(question)}
                    >
                        {question}
                    </button>
                ))}
            </div>
        </section>
    );
}

function SectionHeading({
    title,
    label,
}: {
    title: string;
    label: string;
}) {
    return (
        <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{title}</h2>
            <span className={styles.sectionLabel}>{label}</span>
        </div>
    );
}

function FeaturedSection() {
    return (
        <section className={styles.section}>
            <SectionHeading title="精选指南" label="Curated Archives" />
            <div className={styles.featuredGrid}>
                {featuredGuides.map((guide) => (
                    <article key={guide.title} className={styles.featureCard}>
                        <div className={styles.featureIntro}>
                            <span className={styles.featureIndex}>Section / {guide.index}</span>
                            <h3 className={styles.featureTitle}>{guide.title}</h3>
                        </div>
                        <div className={styles.featureBody}>
                            <div>
                                <p className={styles.featureBodyTitle}>{guide.listTitle}</p>
                                <ul className={styles.featureList}>
                                    {guide.items.map((item) => (
                                        <li key={item}>{item}</li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                <p className={styles.featureBodyTitle}>{guide.asideTitle}</p>
                                <p className={styles.featureAside}>{guide.asideText}</p>
                            </div>
                        </div>
                        <Link className={styles.textLink} to={guide.href}>
                            Read Archive
                        </Link>
                    </article>
                ))}
            </div>
        </section>
    );
}

function MomentSection() {
    const featureImage = useBaseUrl('/img/homepage/moment-feature.png');

    return (
        <section className={styles.section}>
            <SectionHeading title="此刻正在发生的" label="Live Stream" />
            <div className={styles.splitSection}>
                <div className={styles.mediaColumn}>
                    <div className={styles.imageFrame}>
                        <img src={featureImage} alt="此刻栏目配图" className={styles.featureImage} />
                    </div>
                    <div className={styles.mediaTextBlock}>
                        <p className={styles.quote}>
                            “流动的校园记忆与实时资讯。当信息仍在演化，当经历正在发生，这里是记录流动的现场。”
                        </p>
                        <Link className={styles.inlineLink} to="/moment">
                            查看此刻
                            <ArrowUpRight size={14} />
                        </Link>
                    </div>
                </div>
                <div className={styles.threadList}>
                    {momentThreads.map((thread) => (
                        <Link key={thread.title} className={styles.threadItem} to="/moment">
                            <div className={styles.threadMetaRow}>
                                <span className={styles.threadLabel}>{thread.label}</span>
                                <span className={styles.threadCount}>{thread.meta}</span>
                            </div>
                            <h3 className={styles.threadTitle}>{thread.title}</h3>
                            <p className={styles.threadDescription}>{thread.description}</p>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}

function ContributeSection() {
    const featureImage = useBaseUrl('/img/homepage/contribute-feature.png');

    return (
        <section className={styles.section}>
            <SectionHeading title="校订与补白" label="Collaborative Edit" />
            <div className={styles.splitSection}>
                <div className={styles.contributeGrid}>
                    {contributeCards.map((card) => (
                        <Link key={card.title} className={styles.contributeCard} to={card.href}>
                            <span className={styles.contributeLabel}>{card.label}</span>
                            <h3 className={styles.contributeTitle}>{card.title}</h3>
                            <p className={styles.contributeDescription}>{card.description}</p>
                            <span className={styles.contributeAction}>CONTRIBUTE →</span>
                        </Link>
                    ))}
                </div>
                <div className={styles.mediaColumn}>
                    <div className={styles.imageFrame}>
                        <img src={featureImage} alt="共建栏目配图" className={styles.featureImage} />
                    </div>
                    <div className={styles.mediaTextBlock}>
                        <p className={styles.quote}>
                            “信息的准确并非一蹴而就，我们邀请每一位知情者，参与到这份流动的校园数字史志的共建中。”
                        </p>
                        <Link className={styles.primaryCta} to="/docs/contributors/contributing">
                            开始撰写补白
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default function Home() {
    return (
        <Layout title="此间" description="此间｜南大的信息、经验与提问入口" wrapperClassName="homepage-wrapper">
            <main className={styles.homepage}>
                <HeroSection />
                <AskSection />
                <FeaturedSection />
                <MomentSection />
                <ContributeSection />
            </main>
        </Layout>
    );
}
