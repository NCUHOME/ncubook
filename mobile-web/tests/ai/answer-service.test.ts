import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createProvider: vi.fn(),
  getSupabaseAdmin: vi.fn(),
  createRepository: vi.fn(),
  retrieve: vi.fn(),
  ground: vi.fn(),
}));

vi.mock("@/lib/ai/provider", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/ai/provider")>(),
  createOpenAICompatibleProvider: mocks.createProvider,
}));
vi.mock("@/lib/db/supabase", () => ({ getSupabaseAdmin: mocks.getSupabaseAdmin }));
vi.mock("@/lib/ai/retrieve", () => ({
  createSupabaseRetrievalRepository: mocks.createRepository,
  retrieveGroundingSources: mocks.retrieve,
}));
vi.mock("@/lib/ai/ground-answer", () => ({ groundAnswer: mocks.ground }));

import { createProductionAnswerService } from "@/lib/ai/answer-service";

const originalEnvironment = { ...process.env };

describe("production answer service", () => {
  beforeEach(() => {
    process.env.AI_PROVIDER_BASE_URL = "https://api.deepseek.com";
    process.env.AI_PROVIDER_API_KEY = "test-key";
    process.env.AI_CHAT_MODEL = "deepseek-v4-flash";
    delete process.env.AI_EMBEDDING_MODEL;
    mocks.getSupabaseAdmin.mockReturnValue({ kind: "supabase" });
    mocks.createRepository.mockReturnValue({ getCurrentVersion: vi.fn(async () => "v2") });
    mocks.createProvider.mockReturnValue({ generateAnswer: vi.fn() });
    mocks.retrieve.mockResolvedValue([]);
    mocks.ground.mockResolvedValue({ id: "answer", confidence: "insufficient", claims: [], citations: [] });
  });

  afterEach(() => {
    process.env = { ...originalEnvironment };
    vi.clearAllMocks();
  });

  it("uses lexical retrieval when no embedding model is configured", async () => {
    const service = createProductionAnswerService();

    await service({ question: "环游车多少钱？" });

    expect(mocks.createProvider).toHaveBeenCalledWith(expect.objectContaining({
      baseUrl: "https://api.deepseek.com",
      chatModel: "deepseek-v4-flash",
      embeddingModel: undefined,
    }));
    expect(mocks.retrieve).toHaveBeenCalledWith(expect.objectContaining({ embedding: undefined }));
  });
});
