// 单元测试：校验飞书 BitTable (多维表格) 客户端集成 (lib/integrations/lark.ts) 环境变量校验、Access Token 获取、分页查询与卡片映射逻辑
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchLarkInformationCards } from "@/lib/integrations/lark";

describe("Lark (Feishu) Bitable integration client", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("throws error when Lark environment variables are missing", async () => {
    delete process.env.LARK_BASE_APP_TOKEN;
    delete process.env.LARK_BASE_TABLE_ID;
    delete process.env.LARK_APP_ID;
    delete process.env.LARK_APP_SECRET;

    await expect(fetchLarkInformationCards()).rejects.toThrow("Missing LARK_BASE_APP_TOKEN or LARK_BASE_TABLE_ID");

    process.env.LARK_BASE_APP_TOKEN = "app123";
    process.env.LARK_BASE_TABLE_ID = "tbl123";
    await expect(fetchLarkInformationCards()).rejects.toThrow("Missing LARK_APP_ID or LARK_APP_SECRET");
  });

  it("fetches tenant token and retrieves mapped information cards with pagination", async () => {
    process.env.LARK_BASE_APP_TOKEN = "app_test";
    process.env.LARK_BASE_TABLE_ID = "table_test";
    process.env.LARK_APP_ID = "cli_test";
    process.env.LARK_APP_SECRET = "sec_test";

    const fetchMock = vi.fn();
    global.fetch = fetchMock;

    // 1st call: tenant_access_token
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ code: 0, tenant_access_token: "t-mock-token" }),
    });

    // 2nd call: 1st page of bitable records (has_more: true)
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        code: 0,
        data: {
          items: [
            {
              record_id: "rec1",
              fields: {
                标题: "测试服务 1",
                分类: "生活服务",
                核心结论: "服务摘要 1",
                来源链接: "https://example.com/1",
              },
            },
          ],
          has_more: true,
          page_token: "page_token_2",
        },
      }),
    });

    // 3rd call: 2nd page of bitable records (has_more: false)
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        code: 0,
        data: {
          items: [
            {
              record_id: "rec2",
              fields: {
                标题: "测试服务 2",
                分类: "学术服务",
                核心结论: "服务摘要 2",
                来源链接: "https://example.com/2",
              },
            },
          ],
          has_more: false,
          page_token: "",
        },
      }),
    });

    const cards = await fetchLarkInformationCards();

    expect(fetchMock).toHaveBeenCalledTimes(3);

    // Verify token request
    expect(fetchMock.mock.calls[0][0]).toBe("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ app_id: "cli_test", app_secret: "sec_test" });

    // Verify bitable requests
    expect(fetchMock.mock.calls[1][0].toString()).toContain("page_size=100");
    expect(fetchMock.mock.calls[2][0].toString()).toContain("page_token=page_token_2");

    expect(cards).toHaveLength(2);
    expect(cards[0]).toMatchObject({ slug: "rec1", title: "测试服务 1", category: "生活服务" });
    expect(cards[1]).toMatchObject({ slug: "rec2", title: "测试服务 2", category: "学术服务" });
  });

  it("throws error when Lark tenant token request fails", async () => {
    process.env.LARK_BASE_APP_TOKEN = "app_test";
    process.env.LARK_BASE_TABLE_ID = "table_test";
    process.env.LARK_APP_ID = "cli_test";
    process.env.LARK_APP_SECRET = "sec_test";

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ code: 99991663, msg: "app_secret error" }),
    });

    await expect(fetchLarkInformationCards()).rejects.toThrow("app_secret error");
  });
});
