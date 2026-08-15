// 单测：测试内容层数据模型契约、信任状态与风险级别校验守卫
import { describe, expect, it } from "vitest";
import {
  anchorFromSourceId,
  isReviewStatus,
  isRiskLevel,
  isTrustStatus,
  type Page,
  type Block,
  type Asset,
  type SearchIndexEntry,
} from "@/lib/content/schema";

describe("content schema contracts and guards", () => {
  it("validates trust status values correctly", () => {
    expect(isTrustStatus("official")).toBe(true);
    expect(isTrustStatus("student-verified")).toBe(true);
    expect(isTrustStatus("unverified")).toBe(true);
    expect(isTrustStatus("官方来源")).toBe(true);
    expect(isTrustStatus("同学经验已核实")).toBe(true);
    expect(isTrustStatus("待核实")).toBe(true);
    expect(isTrustStatus("unknown")).toBe(false);
    expect(isTrustStatus("")).toBe(false);
  });

  it("validates review status values correctly", () => {
    expect(isReviewStatus("published")).toBe(true);
    expect(isReviewStatus("draft")).toBe(true);
    expect(isReviewStatus("deprecated")).toBe(true);
    expect(isReviewStatus("archived")).toBe(false);
  });

  it("validates risk level values correctly", () => {
    expect(isRiskLevel("normal")).toBe(true);
    expect(isRiskLevel("needs-verification")).toBe(true);
    expect(isRiskLevel("sensitive")).toBe(true);
    expect(isRiskLevel("low")).toBe(true);
    expect(isRiskLevel("medium")).toBe(true);
    expect(isRiskLevel("high")).toBe(true);
    expect(isRiskLevel("critical")).toBe(false);
  });

  it("constructs standard anchor from sourceId", () => {
    expect(anchorFromSourceId("intro")).toBe("b-intro");
    expect(anchorFromSourceId("section-1")).toBe("b-section-1");
  });

  it("constructs valid Page and Block objects according to schema", () => {
    const page: Page = {
      id: "page-1",
      schemaVersion: 1,
      contentVersion: "v1",
      parentId: null,
      title: "校园生活指南",
      slug: "campus-life",
      status: "published",
      lastEditedTime: "2026-08-01T00:00:00.000Z",
      lastPublishedAt: "2026-08-01T00:00:00.000Z",
      metadata: {
        school: "ncu",
        sourceUrls: ["https://notion.so/page-1"],
        riskLevel: "normal",
      },
    };

    const block: Block = {
      id: "block-1",
      anchor: "b-block-1",
      type: "paragraph",
      richText: [{ plainText: "欢迎来到南昌大学", annotations: {} }],
    };

    const asset: Asset = {
      id: "asset-1",
      sourceBlockId: "block-img",
      contentVersion: "v1",
      kind: "image",
      publicUrl: "https://assets.example.edu/map.png",
      checksum: "abc123",
    };

    const searchEntry: SearchIndexEntry = {
      id: "search-1",
      schemaVersion: 1,
      contentVersion: "v1",
      pageId: "page-1",
      pageTitle: "校园生活指南",
      sectionPath: ["生活服务"],
      anchor: "b-block-1",
      plainText: "欢迎来到南昌大学",
      blockType: "paragraph",
      updatedAt: "2026-08-01T00:00:00.000Z",
    };

    expect(page.metadata.school).toBe("ncu");
    expect(block.type).toBe("paragraph");
    expect(asset.kind).toBe("image");
    expect(searchEntry.schemaVersion).toBe(1);
  });
});
