// 单测：测试搜索前端交互组件 (SearchExperience 与 SearchResultItem)，验证打字即搜、清空按钮、多段落折叠展开与高亮渲染
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { SearchExperience } from "@/src/components/search/box";
import { SearchResultItem } from "@/src/components/search/item";
import type { GroupedSearchResult } from "@/lib/content/search";

describe("search component interactions", () => {
  beforeEach(() => {
    // 模拟全局 fetch /api/search/index
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          pid: "page-1",
          t: "校园环游车",
          p: ["校园生活"],
          e: "单次收费 0.9 元，支持扫码付款",
          a: "b-fare",
          h: "/docs/campus-shuttle#b-fare",
          r: "/docs/campus-shuttle",
          b: "paragraph",
        },
      ],
    } as unknown as Response);
  });

  it("renders the empty search state and accepts typed input", async () => {
    const user = userEvent.setup();
    render(<SearchExperience initialQuery="" initialResults={[]} />);

    expect(screen.getByRole("heading", { name: "输入一个关键词" })).toBeVisible();
    const input = screen.getByPlaceholderText("搜索文档和段落");
    expect(input).toHaveValue("");

    await user.type(input, "环游车");
    expect(input).toHaveValue("环游车");
  });

  it("clears search query and results when clear button is clicked", async () => {
    const user = userEvent.setup();
    render(<SearchExperience initialQuery="费用" initialResults={[]} />);

    const clearButton = screen.getByRole("button", { name: "清除关键词" });
    expect(clearButton).toBeVisible();

    await user.click(clearButton);
    expect(screen.getByPlaceholderText("搜索文档和段落")).toHaveValue("");
    expect(screen.getByRole("heading", { name: "输入一个关键词" })).toBeVisible();
  });

  it("renders SearchResultItem in title-only match mode", () => {
    const titleOnlyResult: GroupedSearchResult = {
      pageId: "page-map",
      pageTitle: "前湖校区全景地图",
      sectionPath: ["校园生活"],
      href: "/docs/campus-map",
      isTitleMatch: true,
      score: 120,
      snippets: [],
      totalMatches: 1,
    };

    render(<SearchResultItem result={titleOnlyResult} query="地图" />);

    expect(screen.getByText("校园生活")).toBeVisible();
    expect(screen.getByRole("heading", { name: /前湖校区全景地图/ })).toBeVisible();
    expect(screen.getByText(/匹配文档标题《/)).toBeVisible();
    expect(screen.getByRole("link", { name: "阅读完整文档 →" })).toHaveAttribute("href", "/docs/campus-map");
  });

  it("renders SearchResultItem with multiple snippets and toggles fold/unfold", () => {
    const multiSnippetResult: GroupedSearchResult = {
      pageId: "page-shuttle",
      pageTitle: "校园环游车",
      sectionPath: ["校园生活"],
      href: "/docs/campus-shuttle",
      isTitleMatch: false,
      score: 85,
      snippets: [
        { anchor: "b-route", headingPath: ["路线"], text: "北院至南院环形路线", isHeading: false },
        { anchor: "b-fare", headingPath: ["收费"], text: "单次票价 0.9 元", isHeading: false },
        { anchor: "b-time", headingPath: ["运营时间"], text: "早 7:00 至晚 22:30", isHeading: false },
      ],
      totalMatches: 3,
    };

    render(<SearchResultItem result={multiSnippetResult} query="路线" />);

    // 默认展示前 2 个片段，第 3 个折叠；高亮关键词会拆分为 mark 节点
    expect(screen.getByText("北院至南院环形")).toBeVisible();
    expect(screen.getByText("单次票价 0.9 元")).toBeVisible();
    expect(screen.queryByText("早 7:00 至晚 22:30")).not.toBeInTheDocument();

    // 点击展开更多
    const toggleButton = screen.getByRole("button", { name: /查看该文档其余 1 处匹配/ });
    expect(toggleButton).toBeVisible();
    fireEvent.click(toggleButton);

    // 展开后全部可见
    expect(screen.getByText("早 7:00 至晚 22:30")).toBeVisible();
    expect(screen.getByRole("button", { name: /收起该文档匹配/ })).toBeVisible();

    // 再次点击收起
    fireEvent.click(screen.getByRole("button", { name: /收起该文档匹配/ }));
    expect(screen.queryByText("早 7:00 至晚 22:30")).not.toBeInTheDocument();
  });
});
