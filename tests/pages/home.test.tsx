// 单测：测试提问优先首页标语首屏、主提问框入口与顶层校园板块卡片列表的渲染
import React from "react";
import { render, screen } from "@testing-library/react";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { describe, expect, it } from "vitest";
import type { Page } from "@/lib/content/schema";
import { getPublishedSections, resolvePageRoute } from "@/lib/content/fixture";
import { AskProvider } from "@/src/components/ask/provider";
import { QuestionForm } from "@/src/components/ask/form";
import { AppHeader } from "@/src/components/primitives/header";

function TestHomePage() {
  const sections = getPublishedSections();
  return (
    <>
      <AppHeader />
      <main className="px-s5 pb-s7 pt-s7">
        <section>
          <p className="text-caption leading-ui tracking-widest text-muted">南昌大学 · 校园知识</p>
          <h1 className="mt-s4 font-display text-display leading-heading font-semibold">
            校园里的事，<br />在此问明白。
          </h1>
          <p className="mt-s4 max-w-prose font-body text-body leading-body text-muted">
            查规则、找地点、了解经验。答案保留出处，也保留原文的完整表达。
          </p>
          <div className="mt-s7">
            <QuestionForm />
          </div>
        </section>
        <section className="mt-s7" aria-labelledby="home-sections-title">
          <div className="flex items-center justify-between border-b border-line pb-s3">
            <h2 id="home-sections-title" className="text-title leading-heading font-semibold">
              浏览校园内容
            </h2>
            <span className="text-caption text-muted">查看目录</span>
          </div>
          <div className="grid grid-cols-2">
            {sections.slice(0, 6).map((section: Page) => (
              <Link
                key={section.id}
                href={resolvePageRoute(section.id)}
                className="focus-ring flex min-h-tap items-center justify-between border-b border-line py-s3 text-label odd:pr-s3 even:pl-s3"
              >
                <span>{section.title}</span>
                <ChevronRight className="size-icon-small text-muted" strokeWidth={1.9} />
              </Link>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}

describe("question-first homepage", () => {
  it("keeps the question entry primary and limits exploration to section links", () => {
    render(<AskProvider><TestHomePage /></AskProvider>);

    expect(screen.getByRole("heading", { name: /校园里的事/ })).toBeVisible();
    expect(screen.getByLabelText("问题")).toBeVisible();
    expect(screen.getAllByRole("link", { name: /入学报到|校园生活|学习考试|办事服务/ })).toHaveLength(4);
    expect(screen.queryByText("最近更新")).not.toBeInTheDocument();
  });
});
