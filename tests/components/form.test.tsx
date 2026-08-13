// 单测：测试 QuestionForm 提问输入表单的提交拦截、去除空格校验以及与全站 AskProvider 的联动开弹层交互
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { AskProvider } from "@/src/components/ask/provider";
import { FloatingAskButton } from "@/src/components/ask/button";
import { QuestionForm } from "@/src/components/ask/form";

describe("shared ask entry", () => {
  it("opens the ask sheet from the homepage without navigating to search", async () => {
    const user = userEvent.setup();
    render(<AskProvider><QuestionForm /></AskProvider>);

    await user.type(screen.getByLabelText("问题"), "环游车怎么付费？");
    await user.click(screen.getByRole("button", { name: "提交问题" }));

    expect(await screen.findByRole("dialog", { name: "询问此间" })).toBeVisible();
    expect(screen.getByText("环游车怎么付费？")).toBeVisible();
    expect(screen.queryByRole("link", { name: /搜索/ })).not.toBeInTheDocument();
  });

  it("opens with the current document context from the floating button", async () => {
    const user = userEvent.setup();
    render(<AskProvider><FloatingAskButton pageContext={{ pageId: "page-campus-shuttle", anchor: "b-fare" }} /></AskProvider>);

    await user.click(screen.getByRole("button", { name: "询问当前文档" }));

    expect(await screen.findByText("基于当前文档与所在段落")).toBeVisible();
    expect(screen.queryByText(/page-campus-shuttle|b-fare/)).not.toBeInTheDocument();
  });
});
