// 单测：测试搜索结果页 (SearchExperience) 关键词按文档聚合、高亮摘要、来源路径与无 AI 生成回答的独立检索特性
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { searchIndexFixture, resolvePageRoute } from "@/lib/content/fixture";
import { searchGroupedEntries } from "@/lib/content/search";
import { SearchExperience } from "@/src/components/search/box";
import { AppHeader } from "@/src/components/primitives/header";

describe("keyword search page", () => {
  it("shows source paths, original excerpts and exact anchor links without an AI answer", () => {
    const results = searchGroupedEntries("环游车", searchIndexFixture, resolvePageRoute);
    render(
      <>
        <AppHeader title="搜索文档" backHref="/" />
        <main className="px-s5 pb-s7 pt-s5">
          <SearchExperience initialQuery="环游车" initialResults={results} />
        </main>
      </>
    );

    expect(screen.getByText(/找到 1 篇相关文档/)).toBeVisible();
    expect(screen.getByText("校园生活")).toBeVisible();
    expect(screen.getByRole("link", { name: "校园环游车乘坐指南" })).toHaveAttribute("href", "/docs/campus-shuttle");
    expect(screen.getByRole("link", { name: /跳到“校园交通”/ })).toHaveAttribute("href", "/docs/campus-shuttle#b-shuttle-intro");
    expect(screen.queryByText(/AI 回答|生成答案|已找到可引用信息/)).not.toBeInTheDocument();
  });
});
