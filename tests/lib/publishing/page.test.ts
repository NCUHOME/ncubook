// 单测：测试单篇 Notion 页面规范化解析器，验证标题清洗、合法 Slug 生成与风险等级元数据标准化
import { describe, expect, it } from "vitest";
import { normalizeNotionPage } from "@/lib/publishing/page";

describe("Notion page normalization", () => {
  it("uses the Notion page tree as stable published identity and hierarchy", () => {
    const page = normalizeNotionPage({
      id: "page-campus-transport",
      object: "page",
      parent: { type: "page_id", page_id: "section-campus-life" },
      last_edited_time: "2026-07-13T10:00:00.000Z",
      properties: {
        title: {
          type: "title",
          title: [{ plain_text: "校园交通", annotations: { bold: false } }],
        },
      },
    }, {
      contentVersion: "content-2026-07-13-1",
      slug: "campus-transport",
      lastPublishedAt: "2026-07-13T11:00:00.000Z",
      metadata: { topics: ["生活", "交通"], sourceUrls: ["https://ncu.edu.cn/transport"] },
    });

    expect(page).toMatchObject({
      id: "page-campus-transport",
      parentId: "section-campus-life",
      title: "校园交通",
      slug: "campus-transport",
      status: "published",
      schemaVersion: 1,
      contentVersion: "content-2026-07-13-1",
      metadata: {
        school: "ncu",
        topics: ["生活", "交通"],
        sourceUrls: ["https://ncu.edu.cn/transport"],
        riskLevel: "normal",
      },
    });
  });

  it("rejects pages without a title or stable identity", () => {
    expect(() => normalizeNotionPage({ id: "", properties: {} }, {
      contentVersion: "v1", slug: "missing", lastPublishedAt: "2026-07-13T11:00:00.000Z",
    })).toThrow(/page id/i);
    expect(() => normalizeNotionPage({ id: "page-1", properties: {} }, {
      contentVersion: "v1", slug: "missing", lastPublishedAt: "2026-07-13T11:00:00.000Z",
    })).toThrow(/title/i);
  });
});
