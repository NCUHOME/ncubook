// 根 Layout：全站 App HTML 壳骨架、Viewport 视角配置、Globals 样式导入与 Providers 全局 Context 挂载
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/app/providers";
import { getSiteUrl } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "此间 - 南昌大学校园知识库",
    template: "%s · 此间",
  },
  description: "面向手机端的南昌大学 AI 校园知识产品与可追溯问答助手",
  applicationName: "此间",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
    shortcut: "/icon.svg",
  },
  openGraph: {
    title: "此间 - 南昌大学校园知识库",
    description: "面向手机端的南昌大学 AI 校园知识产品与可追溯问答助手",
    siteName: "此间",
    locale: "zh_CN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "此间 - 南昌大学校园知识库",
    description: "面向手机端的南昌大学 AI 校园知识产品与可追溯问答助手",
  },
  other: {
    "itemprop:name": "此间 - 南昌大学校园知识库",
    "itemprop:description": "面向手机端的南昌大学 AI 校园知识产品与可追溯问答助手",
    "itemprop:image": `${getSiteUrl()}/opengraph-image`,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "white",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <Providers>
          <div className="mx-auto min-h-screen w-full max-w-shell bg-canvas">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
