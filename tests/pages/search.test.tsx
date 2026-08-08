// 单测：测试搜索结果页 (SearchPageView) 关键词匹配段落列表、高亮摘要、来源路径与无 AI 生成回答的独立检索特性
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { searchIndexFixture } from "@/lib/content/published-fixtures";
import { resolvePageRoute } from "@/lib/content/published-repository";
import { searchEntries } from "@/lib/search/search-blocks";
import { SearchPageView } from "@/src/views/search";

describe("keyword search page", () => {
  it("shows source paths, original excerpts and exact anchor links without an AI answer", () => {
    const results = searchEntries("环游车", searchIndexFixture, resolvePageRoute);
    render(<SearchPageView query="环游车" results={results} />);

    expect(screen.getByText("找到 1 个匹配段落")).toBeVisible();
    expect(screen.getByText("校园生活 / 校园交通")).toBeVisible();
    expect(screen.getByRole("link", { name: /跳到“校园交通”/ })).toHaveAttribute("href", "/docs/campus-shuttle#b-shuttle-intro");
    expect(screen.queryByText(/AI 回答|生成答案|已找到可引用信息/)).not.toBeInTheDocument();
  });
});
