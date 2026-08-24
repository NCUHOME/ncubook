// 校园知识文档阅读页路由：静态 SSG/ISR 生成 (/docs/[slug])，配置 1小时增量刷新，直连领域渲染组件
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { loadPublishedRepository, type PageTreeNode } from "@/lib/content/server";
import { adaptFreshmanBlocksToPrototype } from "@/lib/content/freshman-prototype";
import { ArticleRenderer } from "@/src/components/article/renderer";
import { ArticleFeedbackRow } from "@/src/components/article/feedback-row";
import { DocumentAskEntry } from "@/src/components/ask/entry";
import { AppHeader } from "@/src/components/primitives/header";

import { getSiteUrl } from "@/lib/site";

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const siteUrl = getSiteUrl();
  const ogImageUrl = `${siteUrl}/opengraph-image`;
  const pageUrl = `${siteUrl}/docs/${slug}`;

  try {
    const repository = await loadPublishedRepository();
    const view = await repository.getDocumentView(slug);
    if (!view) {
      if (slug === "why" || slug === "about") return { title: "写在前面 - 校园指南 · 此间" };
      if (slug === "gongxianzhe" || slug === "contributors") return { title: "贡献者名单 - 校园指南 · 此间" };
      if (slug === "xinsheng" || slug === "freshman") return { title: "新生指南 - 校园指南 · 此间" };
      return { title: "校园指南 - 此间" };
    }
    const section = await repository.getSectionForPage(view.page.id);

    const title = `${view.page.title} - ${section?.title ?? "校园知识"} · 此间`;

    // 智能提取正文前 120 字作为精简摘要
    let excerpt = "";
    for (const b of view.blocks) {
      if ("richText" in b && Array.isArray(b.richText)) {
        const text = b.richText.map((r) => r.plainText).join("").trim();
        if (text && text.length > 3) {
          excerpt += (excerpt ? " " : "") + text;
          if (excerpt.length >= 120) break;
        }
      }
    }
    const description = excerpt
      ? excerpt.length > 130
        ? `${excerpt.slice(0, 125)}...`
        : excerpt
      : `南昌大学 AI 知识库 · ${view.page.title}`;

    return {
      title,
      description,
      alternates: {
        canonical: pageUrl,
      },
      openGraph: {
        title,
        description,
        type: "article",
        url: pageUrl,
        siteName: "此间",
        locale: "zh_CN",
        images: [
          {
            url: ogImageUrl,
            width: 1200,
            height: 630,
            alt: title,
            type: "image/png",
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [ogImageUrl],
      },
    };
  } catch {
    return { title: "校园指南 - 此间" };
  }
}

export default async function DocumentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let view: import("@/lib/content/server").DocumentView | null = null;
  let section: import("@/lib/content/schema").Page | null = null;
  let tree: PageTreeNode[] = [];
  let allSections: import("@/src/components/primitives/drawer").SectionSummary[] = [];
  let routes: Record<string, string> = {};
  let repository: import("@/lib/content/server").ContentRepository | null = null;

  try {
    const repo = await loadPublishedRepository();
    repository = repo;
    view = await repo.getDocumentView(slug);
    if (!view) {
      // 智能别名重定向
      const rawSections = await repo.getPublishedSections();
      if (slug === "why" || slug === "about") {
        const intro = rawSections.find((s) => s.title.includes("写在前面") || s.title.includes("关于"));
        if (intro) redirect(`/sections/${intro.slug}`);
      }
      if (slug === "gongxianzhe" || slug === "contributors") {
        const contrib = rawSections.find((s) => s.title.includes("贡献者"));
        if (contrib) redirect(`/sections/${contrib.slug}`);
      }
      if (slug === "xinsheng" || slug === "freshman") {
        const learn = rawSections.find((s) => s.title.includes("学习") || s.title.includes("基本认识"));
        if (learn) redirect(`/sections/${learn.slug}`);
        if (rawSections[0]) redirect(`/sections/${rawSections[0].slug}`);
      }
      notFound();
    }

    if (view.page.parentId === null) {
      section = view.page;
    } else {
      section = (await repo.getSectionForPage(view.page.id)) || view.page;
    }

    tree = await repo.getSectionTree(section.slug);
    if (tree.length === 0) {
      tree = [
        {
          id: view.page.id,
          title: view.page.title,
          href: `/docs/${view.page.slug}`,
          children: [],
        },
      ];
    }
    routes = await repo.getPageRoutes();

    const rawSections = await repo.getPublishedSections();
    const cleanSections = rawSections.filter(
      (s) =>
        !s.title.includes("归档") &&
        !s.title.includes("未改编") &&
        !s.title.includes("贡献者")
    );
    allSections = await Promise.all(
      cleanSections.map(async (sec) => {
        const secTree = await repo.getSectionTree(sec.slug);
        const children = await repo.getSectionChildren(sec.slug);
        const count = children.length > 0 ? children.length : 1;
        const effectiveTree =
          secTree.length > 0
            ? secTree
            : [
                {
                  id: sec.id,
                  title: sec.title,
                  href: `/docs/${sec.slug}`,
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
      })
    );
  } catch {
    notFound();
  }

  if (!view || !section || !repository) {
    notFound();
  }
  const assetMap = new Map((view.assets ?? []).map((a) => [a.id, a]));
  const getAsset = (assetId: string) => assetMap.get(assetId) ?? null;
  const resolvePageRoute = (pageId: string) => routes[pageId] || repository.resolvePageRoute(pageId);
  const articleBlocks = slug === "xinsheng" ? adaptFreshmanBlocksToPrototype(view.blocks) : view.blocks;

  // 计算当前文章在板块篇目树中的位置与下一篇
  const flattenedNodes: PageTreeNode[] = [];
  const flatten = (nodes: PageTreeNode[]) => {
    for (const n of nodes) {
      flattenedNodes.push(n);
      if (n.children && n.children.length > 0) flatten(n.children);
    }
  };
  flatten(tree);

  const currentIdx = flattenedNodes.findIndex((n) => n.id === view?.page.id);
  const totalCount = flattenedNodes.length > 0 ? flattenedNodes.length : 1;
  const nextNode = currentIdx >= 0 && currentIdx + 1 < flattenedNodes.length ? flattenedNodes[currentIdx + 1] : null;

  const siteUrl = getSiteUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${siteUrl}/docs/${slug}#article`,
        isPartOf: {
          "@type": "WebSite",
          "@id": `${siteUrl}/#website`,
          name: "此间 - 南昌大学校园知识库",
          url: siteUrl,
        },
        headline: view.page.title,
        dateModified: view.page.lastPublishedAt ?? new Date().toISOString(),
        publisher: {
          "@type": "Organization",
          name: "南大家园",
          url: "https://ncuos.com",
        },
        inLanguage: "zh-CN",
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${siteUrl}/docs/${slug}#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "首页",
            item: siteUrl,
          },
          ...(section
            ? [
                {
                  "@type": "ListItem",
                  position: 2,
                  name: section.title,
                  item: `${siteUrl}/sections/${section.slug}`,
                },
              ]
            : []),
          {
            "@type": "ListItem",
            position: section ? 3 : 2,
            name: view.page.title,
            item: `${siteUrl}/docs/${slug}`,
          },
        ],
      },
    ],
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-shell">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <AppHeader
        variant="doc"
        title={view.page.title}
        backHref="/"
        sectionTitle={section.title}
        sectionTree={tree}
        allSections={allSections}
        currentPageId={view.page.id}
        progress={((currentIdx >= 0 ? currentIdx + 1 : 1) / totalCount) * 100}
      />

      <main className="px-s5 pb-article-bottom pt-hero">
        <article className="min-h-full">
          <h1 className="text-heading font-semibold leading-heading text-ink">{view.page.title}</h1>
          <div className="mt-s2 font-sans text-caption tracking-wide text-muted">
            {formatDocumentMeta(section.title, view.page.slug, view.page.lastPublishedAt)}
          </div>

          <div className="mt-s4">
            {slug === "xinsheng" ? (
              <>
                <FreshmanContents blocks={articleBlocks} />
                <div className="mt-section-lead">
                  <ArticleRenderer blocks={articleBlocks} getAsset={getAsset} resolvePageRoute={resolvePageRoute} />
                </div>
              </>
            ) : (
              <ArticleRenderer blocks={articleBlocks} getAsset={getAsset} resolvePageRoute={resolvePageRoute} />
            )}
          </div>

          {/* 下一篇推荐卡片 */}
          {nextNode && (
            <Link
              href={nextNode.href}
              className="focus-ring mt-next flex items-center gap-control overflow-hidden rounded-medium border border-line px-notice py-control text-ink"
            >
              <div className="min-w-0 flex-1">
                <span className="font-sans text-caption text-muted">
                  下一篇 · {currentIdx + 2} / {totalCount}
                </span>
                <div className="text-body font-semibold text-ink">
                  {nextNode.title}
                </div>
              </div>
              <ChevronRight className="size-icon-next shrink-0 text-brand" />
            </Link>
          )}

          {/* 本文反馈 */}
          <ArticleFeedbackRow slug={view.page.slug} pageTitle={view.page.title} />
        </article>
      </main>

      <DocumentAskEntry
        pageId={view.page.id}
        pageTitle={view.page.title}
        initialAnchor={articleBlocks.find((block) => block.type === "heading")?.anchor}
      />
    </div>
  );
}

