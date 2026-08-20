// 首页路由：南大家园核心模块风格首页 RSC（结合 Hero 引言、胶囊复合搜索栏、公告卡、双列动态目录、贡献与页脚）
import Link from "next/link";
import { loadPublishedRepository } from "@/lib/content/server";
import { getAllSiteConfigs } from "@/lib/content/site-config";
import { AppHeader } from "@/src/components/primitives/header";
import { CompositeSearch } from "@/src/components/ask/composite-search";
import { ContributeCard } from "@/src/components/home/contribute-card";
import { FloatingAskButton } from "@/src/components/ask/button";
import { getSiteUrl } from "@/lib/site";
import type { SectionSummary } from "@/src/components/primitives/drawer";

export default async function HomePage() {
  let sections: import("@/lib/content/schema").Page[] = [];
  let routes: Record<string, string> = {};
  let allSections: SectionSummary[] = [];
  let totalArticlesCount = 0;

  // 读取全站配置
  const siteConfigs = await getAllSiteConfigs();
  const noticeConfig = siteConfigs.home_notice;
  const contributeConfig = siteConfigs.home_contribute;
  const heroConfig = siteConfigs.home_hero;
  const footerConfig = siteConfigs.footer_config;

  let contributorHref: string | null = null;
  let contributorNames: string | null = null;

  try {
    const repository = await loadPublishedRepository();
    const rawSections = await repository.getPublishedSections();

    // 提取 Notion 贡献者页面与名单信息融入底部致谢
    const contributorSection = rawSections.find((s) => s.title.includes("贡献者"));
    routes = await repository.getPageRoutes();

    if (contributorSection) {
      contributorHref = routes[contributorSection.id] || `/docs/${contributorSection.slug}`;
      try {
        const cView = await repository.getDocumentView(contributorSection.slug);
        if (cView && cView.blocks.length > 0) {
          const names: string[] = [];
          for (const b of cView.blocks) {
            if ("richText" in b && Array.isArray(b.richText)) {
              const str = b.richText.map((r) => r.plainText).join("").trim();
              if (str && !str.includes("贡献者") && str.length < 200) {
                names.push(str);
              }
            } else if (b.type === "bulleted-list" && "items" in b && Array.isArray(b.items)) {
              for (const it of b.items) {
                const str = it.richText.map((r) => r.plainText).join("").trim();
                if (str) names.push(str);
              }
            }
          }
          if (names.length > 0) {
            contributorNames = names.slice(0, 10).join("、");
          }
        }
      } catch {
        // 安全降级
      }
    }

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
        totalArticlesCount += count;
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

      <main className="px-s5 pb-s7 pt-s5 space-y-s6">
        {/* 1. 主标语与人文引言 */}
        <section className="space-y-s3" aria-label="欢迎标语">
          <h1
            className="text-display font-semibold text-ink leading-heading"
            dangerouslySetInnerHTML={{ __html: heroConfig.title || "校园里的事<br>在此问明白" }}
          />
          <blockquote className="border-l-[1.5px] border-ink pl-s3 py-0.5">
            <p className="text-body leading-body text-ink-sub">{heroConfig.quote}</p>
          </blockquote>
        </section>

        {/* 2. 胶囊复合搜索栏（左搜词条、右问小家园） */}
        <section aria-label="搜索与提问">
          <CompositeSearch />
        </section>

        {/* 3. 手册公告栏 */}
        {noticeConfig && (
          <section aria-label="手册公告">
            <div className="rounded-r-small border-l-[3px] border-brand bg-surface-subtle p-s4 space-y-s2">
              <div className="flex items-baseline justify-between">
                <span className="text-body font-semibold text-ink">{noticeConfig.title || "公告"}</span>
                {noticeConfig.date && <span className="text-caption text-muted">{noticeConfig.date}</span>}
              </div>
              {noticeConfig.desc && <p className="text-body leading-body text-ink-body">{noticeConfig.desc}</p>}
              {noticeConfig.links && noticeConfig.links.length > 0 && (
                <ul className="list-disc pl-s4 text-body leading-body text-ink-body space-y-s1">
                  {noticeConfig.links.map((link, idx) => (
                    <li key={idx}>
                      请先查阅{" "}
                      <Link href={routes[link.slug] || `/docs/${link.slug}`} className="text-brand font-medium hover:underline">
                        {link.text}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}

        {/* 4. 动态板块目录网格 */}
        <section aria-labelledby="home-dir-title">
          <div className="flex items-baseline justify-between pb-s2">
            <h2 id="home-dir-title" className="text-title font-semibold text-ink">
              目录
            </h2>
            <span className="text-caption text-muted">
              {allSections.length} 个板块{totalArticlesCount > 0 ? ` · ${totalArticlesCount} 篇` : ""}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-s6 border-t-[1.5px] border-ink divide-y divide-line">
            {allSections.map((sec) => (
              <Link
                key={sec.id}
                href={routes[sec.id] || (sec.tree?.[0]?.href ?? `/sections/${sec.slug}`)}
                className="focus-ring flex min-h-tap items-baseline justify-between py-s3 text-ink hover:text-brand transition-colors group"
              >
                <span className="text-body-large font-semibold group-hover:text-brand transition-colors">
                  {sec.title}
                </span>
                {sec.count ? <span className="text-caption text-muted">{sec.count}</span> : null}
              </Link>
            ))}
          </div>
        </section>

        {/* 5. 完善手册联系区域 */}
        <ContributeCard
          email={contributeConfig.email}
          qqGroup={contributeConfig.qq_group}
          desc={contributeConfig.desc}
        />

        {/* 6. 页脚致谢与声明 */}
        <footer className="border-t border-line pt-s4 pb-s7 text-caption text-muted space-y-s2">
          <div className="grid grid-cols-[auto_1fr] gap-x-s4 gap-y-s2 leading-body">
            <span className="font-semibold text-ink-sub">致谢</span>
            <div className="space-y-s1">
              <p>
                {(footerConfig.thankPrefix || "感谢所有参与编写与完善本手册的同学")
                  .replace(/[（(]\s*查看.*?贡献者名单\s*[）)]/g, "")
                  .replace(/。$/, "")
                  .trim()}
                {contributorNames ? `：${contributorNames} 等` : ""}
                （
                <Link
                  href={contributorHref || "/docs/gongxianzhe"}
                  className="text-brand font-semibold hover:underline"
                  style={{ color: "var(--brand-blue)" }}
                >
                  查看完整贡献者名单
                </Link>
                ）
                。
              </p>
            </div>
            <span className="font-semibold text-ink-sub">声明</span>
            <span>{footerConfig.disclaimer}</span>
          </div>
        </footer>
      </main>

      {/* 固定在右下角的 50px 小家园 AI 悬浮入口 */}
      <FloatingAskButton />
    </div>
  );
}
