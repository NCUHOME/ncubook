import { readFileSync } from "node:fs";
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
});
