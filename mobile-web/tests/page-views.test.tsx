import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  getAsset,
  getDocumentView,
  getSectionChildren,
  getSectionForPage,
  getSectionTree,
  getSectionView,
  resolvePageRoute,
} from "@/lib/content/published-repository";
import { DocumentPageView } from "@/src/components/pages/DocumentPageView";
import { SectionPageView } from "@/src/components/pages/SectionPageView";
import { AskProvider } from "@/src/components/ask/AskProvider";

describe("published page views", () => {
  it("renders a free-form section introduction followed by child documents", () => {
    const view = getSectionView("campus-life");
    expect(view).not.toBeNull();
    render(<SectionPageView view={view!} children={getSectionChildren("campus-life")} tree={getSectionTree("campus-life")} />);

    expect(screen.getByRole("heading", { name: "校园生活", level: 1 })).toBeVisible();
    expect(screen.getByText(/从住宿、交通到日常服务/)).toBeVisible();
    expect(screen.getByRole("link", { name: /校园交通/ })).toHaveAttribute("href", "/docs/campus-transport");
  });

  it("renders a reader-first document with section navigation", () => {
    const view = getDocumentView("campus-shuttle");
    expect(view).not.toBeNull();
    const section = getSectionForPage(view!.page.id);
    expect(section).not.toBeNull();
    render(<AskProvider><DocumentPageView view={view!} section={section!} tree={getSectionTree(section!.slug)} getAsset={getAsset} resolvePageRoute={resolvePageRoute} /></AskProvider>);

    expect(screen.getByRole("heading", { name: "校园环游车乘坐指南", level: 1 })).toBeVisible();
    expect(screen.getByText("路线与收费")).toBeVisible();
    expect(screen.getByRole("link", { name: "搜索文档" })).toHaveAttribute("href", "/search");
  });
});
