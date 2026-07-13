import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Block } from "@/lib/content/published-schema";
import { getAsset, getDocumentView, resolvePageRoute } from "@/lib/content/published-repository";
import { ArticleRenderer } from "@/src/components/article/ArticleRenderer";

describe("article renderer", () => {
  it("preserves rich blocks, assets and stable anchors", () => {
    const view = getDocumentView("rich-content-guide");
    render(<ArticleRenderer blocks={view?.blocks ?? []} getAsset={getAsset} resolvePageRoute={resolvePageRoute} />);

    expect(screen.getByRole("heading", { name: "富内容示例" })).toHaveAttribute("id", "b-rich-heading");
    expect(document.getElementById("b-table-row-fare")).toBeInstanceOf(HTMLTableRowElement);
    expect(screen.getByRole("table")).toBeVisible();
    expect(screen.getByRole("img", { name: "校园交通路线示意图" })).toHaveAttribute("src", "/fixtures/campus-map.svg");
    expect(screen.getByRole("link", { name: /校园生活指南/ })).toHaveAttribute("href", "/fixtures/campus-life-guide.pdf");
    expect(screen.getByRole("link", { name: "查看校园环游车乘坐指南" })).toHaveAttribute("href", "/docs/campus-shuttle");

    const left = screen.getByText("左列内容");
    const right = screen.getByText("右列内容");
    expect(left.compareDocumentPosition(right) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("falls back to a canonical link for a non-allowlisted school-map URL", () => {
    const unsafe: Block = {
      id: "unsafe-map",
      anchor: "b-unsafe-map",
      type: "embed",
      provider: "school-map",
      canonicalUrl: "https://example.com/not-approved",
      title: "外部地图",
    };

    render(<ArticleRenderer blocks={[unsafe]} getAsset={getAsset} resolvePageRoute={resolvePageRoute} />);

    expect(screen.queryByTitle("外部地图")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /打开外部地图/ })).toHaveAttribute("href", unsafe.canonicalUrl);
  });
});
