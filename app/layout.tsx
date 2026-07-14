import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/app/providers";
import { loadPublishedRepository } from "@/lib/content/supabase-published-repository";

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

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const repository = await loadPublishedRepository();
  return (
    <html lang="zh-CN">
      <body>
        <Providers pageRoutes={repository.getPageRoutes()}><div className="mobile-shell">{children}</div></Providers>
      </body>
    </html>
  );
}
