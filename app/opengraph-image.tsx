// 全站静态 OpenGraph / 微信 / QQ 分享卡片生成器 (1200x630)，构建期预渲染
import { ImageResponse } from "next/og";
import tokens from "@/docs/design/tokens.json";
import { getSiteHost } from "@/lib/site";

export const alt = "此间 - 南昌大学校园知识库";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  const canvasColor = tokens.color.canvas.$value;
  const textColor = tokens.color.text.$value;
  const mutedColor = tokens.color.textMuted.$value;
  const borderColor = tokens.color.border.$value;
  const subtleColor = tokens.color.surfaceSubtle.$value;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "space-between",
          backgroundColor: canvasColor,
          padding: "80px",
          fontFamily: "sans-serif",
          border: `16px solid ${textColor}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "16px",
              backgroundColor: textColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: canvasColor,
              fontSize: "36px",
              fontWeight: 700,
            }}
          >
            此
          </div>
          <span
            style={{
              fontSize: "32px",
              fontWeight: 600,
              color: textColor,
              letterSpacing: "2px",
            }}
          >
            此间 · NCU BOOK
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <h1
            style={{
              fontSize: "64px",
              fontWeight: 800,
              color: textColor,
              lineHeight: 1.15,
              margin: 0,
            }}
          >
            南昌大学校园知识库
          </h1>
          <p
            style={{
              fontSize: "28px",
              color: mutedColor,
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            移动优先 · 可溯源 AI 问答 · 权威原文档阅读
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            borderTop: `2px solid ${borderColor}`,
            paddingTop: "28px",
          }}
        >
          <span style={{ fontSize: "22px", color: mutedColor }}>
            南昌大学开源软件协会 (NCUHOME)
          </span>
          <span
            style={{
              fontSize: "20px",
              backgroundColor: subtleColor,
              padding: "8px 20px",
              borderRadius: "999px",
              color: textColor,
              fontWeight: 600,
              border: `1px solid ${borderColor}`,
            }}
          >
            {getSiteHost()}
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
