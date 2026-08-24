// 单测：测试搜索结果页 (SearchExperience) 关键词按文档聚合、整卡直达、高亮摘要、来源路径与无 AI 生成回答的独立检索特性
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { searchIndexFixture, resolvePageRoute } from "@/lib/content/fixture";
import { searchGroupedEntries } from "@/lib/content/search";
import { SearchExperience } from "@/src/components/search/box";
import { AppHeader } from "@/src/components/primitives/header";

describe("keyword search page", () => {
  it("shows the prototype's document-level result rows without an AI answer", () => {
    const results = searchGroupedEntries("环游车", searchIndexFixture, resolvePageRoute);
    render(
      <>
        <AppHeader title="搜索文档" backHref="/" hideSearchAction />
        <main className="px-s5 pb-s7 pt-s5">
          <SearchExperience initialQuery="环游车" initialResults={results} />
        </main>
      </>
    );

    expect(screen.getByText("「环游车」· 1 篇匹配")).toBeVisible();
    expect(screen.getByText("校园生活")).toBeVisible();
    expect(screen.getByRole("link", { name: "校园环游车乘坐指南校园生活" })).toHaveAttribute("href", "/docs/campus-shuttle");
    expect(screen.queryByText(/校园交通.*环游车/)).not.toBeInTheDocument();
    expect(screen.queryByText(/AI 回答|生成答案|已找到可引用信息/)).not.toBeInTheDocument();
  });
});
