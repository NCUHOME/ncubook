import assert from "node:assert/strict";
import {
    hasChatModelConfig,
    resolveChatModelConfig,
    resolveEmbeddingModelConfig,
} from "../lib/gemini";

assert.deepEqual(
    resolveChatModelConfig({
        OPENAI_COMPATIBLE_BASE_URL: "https://relay.example.com/v1",
        OPENAI_COMPATIBLE_API_KEY: "relay-key",
        OPENAI_COMPATIBLE_CHAT_MODEL: "gpt-5.4",
    }),
    {
        baseURL: "https://relay.example.com/v1",
        apiKey: "relay-key",
        model: "gpt-5.4",
        wireAPI: "responses",
        providerLabel: "openai-compatible",
    }
);

assert.deepEqual(
    resolveChatModelConfig({
        OPENAI_COMPATIBLE_BASE_URL: "https://relay.example.com/v1",
        OPENAI_COMPATIBLE_API_KEY: "relay-key",
        OPENAI_COMPATIBLE_CHAT_MODEL: "gpt-5.4",
        OPENAI_COMPATIBLE_WIRE_API: "chat",
    }),
    {
        baseURL: "https://relay.example.com/v1",
        apiKey: "relay-key",
        model: "gpt-5.4",
        wireAPI: "chat",
        providerLabel: "openai-compatible",
    }
);

assert.deepEqual(
    resolveChatModelConfig({
        DEEPSEEK_API_KEY: "deepseek-key",
    }),
    {
        baseURL: "https://api.deepseek.com/v1",
        apiKey: "deepseek-key",
        model: "deepseek-chat",
        wireAPI: "chat",
        providerLabel: "deepseek",
    }
);

assert.deepEqual(
    resolveEmbeddingModelConfig({
        OPENAI_COMPATIBLE_BASE_URL: "https://relay.example.com/v1",
        OPENAI_COMPATIBLE_API_KEY: "relay-key",
    }),
    {
        providerLabel: "google",
        model: "gemini-embedding-001",
    }
);

assert.deepEqual(
    resolveEmbeddingModelConfig({
        OPENAI_COMPATIBLE_BASE_URL: "https://relay.example.com/v1",
        OPENAI_COMPATIBLE_API_KEY: "relay-key",
        OPENAI_COMPATIBLE_EMBEDDING_MODEL: "text-embedding-3-large",
    }),
    {
        providerLabel: "openai-compatible",
        baseURL: "https://relay.example.com/v1",
        apiKey: "relay-key",
        model: "text-embedding-3-large",
    }
);

assert.deepEqual(
    resolveEmbeddingModelConfig({
        OPENAI_COMPATIBLE_BASE_URL: "https://relay.example.com/v1",
        OPENAI_COMPATIBLE_API_KEY: "relay-key",
        OPENAI_COMPATIBLE_EMBEDDING_MODEL: "custom-embedding-3072",
    }),
    {
        providerLabel: "openai-compatible",
        baseURL: "https://relay.example.com/v1",
        apiKey: "relay-key",
        model: "custom-embedding-3072",
    }
);

assert.deepEqual(resolveEmbeddingModelConfig({}), {
    providerLabel: "google",
    model: "gemini-embedding-001",
});

assert.equal(hasChatModelConfig({ OPENAI_COMPATIBLE_API_KEY: "relay-key" }), true);
assert.equal(hasChatModelConfig({ DEEPSEEK_API_KEY: "deepseek-key" }), true);
assert.equal(hasChatModelConfig({}), false);

console.log("chat model config tests passed");
