// 单测：测试 /api/ask 路由 Handler 的请求体校验、页面上下文解析、速率限制 (Rate Limit) 与错误响应格式
import { describe, expect, it, vi } from "vitest";
import { ACTIVE_CONTENT_VERSION, createAnswerFixture, type AnswerSession } from "@/lib/ai/session";
import { createAskHandler, clearExactAnswerCache, createSupabaseRateLimiter, type AnswerService } from "@/lib/ai/ask";
import { ProviderError } from "@/lib/ai/provider";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

function request(body: unknown, ip = "192.0.2.10") {
  return new Request("http://localhost/api/ask", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

const grounded = (): AnswerSession => createAnswerFixture("环游车怎么付费？", { pageId: "page-campus-shuttle", anchor: "b-fare" });

describe("production ask boundary", () => {
  it("passes a valid question and page/anchor context to the answer service", async () => {
    const answer = vi.fn<AnswerService>(async () => grounded());
    const response = await createAskHandler({ mode: "production", answer, allowRequest: () => true })(request({ question: " 环游车怎么付费？ ", pageContext: { pageId: "page-campus-shuttle", anchor: "b-fare" } }));
    expect(response.status).toBe(200);
    expect(answer).toHaveBeenCalledWith({ question: "环游车怎么付费？", pageContext: { pageId: "page-campus-shuttle", anchor: "b-fare" } });
    expect(await response.json()).toMatchObject({ confidence: "grounded", citations: expect.arrayContaining([expect.objectContaining({ anchor: "b-fare", contentVersion: ACTIVE_CONTENT_VERSION })]) });
  });

  it("rejects empty questions and invalid contexts", async () => {
    const handler = createAskHandler({ mode: "production", answer: vi.fn<AnswerService>(), allowRequest: () => true });
    expect((await handler(request({ question: "  " }))).status).toBe(400);
    expect((await handler(request({ question: "费用", pageContext: { pageId: "p", anchor: "bad" } }))).status).toBe(400);
  });

  it("enforces rate limits before calling the provider", async () => {
    const answer = vi.fn<AnswerService>();
    const response = await createAskHandler({ mode: "production", answer, allowRequest: () => false })(request({ question: "费用" }));
    expect(response.status).toBe(429);
    expect(answer).not.toHaveBeenCalled();
  });

  it("maps provider timeouts to a typed temporary failure", async () => {
    const answer = vi.fn<AnswerService>(async () => { throw new ProviderError("timeout"); });
    const response = await createAskHandler({ mode: "production", answer, allowRequest: () => true })(request({ question: "费用" }));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: "answer_temporarily_unavailable" });
  });

  it("supports shadow mode: returns production answers on success and falls back to fixture on failure", async () => {
    const successAnswer = vi.fn<AnswerService>(async () => grounded());
    const telemetryLogs: unknown[] = [];
    const recordTelemetry = (e: unknown) => { telemetryLogs.push(e); };

    const successHandler = createAskHandler({ mode: "shadow", answer: successAnswer, allowRequest: () => true, recordTelemetry });
    const successRes = await successHandler(request({ question: "环游车怎么付费？" }));
    expect(successRes.status).toBe(200);
    expect(successAnswer).toHaveBeenCalledTimes(1);
    expect(telemetryLogs).toContainEqual(expect.objectContaining({ mode: "shadow", confidence: "grounded" }));

    // Shadow mode fallback on provider failure
    const failingAnswer = vi.fn<AnswerService>(async () => { throw new Error("RAG upstream offline"); });
    const failingHandler = createAskHandler({ mode: "shadow", answer: failingAnswer, allowRequest: () => true, recordTelemetry });
    const fallbackRes = await failingHandler(request({ question: "环游车怎么付费？" }));
    expect(fallbackRes.status).toBe(200);
    const body = await fallbackRes.json();
    expect(body).toMatchObject({ confidence: expect.any(String) });
    expect(telemetryLogs).toContainEqual(expect.objectContaining({ mode: "shadow", confidence: "error" }));
  });

  it("supports clearing exact answer cache without throwing", () => {
    expect(() => clearExactAnswerCache()).not.toThrow();
  });

  it("enforces cross-instance rate limits via createSupabaseRateLimiter", async () => {
    const mockRpc = vi.fn().mockResolvedValueOnce({ data: 5, error: null }).mockResolvedValueOnce({ data: 11, error: null });
    const mockClient = { rpc: mockRpc } as unknown as SupabaseClient<Database>;
    const limiter = createSupabaseRateLimiter(mockClient, 10);

    const allowed = await limiter(request({ question: "测试1" }, "192.168.1.1"));
    expect(allowed).toBe(true);
    expect(mockRpc).toHaveBeenCalledWith("consume_ask_rate_limit", expect.objectContaining({ p_minute_window: expect.any(Number) }));

    const rejected = await limiter(request({ question: "测试2" }, "192.168.1.1"));
    expect(rejected).toBe(false);
  });

  it("fails open and logs warning when Supabase rate limit RPC encounters an error", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const mockRpc = vi.fn().mockResolvedValueOnce({ data: null, error: { message: "connection timeout" } });
    const mockClient = { rpc: mockRpc } as unknown as SupabaseClient<Database>;
    const limiter = createSupabaseRateLimiter(mockClient, 10);

    const allowed = await limiter(request({ question: "测试" }));
    expect(allowed).toBe(true);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("rate_limit_ledger_unavailable"));
    consoleSpy.mockRestore();
  });
});
