import React from 'react';
import Layout from '@theme/Layout';
import { GraduationCap, BookOpen, ArrowRightLeft, Calculator, Home as HomeIcon, TrendingUp, Search } from 'lucide-react';
import { FeatureCard, FeatureGrid } from '../components/FeatureCard';
import styles from '../css/HomepageContent.module.css';

function HomepageHeader() {
    return (
        <div className={styles.heroSection}>
            <div className={styles.eyebrow}>Est. 2024 • Unofficial</div>
            <h1 className={styles.mainTitle}>南昌大学生存手册</h1>
            <p className={styles.subtitle}>
                一份全面且不权威的校园生存攻略。<br className="hidden md:block" />
                从宿舍网络配置指南到各食补给站评测，助你在校园里如鱼得水。
            </p>

            <div className={styles.actionButtons}>
                <a href="/docs/study/freshmen-guide" className={styles.primaryButton}>
                    Start Here: Freshman Guide
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                </a>
                <a href="/docs/life/" className={styles.secondaryButton}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21 3 6"></polygon><line x1="9" y1="3" x2="9" y2="18"></line><line x1="15" y1="6" x2="15" y2="21"></line></svg>
                    Explore Campus Map
                </a>
            </div>
        </div>
    );
}

function HomepageSearch() {
    return (
        <div className={styles.searchModule}>
            <div className={styles.searchContainer} onClick={() => (document.querySelector('.navbar__search-input') as HTMLElement)?.focus?.()}>
                <div className={styles.searchIcon}>
                    <Search size={24} />
                </div>
                <input type="text" className={styles.searchInput} placeholder="Search for 'canteen', 'exams', 'wifi'..." readOnly />
                <div className={styles.searchShortcut}>
                    <span className={styles.shortcutKey}>⌘K</span>
                </div>
            </div>
        </div>
    );
}

function HomepageCards() {
    return (
        <FeatureGrid>
            <FeatureCard
                title="新生指南"
                description="报到、军训、选课、防诈骗，这大概是最有用的一集。"
                to="/docs/study/freshmen-guide"
                icon={GraduationCap}
            />
            <FeatureCard
                title="选课攻略"
                description="如何在一秒之内抢到你想要的通识课？培养方案里面有什么秘密武器。"
                to="/docs/study/class-cadre"
                icon={BookOpen}
            />
            <FeatureCard
                title="转专业"
                description="条件、流程、时间节点，早知道早准备，不走弯路。"
                to="/docs/study/major-change"
                icon={ArrowRightLeft}
            />
            <FeatureCard
                title="绩点与学分"
                description="解析 GPA 计算奥义，如何高效获取综测与二课分。"
                to="/docs/study/credits-gpa"
                icon={Calculator}
            />
            <FeatureCard
                title="校园生活"
                description="宿舍环境、三大食堂、交通换乘指南、校园网配置。"
                to="/docs/life/"
                icon={HomeIcon}
            />
            <FeatureCard
                title="升学就业"
                description="保研边缘人如何自救？考研和秋招的残酷真相。"
                to="/docs/study/postgraduate"
                icon={TrendingUp}
            />
        </FeatureGrid>
    );
}

function HomepageFooter() {
    return (
        <div style={{ marginTop: '100px', paddingBottom: '40px', paddingTop: '40px', borderTop: '1px solid var(--ifm-color-emphasis-200)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: 'var(--ifm-color-emphasis-500)', fontSize: '0.875rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'Playfair Display, serif, var(--ifm-font-family-base)', fontWeight: 700, fontSize: '1.125rem', color: 'var(--ifm-font-color-base)' }}>
                NCU Manual
                <span style={{ fontFamily: 'var(--ifm-font-family-base)', fontSize: '0.75rem', fontWeight: 500, padding: '2px 6px', background: 'var(--ifm-color-emphasis-100)', borderRadius: '2px', color: 'var(--ifm-color-emphasis-600)' }}>BETA</span>
            </div>
            <div style={{ textAlign: 'center' }}>
                An open-source initiative maintained by NCUHOME.<br />
                Not officially affiliated with Nanchang University.
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', alignItems: 'center' }}>
                <a href="https://github.com/NCUHOME/ncubook" target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>参与贡献</a>
                <div style={{ width: '1px', height: '16px', backgroundColor: 'var(--ifm-color-emphasis-300)' }}></div>
                <a href="/docs/about" style={{ color: 'inherit' }}>关于本手册</a>
            </div>
        </div>
    );
}

export default function Home() {
    return (
        <Layout
            title="首页"
            description="南昌大学生存手册 | For NCUer"
            wrapperClassName="homepage-wrapper">
            <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 1rem', width: '100%' }}>
                <HomepageHeader />
                <HomepageSearch />
                <HomepageCards />
                <HomepageFooter />
            </main>
        </Layout>
    );
}
