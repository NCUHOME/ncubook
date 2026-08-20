// 单测：测试飞书收集表 URL 自动预填（Prefill）构造器与参数映射规则
import { describe, expect, it } from "vitest";
import { getFeishuFeedbackUrl, getFeishuAdminWikiUrl } from "@/lib/feishu";

describe("feishu feedback url prefill helper", () => {
  it("builds document page feedback url with source and page title prefilled", () => {
    const urlString = getFeishuFeedbackUrl({
      source: "文档页",
      pageTitle: "校园环游车乘坐指南",
      pageSlug: "campus-shuttle",
    });

    const url = new URL(urlString);
    expect(url.searchParams.get("prefill_来源（自动填写）")).toBe("文档页");
    expect(url.searchParams.get("prefill_页面（自动填写）")).toBe("校园环游车乘坐指南 (/docs/campus-shuttle)");
  });

  it("builds AI answer feedback url with source and question prefilled", () => {
    const urlString = getFeishuFeedbackUrl({
      source: "AI",
      question: "环游车晚上几点停运？有什么注意事项？",
      pageTitle: "校园生活",
    });

    const url = new URL(urlString);
    expect(url.searchParams.get("prefill_来源（自动填写）")).toBe("AI");
    expect(url.searchParams.get("prefill_问题（自动填写）")).toBe("环游车晚上几点停运？有什么注意事项？");
  });

  it("truncates question to 200 characters if it exceeds limit", () => {
    const longQuestion = "a".repeat(300);
    const urlString = getFeishuFeedbackUrl({
      source: "AI",
      question: longQuestion,
    });

    const url = new URL(urlString);
    expect(url.searchParams.get("prefill_问题（自动填写）")?.length).toBe(200);
  });

  it("returns default admin wiki url", () => {
    const adminUrl = getFeishuAdminWikiUrl();
    expect(adminUrl).toContain("https://ncuhomer.feishu.cn/wiki/QFvewamk0i5MWvkI8zVcDxWcnPb");
  });
});
