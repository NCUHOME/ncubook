import { describe, expect, it, vi } from "vitest";
import { createNotionClient } from "@/lib/publishing/notion-client";

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "content-type": "application/json", ...init.headers },
  });
}

describe("Notion publication client", () => {
  it("reads every page of block children", async () => {
    const fetchImpl = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ results: [{ id: "block-1", has_children: false }], has_more: true, next_cursor: "cursor-2" }))
      .mockResolvedValueOnce(jsonResponse({ results: [{ id: "block-2", has_children: false }], has_more: false, next_cursor: null }));
    const client = createNotionClient({ token: "secret", fetchImpl });

    await expect(client.listBlockChildren("root-page")).resolves.toMatchObject([{ id: "block-1" }, { id: "block-2" }]);
    expect(fetchImpl).toHaveBeenNthCalledWith(1, "https://api.notion.com/v1/blocks/root-page/children?page_size=100", expect.any(Object));
    expect(fetchImpl).toHaveBeenNthCalledWith(2, "https://api.notion.com/v1/blocks/root-page/children?page_size=100&start_cursor=cursor-2", expect.any(Object));
  });

  it("recursively expands blocks that have children", async () => {
    const fetchImpl = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ results: [{ id: "column-list", type: "column_list", has_children: true }], has_more: false }))
      .mockResolvedValueOnce(jsonResponse({ results: [{ id: "column-1", type: "column", has_children: true }], has_more: false }))
      .mockResolvedValueOnce(jsonResponse({ results: [{ id: "paragraph-1", type: "paragraph", has_children: false }], has_more: false }));
    const client = createNotionClient({ token: "secret", fetchImpl });

    const tree = await client.readBlockTree("root-page");
    expect(tree[0].children[0].children[0]).toMatchObject({ id: "paragraph-1", children: [] });
  });

  it("honors Retry-After for a bounded rate-limit retry", async () => {
    const sleep = vi.fn(async () => undefined);
    const fetchImpl = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ message: "slow down" }, { status: 429, headers: { "retry-after": "2" } }))
      .mockResolvedValueOnce(jsonResponse({ id: "page-1", object: "page" }));
    const client = createNotionClient({ token: "secret", fetchImpl, sleep, maxRetries: 1 });

    await expect(client.retrievePage("page-1")).resolves.toMatchObject({ id: "page-1" });
    expect(sleep).toHaveBeenCalledWith(2000);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("never includes the authorization token in errors", async () => {
    const token = "notion-secret-value";
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ message: `invalid ${token}` }, { status: 401 }));
    const client = createNotionClient({ token, fetchImpl, maxRetries: 0 });

    await expect(client.retrievePage("page-1")).rejects.toThrow("Notion request failed with status 401");
    await expect(client.retrievePage("page-1")).rejects.not.toThrow(token);
  });
});
