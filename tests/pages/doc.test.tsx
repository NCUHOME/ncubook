// 单测：真实集成测试文档阅读页 (app/docs/[slug]/page.tsx) 与板块直跳逻辑 (app/sections/[slug]/page.tsx)
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DocumentPage, { generateMetadata as generateDocMetadata } from "@/app/docs/[slug]/page";
import SectionPage, { generateMetadata as generateSectionMetadata } from "@/app/sections/[slug]/page";
import { AskProvider } from "@/src/components/ask/provider";
import { SearchProvider } from "@/src/components/search/search-provider";

describe("published page views (app/sections/[slug] & app/docs/[slug])", () => {
  it("generates section metadata correctly and redirects to the section's first document", async () => {
    const params = Promise.resolve({ slug: "campus-life" });
    const meta = await generateSectionMetadata({ params });
    expect(meta.title).toContain("校园生活");

    await expect(SectionPage({ params })).rejects.toThrow();
  });

  it("renders a real reader-first document page with header, breadcrumbs, article blocks, progress, next card and ask entry", async () => {
    const params = Promise.resolve({ slug: "campus-shuttle" });
    const meta = await generateDocMetadata({ params });
    expect(meta.title).toContain("校园环游车乘坐指南");

    const pageJsx = await DocumentPage({ params });
    render(
      <SearchProvider>
        <AskProvider>{pageJsx}</AskProvider>
      </SearchProvider>,
    );

    expect(screen.getByRole("heading", { name: "校园环游车乘坐指南", level: 1 })).toBeVisible();
    expect(screen.getAllByText(/校园生活/)[0]).toBeVisible();
    expect(screen.getByText(/路线与收费/)).toBeVisible();
    expect(screen.getByRole("button", { name: "搜索手册" })).toBeVisible();
    expect(screen.getByRole("button", { name: "询问当前文档" })).toBeVisible();
    expect(screen.getByText(/这篇指南对你有帮助吗/)).toBeVisible();
  });
});
