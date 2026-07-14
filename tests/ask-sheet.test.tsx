import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ACTIVE_CONTENT_VERSION, type AnswerSession } from "@/lib/answers/session";
import { AskProvider, type AnswerRequest } from "@/src/components/ask/AskProvider";
import { FloatingAskButton } from "@/src/components/ask/FloatingAskButton";
import { QuestionForm } from "@/src/components/ask/QuestionForm";

const answer: AnswerSession = {
  id: "answer-shuttle-fare",
  question: "环游车怎么付费？",
  confidence: "grounded",
  citations: [
    {
      id: "fare-source",
      pageId: "page-campus-shuttle",
      pageTitle: "校园环游车乘坐指南",
      anchor: "b-fare",
      contentVersion: ACTIVE_CONTENT_VERSION,
      excerpt: "单次收费 0.9 元。",
    },
    {
      id: "payment-source",
      pageId: "page-campus-shuttle",
      pageTitle: "校园环游车乘坐指南",
      anchor: "b-fare",
      contentVersion: ACTIVE_CONTENT_VERSION,
      excerpt: "可使用支付宝洪城一卡通或扫描车载二维码付款。",
    },
  ],
  claims: [
    { id: "fare", text: "单次费用为 0.9 元。", citationIds: ["fare-source"], status: "grounded" },
    { id: "payment", text: "可以使用支付宝或扫描车载二维码付款。", citationIds: ["payment-source"], status: "grounded" },
  ],
};

describe("grounded answer sheet", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders a citation beside every claim and preserves the answer before source navigation", async () => {
    const user = userEvent.setup();
    const requestAnswer = vi.fn<AnswerRequest>().mockResolvedValue(answer);
    render(<AskProvider requestAnswer={requestAnswer}><QuestionForm /></AskProvider>);

    await user.type(screen.getByLabelText("问题"), "环游车怎么付费？");
    await user.click(screen.getByRole("button", { name: "提交问题" }));

    const evidence = await screen.findByRole("heading", { name: "完整依据" });
    expect(evidence).toBeVisible();
    for (const [index, claim] of answer.claims.entries()) {
      const item = screen.getByText(claim.text).closest("li");
      expect(item).not.toBeNull();
      expect(within(item as HTMLElement).getByRole("link", { name: `查看结论 ${index + 1} 的依据` })).toBeVisible();
    }

    const source = screen.getByRole("link", { name: "查看结论 1 的依据" });
    expect(source).toHaveAttribute("href", "/docs/campus-shuttle?answerSession=answer-shuttle-fare#b-fare");
    source.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(source);
    expect(JSON.parse(sessionStorage.getItem("answer-session:answer-shuttle-fare") ?? "null")).toMatchObject({
      session: { id: "answer-shuttle-fare" },
    });
  });

  it("submits the current document context from the floating entry", async () => {
    const user = userEvent.setup();
    const requestAnswer = vi.fn<AnswerRequest>().mockResolvedValue({
      ...answer,
      pageContext: { pageId: "page-campus-shuttle", anchor: "b-fare" },
    });
    render(
      <AskProvider requestAnswer={requestAnswer}>
        <FloatingAskButton pageContext={{ pageId: "page-campus-shuttle", anchor: "b-fare" }} />
      </AskProvider>,
    );

    await user.click(screen.getByRole("button", { name: "询问当前文档" }));
    await user.type(screen.getByLabelText("继续追问"), "环游车怎么付费？");
    await user.click(screen.getByRole("button", { name: "提交追问" }));

    await waitFor(() => expect(requestAnswer).toHaveBeenCalledWith({
      question: "环游车怎么付费？",
      pageContext: { pageId: "page-campus-shuttle", anchor: "b-fare" },
    }));
  });

  it("restores the same answer, draft, and scroll target on browser back", async () => {
    const scrollTo = vi.fn();
    vi.stubGlobal("scrollTo", scrollTo);
    sessionStorage.setItem("answer-session:answer-shuttle-fare", JSON.stringify({
      session: answer,
      scrollY: 240,
      draft: "继续问班次",
    }));
    render(<AskProvider requestAnswer={vi.fn<AnswerRequest>()}><div>来源页</div></AskProvider>);

    fireEvent(window, new PopStateEvent("popstate", { state: { answerSession: "answer-shuttle-fare" } }));

    expect(await screen.findByText("单次费用为 0.9 元。")).toBeVisible();
    expect(screen.getByLabelText("继续追问")).toHaveValue("继续问班次");
    await waitFor(() => expect(scrollTo).toHaveBeenCalledWith({ top: 240 }));
  });
});
