// 单测：真实集成测试学生端首页 (app/page.tsx) 标语首屏、主提问框入口与顶层校园板块列表的真实服务端渲染
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "@/app/page";
import { AskProvider } from "@/src/components/ask/provider";

describe("question-first homepage (app/page.tsx)", () => {
  it("renders the real production home page with question entry and section navigation", async () => {
    const pageJsx = await HomePage();
    render(<AskProvider>{pageJsx}</AskProvider>);

    // 验证核心品牌标语
    expect(screen.getByRole("heading", { name: /校园里的事/ })).toBeVisible();
    expect(screen.getByText(/查规则、找地点、了解经验/)).toBeVisible();

    // 验证主提问框入口
    expect(screen.getByLabelText("问题")).toBeVisible();
    expect(screen.getByRole("button", { name: "提交问题" })).toBeVisible();

    // 验证校园板块导航卡片
    expect(screen.getByRole("heading", { name: "浏览校园内容" })).toBeVisible();
    const sectionLinks = screen.getAllByRole("link", { name: /入学报到|校园生活|学习考试|办事服务/ });
    expect(sectionLinks.length).toBeGreaterThanOrEqual(4);
    expect(sectionLinks[0]).toHaveAttribute("href", expect.stringMatching(/^\/sections\//));

    // 验证不包含干扰式非必要组件
    expect(screen.queryByText("最近更新")).not.toBeInTheDocument();
  });
});
