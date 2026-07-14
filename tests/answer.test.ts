import { describe, expect, it } from "vitest";
import { sampleCards } from "@/lib/content/sample-cards";
import { composeSearchAnswer, requiresOfficialVerification } from "@/lib/search/answer";
import { searchCards } from "@/lib/search/search-cards";

describe("AI-like search answer boundary", () => {
  it("composes a short sourced answer from reliable card matches", () => {
    const results = searchCards("校园卡丢了怎么办", sampleCards);
    const answer = composeSearchAnswer("校园卡丢了怎么办", results);

    expect(answer.state).toBe("answered");
    expect(answer.conclusion).toContain("先挂失");
    expect(answer.sources[0]?.title).toBe("校园卡丢了怎么办");
    expect(answer.followUps.length).toBeGreaterThanOrEqual(2);
  });

  it("does not fabricate an answer when no reliable card is found", () => {
    const answer = composeSearchAnswer("学校附近哪里能办潜水证", []);

    expect(answer.state).toBe("no_source");
    expect(answer.conclusion).toContain("暂未找到可靠信息");
    expect(answer.sources).toEqual([]);
  });

  it("flags fees, deadlines, grades, qualification and policy questions for official verification", () => {
    expect(requiresOfficialVerification("转专业截止时间和资格要求是什么")).toBe(true);
    expect(requiresOfficialVerification("补卡费用多少钱")).toBe(true);

    const answer = composeSearchAnswer(
      "补卡费用多少钱",
      searchCards("补卡费用多少钱", sampleCards),
    );

    expect(answer.verificationNotice).toContain("以官方通知或人工确认为准");
  });
});
