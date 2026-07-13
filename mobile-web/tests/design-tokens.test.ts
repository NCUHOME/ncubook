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

  it("provides isolated review frames at all approved mobile widths", () => {
    const reviewPage = resolve(process.cwd(), "app/design-system/page.tsx");
    const reviewSamples = resolve(process.cwd(), "src/components/design-system/ReviewSamples.tsx");
    expect(existsSync(reviewPage)).toBe(true);
    expect(existsSync(reviewSamples)).toBe(true);
    expect(readFileSync(reviewPage, "utf8")).toContain("<ReviewSamples");
    const source = readFileSync(reviewSamples, "utf8");
    expect(source).toContain("const widths = [360, 390, 430]");
    expect(source).toContain("data-review-width={String(width)}");
  });

  it("prevents new review components from bypassing semantic tokens", () => {
    const roots = [resolve(process.cwd(), "app/design-system"), resolve(process.cwd(), "src/components")];
    const files = roots.flatMap((root) => collectTsx(root));
    const forbidden = [
      /#[0-9a-f]{3,8}/i,
      /rgba?\(/i,
      /--(?:green|paper)/,
      /(?:bg|text|border|p|m[trblxy]?|gap|rounded|shadow|z)-\[[^\]]+\]/,
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
