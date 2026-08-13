// 单测：测试文档阅读页与板块导引页的面包屑、格式化更新时间、文章块树与自适应导航
import React from "react";
import { render, screen } from "@testing-library/react";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { describe, expect, it } from "vitest";
import {
  getAsset,
  getDocumentView,
  getSectionChildren,
  getSectionForPage,
  getSectionTree,
  getSectionView,
  resolvePageRoute,
} from "@/lib/content/repo";
import { AskProvider } from "@/src/context/ask";
import { ArticleRenderer } from "@/src/components/features/article/renderer";
import { DocumentAskEntry } from "@/src/components/features/ask/entry";
import { AppHeader } from "@/src/components/primitives/header";

describe("published page views", () => {
  it("renders a free-form section introduction followed by child documents", () => {
    const view = getSectionView("campus-life");
    if (!view) throw new Error("Section view 'campus-life' not found");

    const children = getSectionChildren("campus-life");
    const tree = getSectionTree("campus-life");
    const contentBlocks = view.blocks[0]?.type === "paragraph" ? view.blocks.slice(1) : view.blocks;

    render(
      <>
        <AppHeader title={view.page.title} backHref="/" sectionTitle={view.page.title} sectionTree={tree} currentPageId={view.page.id} />
        <main className="pb-s7">
          <section className="border-b border-line px-s5 py-s7">
            <p className="text-caption leading-ui tracking-widest text-muted">校园内容板块</p>
            <h1 className="mt-s3 font-display text-display leading-heading font-semibold">{view.page.title}</h1>
            <p className="mt-s4 max-w-prose font-body text-body leading-body text-muted">{view.description}</p>
          </section>
          {contentBlocks.length > 0 ? (
            <section className="px-s5 py-s6">
              <ArticleRenderer blocks={contentBlocks} getAsset={getAsset} resolvePageRoute={resolvePageRoute} />
            </section>
          ) : null}
          <section className="px-s5" aria-labelledby="section-pages-title">
            <div className="flex items-center justify-between border-b border-line pb-s3">
              <h2 id="section-pages-title" className="text-title leading-heading font-semibold">板块页面</h2>
              <span className="text-caption text-muted">{children.length} 篇</span>
            </div>
            {children.map((page) => (
              <Link key={page.id} href={resolvePageRoute(page.id)} className="focus-ring flex min-h-tap items-center justify-between border-b border-line py-s3 text-body">
                <span>{page.title}</span>
                <ChevronRight className="size-icon-small text-muted" strokeWidth={1.9} />
              </Link>
            ))}
          </section>
        </main>
      </>
    );

    expect(screen.getByRole("heading", { name: "校园生活", level: 1 })).toBeVisible();
    expect(screen.getByText(/从住宿、交通到日常服务/)).toBeVisible();
    expect(screen.getByRole("link", { name: /校园交通/ })).toHaveAttribute("href", "/docs/campus-transport");
  });

  it("renders a reader-first document with section navigation", () => {
    const view = getDocumentView("campus-shuttle");
    if (!view) throw new Error("Document view 'campus-shuttle' not found");

    const section = getSectionForPage(view.page.id);
    if (!section) throw new Error("Section for page 'campus-shuttle' not found");

    const tree = getSectionTree(section.slug);

    render(
      <AskProvider>
        <AppHeader
          title={view.page.title}
          backHref={resolvePageRoute(section.id)}
          sectionTitle={section.title}
          sectionTree={tree}
          currentPageId={view.page.id}
        />
        <main className="px-s5 pb-s7 pt-s6">
          <article>
            <p className="text-caption leading-ui text-muted">
              {section.title}　/　{view.page.title}
            </p>
            <h1 className="mt-s4 font-display text-display leading-heading font-semibold">{view.page.title}</h1>
            <div className="pt-s5">
              <ArticleRenderer blocks={view.blocks} getAsset={getAsset} resolvePageRoute={resolvePageRoute} />
            </div>
          </article>
        </main>
        <DocumentAskEntry
          pageId={view.page.id}
          initialAnchor={view.blocks.find((block) => block.type === "heading")?.anchor}
        />
      </AskProvider>
    );

    expect(screen.getByRole("heading", { name: "校园环游车乘坐指南", level: 1 })).toBeVisible();
    expect(screen.getByText("路线与收费")).toBeVisible();
    expect(screen.getByRole("link", { name: "搜索文档" })).toHaveAttribute("href", "/search");
  });
});
