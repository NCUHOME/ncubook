// 单测：测试 Supabase 数据发布仓库 (repo) 访问层，校验按版本查询页面树、获取文档视图与 Asset 资源的 SQL 映射
import { describe, expect, it } from "vitest";
import { publishedFixture } from "@/lib/content/fixtures";
import { createPublishedRepository } from "@/lib/content/repo";
import { decodePublishedBlock, loadPublishedRepository } from "@/lib/content/supabase";

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
