import { describe, expect, it, vi } from "vitest";
import { auditPublishedFixture } from "@/lib/migration/check-links-assets";
import { publishedFixture } from "@/lib/content/published-fixtures";

describe("logged-out links and assets audit", () => {
  it("accepts controlled reachable assets and valid internal page links", async () => {
    const result = await auditPublishedFixture(publishedFixture, vi.fn(async () => ({ ok: true, status: 200 })));
    expect(result.ok).toBe(true);
  });

  it("rejects Notion temporary URLs, missing assets, and missing page targets", async () => {
    const fixture = structuredClone(publishedFixture);
    fixture.assets[0].publicUrl = "https://prod-files-secure.s3.us-west-2.amazonaws.com/signed";
    fixture.blocksByPageId["page-rich-content"].push({ id: "missing-link", anchor: "b-missing-link", type: "page-link", pageId: "missing-page", richText: [{ plainText: "缺失", annotations: {} }] });
    const result = await auditPublishedFixture(fixture, vi.fn(async () => ({ ok: false, status: 404 })));
    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining(["temporary-notion-url", "unreachable-asset", "missing-page-target"]));
  });

  it("audits asset references nested inside quotes", async () => {
    const fixture = structuredClone(publishedFixture);
    fixture.blocksByPageId["page-rich-content"] = [{
      id: "quote", anchor: "b-quote", type: "quote", richText: [{ plainText: "附件", annotations: {} }],
      children: [{ id: "missing-file", anchor: "b-missing-file", type: "file", assetId: "asset-missing", name: "缺失.pdf" }],
    }];

    const result = await auditPublishedFixture(fixture, vi.fn(async () => ({ ok: true, status: 200 })));

    expect(result.issues).toContainEqual({ code: "missing-asset-record", detail: "asset-missing" });
  });
});
