import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("AI server boundary", () => {
  it("guards provider modules and exposes no provider secrets through NEXT_PUBLIC variables", () => {
    const provider = readFileSync(resolve(process.cwd(), "lib/ai/provider.ts"), "utf8");
    const environment = readFileSync(resolve(process.cwd(), ".env.example"), "utf8");
    expect(provider).toContain('assertServerOnly("AI provider")');
    expect(environment).not.toMatch(/NEXT_PUBLIC_(?:AI|OPENAI|PROVIDER)/);
  });
});
