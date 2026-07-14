import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/search/route";

describe("keyword search API boundary", () => {
  it("returns only query and original block results", async () => {
    const response = await GET(new NextRequest("http://localhost/api/search?q=环游车"));
    const payload = await response.json();

    expect(Object.keys(payload).sort()).toEqual(["query", "results"]);
    expect(payload.results[0]).toMatchObject({
      pageTitle: "校园环游车乘坐指南",
      anchor: "b-shuttle-intro",
    });
    expect(payload.results[0].excerpt).toContain("环游车");
  });
});
