import { describe, expect, it } from "vitest";
import { freshmanNotionBlocks } from "@/lib/content/notion-preview";

describe("Notion preview content", () => {
  it("keeps the complete freshman guide structure", () => {
    expect(freshmanNotionBlocks.length).toBeGreaterThan(250);
    expect(freshmanNotionBlocks.filter((block) => block.type === "heading")).toHaveLength(67);
    expect(freshmanNotionBlocks.filter((block) => block.type === "table")).toHaveLength(2);

    for (const anchor of [
      "b-freshman-fraud-h",
      "b-freshman-registration",
      "b-freshman-calendar",
      "b-freshman-map",
      "b-freshman-life",
      "b-freshman-study",
      "b-freshman-ending",
    ]) {
      expect(freshmanNotionBlocks.some((block) => block.anchor === anchor)).toBe(true);
    }
  });

  it("uses stable placeholders instead of temporary Notion assets", () => {
    const serialized = JSON.stringify(freshmanNotionBlocks);
    expect(serialized).not.toContain("prod-files-secure");
    expect(serialized).not.toContain("X-Amz-Credential");
    expect(serialized.match(/图片占位/g)).toHaveLength(20);
    expect(serialized.match(/附件占位/g)).toHaveLength(2);
  });

  it("preserves the prototype's nested lists and red emphasis", () => {
    const nestedList = freshmanNotionBlocks.find(
      (block) => block.type === "bulleted-list" && block.items.some((item) => item.children.length > 0),
    );
    expect(nestedList?.type).toBe("bulleted-list");

    const warning = freshmanNotionBlocks.find(
      (block) => block.type === "callout" && block.richText.some((part) => part.plainText.includes("任何在新生群")),
    );
    expect(warning).toMatchObject({ type: "callout", tone: "risk" });
    if (warning?.type === "callout") {
      expect(warning.richText[0]?.annotations).toMatchObject({ bold: true, color: "red" });
    }

    const emphasizedQuote = freshmanNotionBlocks.find(
      (block) => block.type === "quote" && block.richText.some((part) => part.plainText.includes("主动加好友")),
    );
    expect(emphasizedQuote?.type).toBe("quote");
    if (emphasizedQuote?.type === "quote") {
      expect(emphasizedQuote.richText[0]?.annotations.color).toBe("red");
    }
  });
});
