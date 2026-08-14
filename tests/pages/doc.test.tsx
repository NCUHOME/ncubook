// 单测：真实集成测试文档阅读页 (app/docs/[slug]/page.tsx) 与板块导引页 (app/sections/[slug]/page.tsx) 真实服务端组件渲染与元数据生成
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DocumentPage, { generateMetadata as generateDocMetadata } from "@/app/docs/[slug]/page";
import SectionPage, { generateMetadata as generateSectionMetadata } from "@/app/sections/[slug]/page";
import { AskProvider } from "@/src/components/ask/provider";

describe("published page views (app/sections/[slug] & app/docs/[slug])", () => {
  it("renders a real section page with introduction, blocks and child page list", async () => {
    const params = Promise.resolve({ slug: "campus-life" });
    const meta = await generateSectionMetadata({ params });
    expect(meta.title).toContain("校园生活");

    const pageJsx = await SectionPage({ params });
    render(<AskProvider>{pageJsx}</AskProvider>);

    expect(screen.getByRole("heading", { name: "校园生活", level: 1 })).toBeVisible();
    expect(screen.getByText(/从住宿、交通到日常服务/)).toBeVisible();
    expect(screen.getByRole("heading", { name: "本板块全部页面", level: 2 })).toBeVisible();
    expect(screen.getByRole("link", { name: /校园交通/ })).toHaveAttribute("href", "/docs/campus-transport");
  });

  it("renders a real reader-first document page with header, breadcrumbs, article blocks and ask entry", async () => {
    const params = Promise.resolve({ slug: "campus-shuttle" });
    const meta = await generateDocMetadata({ params });
    expect(meta.title).toContain("校园环游车乘坐指南");

    const pageJsx = await DocumentPage({ params });
    render(<AskProvider>{pageJsx}</AskProvider>);

    expect(screen.getByRole("heading", { name: "校园环游车乘坐指南", level: 1 })).toBeVisible();
    expect(screen.getByText(/校园生活/)).toBeVisible();
    expect(screen.getByText(/路线与收费/)).toBeVisible();
    expect(screen.getByRole("link", { name: "搜索文档" })).toHaveAttribute("href", "/search");
    expect(screen.getByRole("button", { name: "询问当前文档" })).toBeVisible();
  });
});
