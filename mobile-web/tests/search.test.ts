import { describe, expect, it } from "vitest";
import { sampleCards } from "@/lib/content/sample-cards";
import { searchCards } from "@/lib/search/search-cards";

describe("mobile campus card search", () => {
  it.each([
    ["校园卡丢了怎么办", "校园卡丢了怎么办"],
    ["宿舍怎么报修", "宿舍报修怎么走"],
    ["校园网连不上", "校园网连不上怎么办"],
    ["常用电话", "常用电话与服务入口"],
    ["食堂哪家方便", "食堂吃饭怎么选"],
  ])("matches %s to the right published card", (query, expectedTitle) => {
    const [topResult] = searchCards(query, sampleCards);

    expect(topResult?.card.title).toBe(expectedTitle);
    expect(topResult?.score).toBeGreaterThan(0);
  });

  it("does not return draft cards even when the query matches them", () => {
    const results = searchCards("未发布测试", [
      ...sampleCards,
      {
        ...sampleCards[0],
        slug: "draft-only",
        title: "未发布测试",
        reviewStatus: "draft",
      },
    ]);

    expect(results.some((result) => result.card.slug === "draft-only")).toBe(false);
  });
});
