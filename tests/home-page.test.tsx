import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getPublishedSections } from "@/lib/content/published-repository";
import { AskProvider } from "@/src/components/ask/AskProvider";
import { HomePageView } from "@/src/components/pages/HomePageView";

describe("question-first homepage", () => {
  it("keeps the question entry primary and limits exploration to section links", () => {
    render(<AskProvider><HomePageView sections={getPublishedSections()} /></AskProvider>);

    expect(screen.getByRole("heading", { name: /校园里的事/ })).toBeVisible();
    expect(screen.getByLabelText("问题")).toBeVisible();
    expect(screen.getAllByRole("link", { name: /入学报到|校园生活|学习考试|办事服务/ })).toHaveLength(4);
    expect(screen.queryByText("最近更新")).not.toBeInTheDocument();
  });
});
