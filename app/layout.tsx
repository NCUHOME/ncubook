// 根 Layout：全站 App HTML 壳骨架、Viewport 视角配置、Globals 样式导入与 Providers 全局 Context 挂载
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/app/providers";

export const metadata: Metadata = {
  title: "此间",
  description: "面向手机端的校园信息助手",
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
          <div className="mobile-shell">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
