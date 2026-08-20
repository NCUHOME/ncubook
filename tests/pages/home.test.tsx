// 单测：真实集成测试学生端首页 (app/page.tsx) 标语首屏、胶囊复合搜索、公告栏、目录网格与完善手册渲染
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "@/app/page";
import { AskProvider } from "@/src/components/ask/provider";
import { SearchProvider } from "@/src/components/search/search-provider";

describe("homepage (app/page.tsx)", () => {
  it("renders the real production home page with hero, search, notice and section directory", async () => {
    const pageJsx = await HomePage();
    render(
      <SearchProvider>
        <AskProvider>{pageJsx}</AskProvider>
      </SearchProvider>,
    );

    // 验证核心品牌标语与人文引言
    expect(screen.getByRole("heading", { name: /校园里的事/ })).toBeVisible();
    expect(screen.getByText(/是什么曾经拯救过你/)).toBeVisible();

    // 验证胶囊复合搜索栏（左搜词条、右问小家园）
    expect(screen.getByLabelText("搜索手册词条")).toBeVisible();
    expect(screen.getByLabelText("向此间知识库直接提问")).toBeVisible();

    // 验证公告栏
    expect(screen.getByText("公告")).toBeVisible();

    // 验证板块目录网格
    expect(screen.getByRole("heading", { name: "目录" })).toBeVisible();

    // 验证完善手册与页脚
    expect(screen.getByRole("heading", { name: "完善手册" })).toBeVisible();
    expect(screen.getByText("致谢")).toBeVisible();
    expect(screen.getByText("声明")).toBeVisible();
  });
});
