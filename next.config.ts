// 框架配置：Next.js 应用构建、安全 Header 与全局 HTTP 301 静态重定向 (Redirects) 机制
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  outputFileTracingRoot: process.cwd(),
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/cards/campus-transport",
        destination: "/docs/campus-shuttle",
        permanent: true,
      },
      {
        source: "/cards/:slug*",
        destination: "/sections/campus-life",
        permanent: true,
      },
      {
        source: "/topics/:slug*",
        destination: "/sections/campus-life",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
