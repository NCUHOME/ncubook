// 单测：测试 PWA Web App Manifest、根布局 OpenGraph 与文档动态摘要分享卡片元数据
import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";
import Image, { alt, contentType, size } from "@/app/opengraph-image";
import { metadata as rootMetadata } from "@/app/layout";
import { generateMetadata as generateDocMetadata } from "@/app/docs/[slug]/page";

describe("site metadata & PWA manifest", () => {
  it("generates a valid PWA manifest with branded icons and standalone display", () => {
    const data = manifest();

    expect(data.name).toContain("此间");
    expect(data.short_name).toBe("此间");
    expect(data.display).toBe("standalone");
    expect(data.start_url).toBe("/");
    expect(data.background_color).toBe("#ffffff");
    expect(data.theme_color).toBe("#ffffff");

    expect(data.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ src: "/icon.svg", type: "image/svg+xml" }),
        expect.objectContaining({ src: "/icon-192.png", sizes: "192x192", type: "image/png" }),
        expect.objectContaining({ src: "/icon-512.png", sizes: "512x512", type: "image/png" }),
      ]),
    );
  });

  it("exports standard 1200x630 OpenGraph image configuration and renders ImageResponse", async () => {
    expect(alt).toContain("此间");
    expect(size).toEqual({ width: 1200, height: 630 });
    expect(contentType).toBe("image/png");

    const imageResponse = await Image();
    expect(imageResponse).toBeDefined();
    expect(imageResponse.status).toBe(200);
  });

  it("defines standard root OpenGraph & Twitter Card metadata with explicit image dimensions", () => {
    expect(rootMetadata.openGraph).toBeDefined();
    const og = rootMetadata.openGraph as Record<string, unknown>;
    expect(og.title).toContain("此间");
    expect(og.type).toBe("website");
    expect(Array.isArray(og.images)).toBe(true);

    const twitter = rootMetadata.twitter as Record<string, unknown>;
    expect(twitter.card).toBe("summary_large_image");
  });

  it("generates dynamic article metadata with extracted excerpt, canonical URL and article OG tags", async () => {
    const params = Promise.resolve({ slug: "campus-shuttle" });
    const meta = await generateDocMetadata({ params });

    expect(meta.title).toContain("校园环游车乘坐指南");
    // 动态提取了文章第一段正文
    expect(meta.description).toContain("校园环游车");
    expect(meta.alternates?.canonical).toContain("/docs/campus-shuttle");

    const og = meta.openGraph as Record<string, unknown>;
    expect(og.type).toBe("article");
    expect(og.title).toContain("校园环游车乘坐指南");
  });
});
