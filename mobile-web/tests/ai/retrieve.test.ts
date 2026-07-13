import { describe, expect, it, vi } from "vitest";
import { retrieveGroundingSources, type RetrievalRepository, type RetrievalSource } from "@/lib/ai/retrieve";

const source = (overrides: Partial<RetrievalSource> = {}): RetrievalSource => ({
  id: "source-body", pageId: "page-shuttle", pageTitle: "校园环游车", anchor: "b-body",
  sectionPath: ["校园生活"], exactText: "单次收费 0.9 元", riskLevel: "normal", school: "ncu",
  contentVersion: "v2", lexicalScore: 1, vectorScore: 0, sourceUrls: [], ...overrides,
});

function repository(sources: RetrievalSource[], version = "v2"): RetrievalRepository {
  return { getCurrentVersion: async () => version, searchCurrentVersion: vi.fn(async () => sources) };
}

describe("current-version grounded retrieval", () => {
  it("combines lexical and semantic scores with deterministic tie ordering", async () => {
    const repo = repository([
      source({ id: "b", lexicalScore: 0.8, vectorScore: 0.5 }),
      source({ id: "a", lexicalScore: 0.8, vectorScore: 0.5 }),
      source({ id: "semantic", lexicalScore: 0, vectorScore: 0.95 }),
    ]);
    const embedding = { embed: vi.fn(async () => [[0.1, 0.2]]) };

    const results = await retrieveGroundingSources({ question: "环游车费用", repository: repo, embedding });

    expect(results.map((item) => item.id)).toEqual(["semantic", "a", "b"]);
    expect(embedding.embed).toHaveBeenCalledWith(["环游车费用"]);
  });

  it("boosts matching page and exact anchor context", async () => {
    const repo = repository([
      source({ id: "other", pageId: "other-page", lexicalScore: 1 }),
      source({ id: "page", anchor: "b-other", lexicalScore: 0.4 }),
      source({ id: "anchor", lexicalScore: 0.1 }),
    ]);

    const results = await retrieveGroundingSources({ question: "费用", pageContext: { pageId: "page-shuttle", anchor: "b-body" }, repository: repo });

    expect(results.map((item) => item.id)).toEqual(["anchor", "page", "other"]);
  });

  it("enforces current-version, NCU, and risk filters even if a repository misbehaves", async () => {
    const repo = repository([
      source({ id: "current" }),
      source({ id: "stale", contentVersion: "v1", lexicalScore: 9 }),
      source({ id: "other-school", school: "other", lexicalScore: 9 }),
      source({ id: "sensitive", riskLevel: "sensitive", lexicalScore: 9 }),
    ]);

    const results = await retrieveGroundingSources({ question: "费用", repository: repo, allowedRiskLevels: ["normal"] });

    expect(results.map((item) => item.id)).toEqual(["current"]);
  });

  it("returns an empty list without calling providers for blank questions or empty retrieval", async () => {
    const repo = repository([]);
    const embedding = { embed: vi.fn(async () => [[0.1]]) };
    await expect(retrieveGroundingSources({ question: "  ", repository: repo, embedding })).resolves.toEqual([]);
    await expect(retrieveGroundingSources({ question: "不存在", repository: repo, embedding })).resolves.toEqual([]);
    expect(embedding.embed).toHaveBeenCalledTimes(1);
  });
});