export async function generateStaticParams() {
  try {
    const repository = await loadPublishedRepository();
    const sections = await repository.getPublishedSections();
    const slugs = new Set<string>();

    for (const sec of sections) {
      slugs.add(sec.slug);
      const children = await repository.getSectionChildren(sec.slug);
      children.forEach((c) => slugs.add(c.slug));
    }

    return Array.from(slugs).map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

function formatPublishedMonth(isoDate: string | null | undefined): string | null {
  if (!isoDate) return null;
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月`;
}

function formatDocumentMeta(sectionTitle: string, slug: string, isoDate: string | null | undefined): string {
  const publishedMonth = formatPublishedMonth(isoDate);
  return [
    sectionTitle,
    publishedMonth ? `更新于 ${publishedMonth}` : null,
    slug === "xinsheng" ? "约 25 分钟" : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function FreshmanContents({ blocks }: { blocks: import("@/lib/content/schema").Block[] }) {
  const definitions = [
    ["一", "预防诈骗"],
    ["二", "新生报到"],
    ["三", "校历"],
    ["四", "校园地图"],
    ["五", "生活相关"],
    ["六", "学习相关"],
    ["七", "附言与致谢"],
  ] as const;
  const items = definitions.flatMap(([number, label]) => {
    const heading = blocks.find(
      (block) => block.type === "heading" && block.richText.map((part) => part.plainText).join("").includes(label.replace("与致谢", "")),
    );
    return heading ? [[number, label, heading.anchor] as const] : [];
  });

  return (
    <nav className="prototype-toc rounded-medium border border-line px-notice py-s3" aria-label="本页目录">
      <div className="font-sans text-micro font-semibold tracking-eyebrow text-eyebrow">本页目录</div>
      <div className="mt-compact grid grid-cols-2 gap-x-notice gap-y-0">
        {items.map(([number, label, anchor]) => (
          <a key={number} href={`#${anchor}`} className="flex items-baseline gap-compact py-toc-row text-small text-ink">
            <span className="font-mono text-toc-number font-normal text-brand">{number}</span>
            {label}
          </a>
        ))}
      </div>
    </nav>
  );
}
