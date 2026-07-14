import { describe, expect, it, vi } from "vitest";
import { createOpenAICompatibleProvider, ProviderError } from "@/lib/ai/provider";

const modelBody = (content: string, finishReason = "stop") => ({ choices: [{ finish_reason: finishReason, message: { content } }], usage: { prompt_tokens: 10, completion_tokens: 8 } });
const validAnswer = JSON.stringify({ confidence: "grounded", claims: [{ id: "c1", text: "单次收费 0.9 元", sourceIds: ["s1"], status: "grounded" }] });

function provider(fetchImpl: typeof fetch, overrides: Partial<Parameters<typeof createOpenAICompatibleProvider>[0]> = {}) {
  return createOpenAICompatibleProvider({
    baseUrl: "https://provider.example/v1",
    apiKey: "secret-provider-key",
    chatModel: "chat-model",
    embeddingModel: "embed-model",
    fetchImpl,
    timeoutMs: 50,
    sleep: async () => undefined,
    ...overrides,
  });
}

describe("structured AI provider", () => {
  it("generates non-thinking DeepSeek answers without an embedding model", async () => {
    const fetchImpl = vi.fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify(modelBody(validAnswer)), { status: 200 }));
    const client = provider(fetchImpl, { chatModel: "deepseek-v4-flash", embeddingModel: undefined });

    await expect(client.generateAnswer({ system: "system", user: "user", maxOutputTokens: 100 })).resolves.toMatchObject({ confidence: "grounded" });
    expect(client).not.toHaveProperty("embed");
    const request = JSON.parse(String(fetchImpl.mock.calls[0]?.[1]?.body)) as Record<string, unknown>;
    expect(request).toMatchObject({
      model: "deepseek-v4-flash",
      thinking: { type: "disabled" },
      response_format: { type: "json_object" },
    });
  });

  it("parses the strict claim schema and embeddings", async () => {
    const fetchImpl = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify(modelBody(validAnswer)), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ index: 0, embedding: [0.1, 0.2] }] }), { status: 200 }));
    const client = provider(fetchImpl);

    await expect(client.generateAnswer({ system: "system", user: "user", maxOutputTokens: 100 })).resolves.toMatchObject({ confidence: "grounded", claims: [{ sourceIds: ["s1"] }] });
    await expect(client.embed?.(["环游车"])).resolves.toEqual([[0.1, 0.2]]);
  });

  it("rejects non-JSON, schema mismatch, and token truncation", async () => {
    const nonJson = provider(vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(modelBody("not json")), { status: 200 })));
    await expect(nonJson.generateAnswer({ system: "", user: "", maxOutputTokens: 10 })).rejects.toEqual(new ProviderError("invalid-response"));

    const invalid = provider(vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(modelBody(JSON.stringify({ confidence: "grounded", claims: [{ text: 3 }] }))), { status: 200 })));
    await expect(invalid.generateAnswer({ system: "", user: "", maxOutputTokens: 10 })).rejects.toEqual(new ProviderError("invalid-response"));

    const truncated = provider(vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(modelBody(validAnswer, "length")), { status: 200 })));
    await expect(truncated.generateAnswer({ system: "", user: "", maxOutputTokens: 10 })).rejects.toEqual(new ProviderError("truncated"));
  });

  it("retries one eligible 429/5xx response and then succeeds", async () => {
    const fetchImpl = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("busy", { status: 429 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(modelBody(validAnswer)), { status: 200 }));

    await expect(provider(fetchImpl).generateAnswer({ system: "", user: "", maxOutputTokens: 10 })).resolves.toMatchObject({ confidence: "grounded" });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("returns typed timeout and unavailable errors without leaking the API key", async () => {
    const timeoutFetch = vi.fn<typeof fetch>().mockRejectedValue(new DOMException("aborted", "AbortError"));
    const unavailableFetch = vi.fn<typeof fetch>().mockResolvedValue(new Response("secret-provider-key upstream", { status: 503 }));

    const timeout = await provider(timeoutFetch).generateAnswer({ system: "", user: "", maxOutputTokens: 10 }).catch((error: unknown) => error);
    const unavailable = await provider(unavailableFetch).generateAnswer({ system: "", user: "", maxOutputTokens: 10 }).catch((error: unknown) => error);

    expect(timeout).toEqual(new ProviderError("timeout"));
    expect(unavailable).toEqual(new ProviderError("unavailable"));
    expect(String(timeout)).not.toContain("secret-provider-key");
    expect(String(unavailable)).not.toContain("secret-provider-key");
  });
});
