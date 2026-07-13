import { describe, expect, it, vi } from "vitest";
import type { AnswerModel, ModelAnswer } from "@/lib/ai/provider";
import { groundAnswer } from "@/lib/ai/ground-answer";
import type { RetrievalSource } from "@/lib/ai/retrieve";

const source = (overrides: Partial<RetrievalSource> = {}): RetrievalSource => ({
  id: "source-fare", pageId: "page-shuttle", pageTitle: "校园环游车", anchor: "b-fare",
  sectionPath: ["校园生活", "路线与收费"], exactText: "单次收费 0.9 元。", riskLevel: "normal",
  school: "ncu", contentVersion: "v2", lexicalScore: 1, vectorScore: 0, sourceUrls: ["https://jwc.ncu.edu.cn/fare"], ...overrides,
});

const model = (answer: ModelAnswer): AnswerModel => ({ generateAnswer: vi.fn(async () => answer) });

describe("deterministically grounded answers", () => {
  it("constructs citations only from retrieved records", async () => {
    const answer = await groundAnswer({
      question: "环游车多少钱？", activeContentVersion: "v2", sources: [source()],
      model: model({ confidence: "grounded", claims: [{ id: "fare", text: "单次收费 0.9 元。", sourceIds: ["source-fare"], status: "grounded" }] }),
    });

    expect(answer.confidence).toBe("grounded");
    expect(answer.claims).toEqual([{ id: "fare", text: "单次收费 0.9 元。", citationIds: ["citation-source-fare"], status: "grounded" }]);
    expect(answer.citations[0]).toMatchObject({ id: "citation-source-fare", pageId: "page-shuttle", anchor: "b-fare", contentVersion: "v2", excerpt: "单次收费 0.9 元。" });
  });

  it("drops invented IDs, stale sources, and factual claims without sources", async () => {
    const answer = await groundAnswer({
      question: "费用", activeContentVersion: "v2", sources: [source(), source({ id: "stale", contentVersion: "v1" })],
      model: model({ confidence: "grounded", claims: [
        { id: "invented", text: "虚构", sourceIds: ["missing"], status: "grounded" },
        { id: "stale", text: "旧信息", sourceIds: ["stale"], status: "grounded" },
        { id: "unsupported", text: "无来源", sourceIds: [], status: "grounded" },
      ] }),
    });

    expect(answer).toMatchObject({ confidence: "insufficient", claims: [], citations: [] });
  });

  it("keeps supported claims while marking a mixed answer partial", async () => {
    const answer = await groundAnswer({
      question: "环游车信息是否确定？", activeContentVersion: "v2", sources: [source()],
      model: model({ confidence: "grounded", claims: [
        { id: "fare", text: "资料写明 0.9 元。", sourceIds: ["source-fare"], status: "grounded" },
        { id: "verify", text: "仍建议出发前核对。", sourceIds: ["source-fare"], status: "needs-verification" },
      ] }),
    });

    expect(answer.confidence).toBe("partial");
    expect(answer.claims.map((claim) => claim.status)).toEqual(["grounded", "needs-verification"]);
  });

  it("does not call the model or emit facts after empty retrieval", async () => {
    const answerModel = model({ confidence: "grounded", claims: [{ id: "bad", text: "事实", sourceIds: ["x"], status: "grounded" }] });
    const answer = await groundAnswer({ question: "未知问题", activeContentVersion: "v2", sources: [], model: answerModel });
    expect(answer).toMatchObject({ confidence: "insufficient", claims: [], citations: [] });
    expect(answerModel.generateAnswer).not.toHaveBeenCalled();
  });
});
