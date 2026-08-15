// PWA Web App Manifest 路由 (/manifest.webmanifest)
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "此间 - 南昌大学校园知识库",
    short_name: "此间",
    description: "面向手机端的南昌大学 AI 校园知识产品与可追溯问答助手",
    start_url: "/",
    display: "standalone",
    // PWA Manifest 无法直接解析 CSS 变量，严格对应 tokens.json 中的 color.canvas (#ffffff)
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
