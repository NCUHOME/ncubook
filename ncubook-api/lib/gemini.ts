import { google } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { embed } from "ai";

type ChatModelEnv = Record<string, string | undefined>;

export function resolveChatModelConfig(env: ChatModelEnv = process.env) {
    const relayApiKey = env.OPENAI_COMPATIBLE_API_KEY?.trim();
    if (relayApiKey) {
        return {
            baseURL: env.OPENAI_COMPATIBLE_BASE_URL?.trim() || "https://api.openai.com/v1",
            apiKey: relayApiKey,
            model: env.OPENAI_COMPATIBLE_CHAT_MODEL?.trim() || "gpt-4o-mini",
            wireAPI: env.OPENAI_COMPATIBLE_WIRE_API?.trim() === "chat" ? "chat" : "responses",
            providerLabel: "openai-compatible",
        };
    }

    return {
        baseURL: "https://api.deepseek.com/v1",
        apiKey: env.DEEPSEEK_API_KEY?.trim(),
        model: "deepseek-chat",
        wireAPI: "chat",
        providerLabel: "deepseek",
    };
}

export function hasChatModelConfig(env: ChatModelEnv = process.env) {
    return Boolean(env.OPENAI_COMPATIBLE_API_KEY?.trim() || env.DEEPSEEK_API_KEY?.trim());
}

export function resolveEmbeddingModelConfig(env: ChatModelEnv = process.env) {
    const relayApiKey = env.OPENAI_COMPATIBLE_API_KEY?.trim();
    const relayEmbeddingModel = env.OPENAI_COMPATIBLE_EMBEDDING_MODEL?.trim();
    if (relayApiKey && relayEmbeddingModel) {
        return {
            providerLabel: "openai-compatible",
            baseURL: env.OPENAI_COMPATIBLE_BASE_URL?.trim() || "https://api.openai.com/v1",
            apiKey: relayApiKey,
            model: relayEmbeddingModel,
        };
    }

    return {
        providerLabel: "google",
        model: "gemini-embedding-001",
    };
}

/**
 * 使用 Gemini embedding-001 生成文本向量 (3072 维)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    const config = resolveEmbeddingModelConfig();
    if (config.providerLabel === "openai-compatible") {
        const provider = createOpenAI({
            baseURL: config.baseURL,
            apiKey: config.apiKey,
        });
        const { embedding } = await embed({
            model: provider.embedding(config.model),
            value: text,
        });
        return embedding;
    }

    const { embedding } = await embed({
        model: google.textEmbeddingModel("gemini-embedding-001"),
        value: text,
    });
    return embedding;
}

/**
 * 聊天模型 (OpenAI-compatible API; DeepSeek remains the default fallback)
 */
export function getChatModel() {
    const config = resolveChatModelConfig();
    const provider = createOpenAI({
        baseURL: config.baseURL,
        apiKey: config.apiKey,
    });

    return config.wireAPI === "responses"
        ? provider.responses(config.model)
        : provider.chat(config.model);
}
