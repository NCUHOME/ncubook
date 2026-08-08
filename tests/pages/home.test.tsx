// 单测：测试提问优先首页 (HomePageView) 标语首屏、主提问框入口与顶层校园板块卡片列表的渲染
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getPublishedSections } from "@/lib/content/repo";
import { AskProvider } from "@/src/context/ask";
import { HomePageView } from "@/src/views/home";

describe("question-first homepage", () => {
  it("keeps the question entry primary and limits exploration to section links", () => {
    render(<AskProvider><HomePageView sections={getPublishedSections()} /></AskProvider>);

    expect(screen.getByRole("heading", { name: /校园里的事/ })).toBeVisible();
    expect(screen.getByLabelText("问题")).toBeVisible();
    expect(screen.getAllByRole("link", { name: /入学报到|校园生活|学习考试|办事服务/ })).toHaveLength(4);
    expect(screen.queryByText("最近更新")).not.toBeInTheDocument();
  });
});
