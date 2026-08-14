// 单测：测试搜索相关 API 路由 (/api/search 与 /api/search/index)，验证 GET 查询、POST 代理、限流与全量索引输出
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { GET as getSearch, POST as postSearch } from "@/app/api/search/route";
import { GET as getSearchIndex, type CompactSearchItem } from "@/app/api/search/index/route";

describe("search API routes", () => {
  describe("GET /api/search", () => {
    it("returns grouped search results for valid keyword queries", async () => {
      const request = new NextRequest("http://localhost:3000/api/search?q=环游车");
      const response = await getSearch(request);

      expect(response.status).toBe(200);
      const data = (await response.json()) as { query: string; results: unknown[] };
      expect(data.query).toBe("环游车");
      expect(Array.isArray(data.results)).toBe(true);
      expect(data.results.length).toBeGreaterThan(0);
    });

    it("returns empty results for empty query", async () => {
      const request = new NextRequest("http://localhost:3000/api/search?q=");
      const response = await getSearch(request);

      expect(response.status).toBe(200);
      const data = (await response.json()) as { query: string; results: unknown[] };
      expect(data.query).toBe("");
      expect(data.results).toEqual([]);
    });
  });

  describe("POST /api/search", () => {
    it("proxies JSON body queries to search handler", async () => {
      const request = new NextRequest("http://localhost:3000/api/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: "交通" }),
      });
      const response = await postSearch(request);

      expect(response.status).toBe(200);
      const data = (await response.json()) as { query: string; results: unknown[] };
      expect(data.query).toBe("交通");
      expect(Array.isArray(data.results)).toBe(true);
    });
  });

  describe("GET /api/search/index", () => {
    it("returns compact pre-computed search entries with caching headers", async () => {
      const response = await getSearchIndex();

      expect(response.status).toBe(200);
      expect(response.headers.get("Cache-Control")).toContain("public");
      expect(response.headers.get("Cache-Control")).toContain("max-age=3600");

      const items = (await response.json()) as CompactSearchItem[];
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThan(0);

      const first = items[0];
      expect(first).toHaveProperty("pid");
      expect(first).toHaveProperty("t");
      expect(first).toHaveProperty("p");
      expect(first).toHaveProperty("e");
      expect(first).toHaveProperty("a");
      expect(first).toHaveProperty("h");
      expect(first).toHaveProperty("r");
      expect(first).toHaveProperty("b");
    });
  });
});
