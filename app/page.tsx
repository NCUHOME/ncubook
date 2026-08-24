// 首页路由：南大家园核心模块风格首页 RSC（结合 Hero 引言、胶囊复合搜索栏、公告卡、双列动态目录、贡献与页脚）
import Link from "next/link";
import { loadPublishedRepository } from "@/lib/content/server";
import { getAllSiteConfigs } from "@/lib/content/site-config";
import { AppHeader } from "@/src/components/primitives/header";
import { CompositeSearch } from "@/src/components/ask/composite-search";
import { ContributeCard } from "@/src/components/home/contribute-card";
import { getSiteUrl } from "@/lib/site";
import type { SectionSummary } from "@/src/components/primitives/drawer";

export const revalidate = 3600;

export default async function HomePage() {
  let sections: import("@/lib/content/schema").Page[] = [];
  let routes: Record<string, string> = {};
  let allSections: SectionSummary[] = [];

  // 读取全站配置
  const siteConfigs = await getAllSiteConfigs();
  const noticeConfig = siteConfigs.home_notice;
  const contributeConfig = siteConfigs.home_contribute;
  const heroConfig = siteConfigs.home_hero;
  const footerConfig = siteConfigs.footer_config;

  try {
    const repository = await loadPublishedRepository();
    const rawSections = await repository.getPublishedSections();
    routes = await repository.getPageRoutes();

    // 严格过滤归档与辅助页面，确保目录网格纯净展示 6 大标准板块
    sections = rawSections.filter(
      (s) =>
        !s.title.includes("归档") &&
        !s.title.includes("未改编") &&
        !s.title.includes("贡献者")
    );

    // 组装全部板块与各板块篇目树
    allSections = await Promise.all(
      sections.map(async (sec) => {
        const tree = await repository.getSectionTree(sec.slug);
        const children = await repository.getSectionChildren(sec.slug);
        const count = children.length > 0 ? children.length : 1;
        const effectiveTree =
          tree.length > 0
            ? tree
            : [
                {
                  id: sec.id,
                  title: sec.title,
                  slug: sec.slug,
                  href: routes[sec.id] || `/sections/${sec.slug}`,
                  children: [],
                },
              ];
        return {
          id: sec.id,
          title: sec.title,
          slug: sec.slug,
          count,
          tree: effectiveTree,
        };
      }),
    );
  } catch {
    // 允许在初次构建或尚未同步发版时安全降级
  }

  const siteUrl = getSiteUrl();
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    name: "此间 - 南昌大学校园知识库",
    url: siteUrl,
    description: "面向手机端的南昌大学 AI 校园知识产品与可追溯问答助手",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteUrl}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
    inLanguage: "zh-CN",
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-shell">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <AppHeader variant="home" allSections={allSections} />

      <main className="px-s5 pb-home">
        {/* 1. 主标语与人文引言 */}
        <section className="pt-s5" aria-label="欢迎标语">
          <h1
            className="text-display font-semibold leading-heading text-ink"
            dangerouslySetInnerHTML={{ __html: heroConfig.title || "校园里的事<br>在此问明白" }}
          />
          <blockquote className="mt-s3 border-l border-ink pl-notice">
            <p className="text-quote leading-body text-ink-sub">{heroConfig.quote}</p>
          </blockquote>
        </section>

        {/* 2. 胶囊复合搜索栏（左搜词条、右问小家园） */}
        <section className="mt-hero" aria-label="搜索与提问">
          <CompositeSearch />
        </section>

        {/* 3. 手册公告栏 */}
        {noticeConfig && (
          <section className="mt-notice" aria-label="手册公告">
            <div className="rounded-r-small border-l-3 border-brand bg-surface-subtle px-notice py-s3">
              <div className="flex items-baseline justify-between">
                <span className="text-body font-semibold text-ink">{noticeConfig.title || "公告"}</span>
                {noticeConfig.date && <span className="font-sans text-caption text-muted">{noticeConfig.date}</span>}
              </div>
              {noticeConfig.desc && <p className="mt-compact text-label leading-body text-ink">{noticeConfig.desc}</p>}
              {noticeConfig.links && noticeConfig.links.length > 0 && (
                <ul className="prototype-home-notice-links mt-compact flex list-disc flex-col pl-s4 text-label leading-body text-ink">
                  {noticeConfig.links.map((link, idx) => (
                    <li key={idx}>
                      {idx === 0 ? "请每个新生先观看 " : null}
                      <Link href={routes[link.slug] || `/docs/${link.slug}`} className="text-brand font-medium">
                        {link.text}
                      </Link>
                      {idx === 0 ? "。" : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}

        {/* 4. 动态板块目录网格 */}
        <section className="mt-s6" aria-labelledby="home-dir-title">
          <div>
            <h2 id="home-dir-title" className="text-title font-semibold text-ink">
              目录
            </h2>
          </div>

          <div className="mt-control grid grid-cols-2 gap-x-grid border-t-2 border-ink">
            {allSections.map((sec) => (
              <Link
                key={sec.id}
                href={routes[sec.id] || (sec.tree?.[0]?.href ?? `/sections/${sec.slug}`)}
                className="focus-ring flex items-baseline border-b border-line py-notice text-ink"
              >
                <span className="text-body-large font-semibold">
                  {sec.title}
                </span>
              </Link>
            ))}
          </div>
          <p className="mt-s2 text-footnote leading-compact text-muted" aria-hidden="true"><br /></p>
        </section>

        {/* 5. 完善手册联系区域 */}
        <ContributeCard
          email={contributeConfig.email}
          qqGroup={contributeConfig.qq_group}
          desc={contributeConfig.desc}
        />

        {/* 6. 页脚致谢与声明 */}
        <footer className="mt-footer border-t border-line pt-s3 font-sans text-caption leading-relaxed text-muted">
          <div className="footer-label-value grid items-baseline gap-x-notice">
            <span>致谢</span>
            <p>{footerConfig.thankPrefix || "感谢所有参与编写与完善本手册的同学。"}</p>
            <span>声明</span>
            <span>{footerConfig.disclaimer}</span>
            <span>友联</span>
            <a href="https://ncuos.com" target="_blank" rel="noreferrer" className="text-brand">
              家园工作室
            </a>
          </div>
        </footer>
      </main>

    </div>
  );
}
