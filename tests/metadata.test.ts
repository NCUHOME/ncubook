// 单测：测试 PWA Web App Manifest 与动态 OpenGraph 社交分享卡片元数据
import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";
import Image, { alt, contentType, size } from "@/app/opengraph-image";

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
});
