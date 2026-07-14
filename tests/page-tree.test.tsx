import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { PageTreeDrawer } from "@/src/components/navigation/PageTreeDrawer";

describe("page tree drawer", () => {
  it("opens the current section tree and restores trigger focus", async () => {
    const user = userEvent.setup();
    render(
      <PageTreeDrawer
        sectionTitle="校园生活"
        currentPageId="shuttle"
        nodes={[
          {
            id: "transport",
            title: "校园交通",
            href: "/docs/campus-transport",
            children: [{ id: "shuttle", title: "环游车", href: "/docs/campus-shuttle", children: [] }],
          },
        ]}
      />,
    );

    const trigger = screen.getByRole("button", { name: "打开校园生活页面列表" });
    await user.click(trigger);
    expect(screen.getByRole("dialog", { name: "校园生活页面列表" })).toBeVisible();
    expect(screen.getByRole("link", { name: "环游车" })).toHaveAttribute("aria-current", "page");

    await user.keyboard("{Escape}");
    expect(trigger).toHaveFocus();
  });
});
