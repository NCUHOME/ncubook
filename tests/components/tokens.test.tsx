// 单测：测试设计系统令牌契约 (tokens.json & globals.css)，校验纯白 Canvas、单色 Action 与禁止原生硬编码样式规则
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("editorial monochrome token contract", () => {
  const css = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");

  it("uses a pure-white canvas and monochrome actions", () => {
    expect(css).toContain("--canvas: #ffffff");
    expect(css).toContain("--action: #111111");
    expect(css).not.toContain("--green:");
    expect(css).not.toContain("linear-gradient");
  });

  it("maps every visual role used by the approved components", () => {
    for (const token of [
      "--color-action-subtle",
      "--color-info",
      "--font-body",
      "--text-display",
      "--spacing-tap",
      "--radius-round",
      "--shadow-floating",
      "@utility z-drawer",
      "@utility z-modal",
    ]) {
      expect(css).toContain(token);
    }
  });

  it("prevents application components from bypassing semantic tokens", () => {
    const roots = [resolve(process.cwd(), "app"), resolve(process.cwd(), "src")];
    const files = roots.flatMap((root) => collectTsx(root));
    const forbidden = [
      /#[0-9a-f]{3,8}/i,
      /rgba?\(/i,
      /--(?:green|paper)/,
      /(?:bg|text|border|p|m[trblxy]?|gap|rounded|shadow|z|w|h|max-w|max-h|min-w|min-h)-\[[^\]]+\]/,
      /\btext-(?:xs|sm|base|lg|xl|[2-9]xl)\b/,
      /\b(?:p|m[trblxy]?|gap)-\d+\b/,
      /\brounded-(?:sm|md|lg|xl|2xl|3xl|full)\b/,
      /\bshadow-(?:sm|md|lg|xl|2xl)\b/,
      /\bz-\d+\b/,
    ];

    for (const file of files) {
      const source = readFileSync(file, "utf8");
      for (const pattern of forbidden) expect(source, `${file} violates ${pattern}`).not.toMatch(pattern);
    }
  });
});

function collectTsx(root: string): string[] {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(root, entry.name);
    if (entry.isDirectory()) return collectTsx(path);
    return entry.isFile() && entry.name.endsWith(".tsx") ? [path] : [];
  });
}
