// 校园知识文档阅读页路由：静态 SSG/ISR 生成 (/docs/[slug])，配置 1小时增量刷新，直连领域渲染组件
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { loadPublishedRepository, type PageTreeNode } from "@/lib/content/server";
import { ArticleRenderer } from "@/src/components/article/renderer";
import { ArticleFeedbackRow } from "@/src/components/article/feedback-row";
import { DocumentAskEntry } from "@/src/components/ask/entry";
import { AppHeader } from "@/src/components/primitives/header";

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
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
    const description = `南昌大学 AI 知识库 · ${view.page.title}`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "article",
        siteName: "此间",
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

  const breadcrumb = `${section.title} · ${currentIdx >= 0 ? currentIdx + 1 : 1} / ${totalCount}`;

  return (
    <div className="mx-auto min-h-screen w-full max-w-shell">
      <AppHeader
        variant="doc"
        title={view.page.title}
        breadcrumb={breadcrumb}
        backHref="/"
        sectionTitle={section.title}
        sectionTree={tree}
        allSections={allSections}
        currentPageId={view.page.id}
      />

      <main className="px-s5 pb-s7 pt-s4">
        <article className="min-h-full">
          <h1 className="text-heading font-semibold text-ink leading-heading">{view.page.title}</h1>
          <div className="mt-s2 pb-s4 border-b border-line text-caption text-muted">
            {section.title} · 更新于 {formatDate(view.page.lastPublishedAt)}
          </div>

          <div className="pt-s4 space-y-s4">
            <ArticleRenderer blocks={view.blocks} getAsset={getAsset} resolvePageRoute={resolvePageRoute} />
          </div>

          {/* 下一篇推荐卡片 */}
          {nextNode && (
            <Link
              href={nextNode.href}
              className="focus-ring mt-s7 flex items-center justify-between rounded-medium border border-line-mid p-s4 hover:border-brand hover:bg-brand-tint transition-all group"
            >
              <div>
                <span className="text-caption text-muted">
                  下一篇 · {currentIdx + 2} / {totalCount}
                </span>
                <div className="text-body font-semibold text-ink group-hover:text-brand transition-colors mt-s1">
                  {nextNode.title}
                </div>
              </div>
              <ChevronRight className="size-icon text-brand group-hover:translate-x-1 transition-transform" />
            </Link>
          )}

          {/* 本文反馈 */}
          <ArticleFeedbackRow slug={view.page.slug} pageTitle={view.page.title} />
        </article>
      </main>

      <DocumentAskEntry
        pageId={view.page.id}
        initialAnchor={view.blocks.find((block) => block.type === "heading")?.anchor}
      />
    </div>
  );
}

export async function generateStaticParams() {
  try {
    const repository = await loadPublishedRepository();
    const routes = await repository.getPageRoutes();
    return Object.keys(routes).map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

function formatDate(isoDate: string | null | undefined): string {
  if (!isoDate) return "2026 年 8 月";
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "2026 年 8 月";
  return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日`;
}
