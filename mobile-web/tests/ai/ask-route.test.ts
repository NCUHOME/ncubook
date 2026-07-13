import { describe, expect, it, vi } from "vitest";
import { ACTIVE_CONTENT_VERSION, createAnswerFixture, type AnswerSession } from "@/lib/answers/session";
import { createAskHandler, type AnswerService } from "@/lib/ai/answer-route";
import { ProviderError } from "@/lib/ai/provider";

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

  it("never exposes generated output in shadow mode", async () => {
    const answer = vi.fn<AnswerService>(async () => grounded());
    const response = await createAskHandler({ mode: "shadow", answer, allowRequest: () => true })(request({ question: "费用" }));
    expect(answer).toHaveBeenCalled();
    expect(await response.json()).toMatchObject({ confidence: "insufficient", claims: [], citations: [] });
  });
});
