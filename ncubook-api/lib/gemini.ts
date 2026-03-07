import { google } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { embed } from "ai";

const deepseek = createOpenAI({
    baseURL: "https://api.deepseek.com/v1",
    apiKey: process.env.DEEPSEEK_API_KEY,
});

/**
 * 使用 Gemini text-embedding-004 生成文本向量 (768 维)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    const { embedding } = await embed({
        model: google.textEmbeddingModel("gemini-embedding-001"),
        value: text,
    });
    return embedding;
}

/**
 * 聊天模型 (DeepSeek via OpenAI-compatible API)
 */
export function getChatModel() {
    return deepseek.chat("deepseek-chat");
}
