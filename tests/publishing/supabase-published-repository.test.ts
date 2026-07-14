import { describe, expect, it } from "vitest";
import { publishedFixture } from "@/lib/content/published-fixtures";
import { createPublishedRepository } from "@/lib/content/published-repository";
import { decodePublishedBlock, loadPublishedRepository } from "@/lib/content/supabase-published-repository";

describe("published repository boundary", () => {
  it("normalizes a legacy schema-v1 quote without children", () => {
    expect(decodePublishedBlock({
      id: "legacy-quote",
      anchor: "b-legacy-quote",
      type: "quote",
      richText: [{ plainText: "旧引用", annotations: {} }],
    })).toEqual({
      id: "legacy-quote",
      anchor: "b-legacy-quote",
      type: "quote",
      richText: [{ plainText: "旧引用", annotations: {} }],
      children: [],
    });
  });

  it("runs the same selectors against fixtures and a loaded published snapshot", async () => {
    const fixtureRepository = createPublishedRepository(publishedFixture);
    const loadedRepository = await loadPublishedRepository({
      environment: "production",
      configured: true,
      loadPublishedFixture: async () => structuredClone(publishedFixture),
    });

    expect(loadedRepository.getPublishedSections()).toEqual(fixtureRepository.getPublishedSections());
    expect(loadedRepository.getDocumentView("campus-shuttle")).toEqual(fixtureRepository.getDocumentView("campus-shuttle"));
    expect(loadedRepository.getSectionTree("campus-life")).toEqual(fixtureRepository.getSectionTree("campus-life"));
    expect(loadedRepository.getSearchIndex()).toEqual(fixtureRepository.getSearchIndex());
  });

  it("allows fixture fallback only outside production", async () => {
    const localRepository = await loadPublishedRepository({
      environment: "test",
      configured: false,
      loadPublishedFixture: async () => null,
    });
    expect(localRepository.getPublishedSections().length).toBeGreaterThan(0);

    await expect(loadPublishedRepository({
      environment: "production",
      configured: false,
      loadPublishedFixture: async () => null,
    })).rejects.toThrow("Published content storage is not configured");
  });

  it("does not silently use fixtures when production has no current pointer", async () => {
    await expect(loadPublishedRepository({
      environment: "production",
      configured: true,
      loadPublishedFixture: async () => null,
    })).rejects.toThrow("No published content version is available");
  });
});
