// 单测：测试 Supabase 线上发布块解码 (decodePublishedBlock)，校验历史 schema-v1 数据结构的兼容归一化
import { describe, expect, it } from "vitest";
import { decodePublishedBlock } from "@/lib/content/server";

describe("decodePublishedBlock", () => {
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
});
