import { describe, expect, it } from "vitest";
import type { ModelClaim } from "@/lib/ai/provider";
import { applyGroundingPolicy } from "@/lib/ai/policy";
import type { RetrievalSource } from "@/lib/ai/retrieve";

const source = (overrides: Partial<RetrievalSource> = {}): RetrievalSource => ({
  id: "s1", pageId: "p1", pageTitle: "通知", anchor: "b-1", sectionPath: [], exactText: "报名截止 9 月 1 日，费用 100 元。",
  riskLevel: "normal", school: "ncu", contentVersion: "v2", lexicalScore: 1, vectorScore: 0, sourceUrls: [], ...overrides,
});
const claim = (overrides: Partial<ModelClaim> = {}): ModelClaim => ({ id: "c1", text: "报名截止 9 月 1 日。", sourceIds: ["s1"], status: "grounded", ...overrides });

describe("sensitive answer policy", () => {
  it("requires authoritative sources for admissions deadlines and fees", () => {
    expect(applyGroundingPolicy("报名截止时间和费用？", [source()], [claim()]).claims).toEqual([]);
    const official = source({ sourceUrls: ["https://jwc.ncu.edu.cn/notice"] });
    expect(applyGroundingPolicy("报名截止时间和费用？", [official], [claim()]).claims[0].status).toBe("needs-verification");
  });

  it("fails closed for unsupported medical and safety advice", () => {
    expect(applyGroundingPolicy("我受伤了怎么处理？", [source()], [claim({ text: "自行服药。" })]).claims).toEqual([]);
    expect(applyGroundingPolicy("宿舍发生火灾怎么办？", [source()], [claim({ text: "继续等待。" })]).claims).toEqual([]);
  });

  it("preserves conflicting authoritative sources and forces verification", () => {
    const sources = [
      source({ id: "s1", exactText: "截止时间为 9 月 1 日。", sourceUrls: ["https://jwc.ncu.edu.cn/a"] }),
      source({ id: "s2", exactText: "截止时间为 9 月 3 日。", sourceUrls: ["https://jwc.ncu.edu.cn/b"] }),
    ];
    const result = applyGroundingPolicy("报名截止时间？", sources, [claim(), claim({ id: "c2", sourceIds: ["s2"], text: "另一则通知写明 9 月 3 日。" })]);
    expect(result.outcome).toBe("conflicting-sources");
    expect(result.claims.map((item) => item.status)).toEqual(["needs-verification", "needs-verification"]);
  });
});
