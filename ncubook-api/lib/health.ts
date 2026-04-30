import {
    resolveChatModelConfig,
    resolveEmbeddingModelConfig,
} from "@/lib/gemini";

type HealthEnv = Record<string, string | undefined>;

function hasValue(value: string | undefined) {
    return Boolean(value?.trim());
}

function isEnabled(value: string | undefined) {
    return value?.trim().toLowerCase() === "true";
}

export function buildHealthSnapshot(env: HealthEnv = process.env, now = new Date().toISOString()) {
    const chatConfig = resolveChatModelConfig(env);
    const embeddingConfig = resolveEmbeddingModelConfig(env);
    const chatConfigured =
        chatConfig.providerLabel === "openai-compatible"
            ? hasValue(env.OPENAI_COMPATIBLE_API_KEY)
            : hasValue(env.DEEPSEEK_API_KEY);
    const embeddingConfigured =
        embeddingConfig.providerLabel === "openai-compatible"
            ? hasValue(env.OPENAI_COMPATIBLE_API_KEY) && hasValue(env.OPENAI_COMPATIBLE_EMBEDDING_MODEL)
            : hasValue(env.GOOGLE_GENERATIVE_AI_API_KEY);

    const missingRequired = [
        !hasValue(env.SUPABASE_URL) ? "SUPABASE_URL" : null,
        !hasValue(env.SUPABASE_SERVICE_ROLE_KEY) ? "SUPABASE_SERVICE_ROLE_KEY" : null,
        !chatConfigured ? "CHAT_MODEL_API_KEY" : null,
        !embeddingConfigured ? "GOOGLE_GENERATIVE_AI_API_KEY" : null,
    ].filter(Boolean) as string[];

    const warnings = [
        !hasValue(env.ADMIN_TOKEN) ? "ADMIN_TOKEN is not set; admin routes should be protected before public launch." : null,
        !hasValue(env.OPS_READ_TOKEN) ? "OPS_READ_TOKEN is not set; ops summary is publicly readable." : null,
        !hasValue(env.CRON_SECRET) ? "CRON_SECRET is not set; cron endpoint should be protected before production use." : null,
    ].filter(Boolean) as string[];

    return {
        status: missingRequired.length === 0 ? "ok" : "degraded",
        checkedAt: now,
        missingRequired,
        warnings,
        services: {
            supabase: {
                configured: hasValue(env.SUPABASE_URL) && hasValue(env.SUPABASE_SERVICE_ROLE_KEY),
            },
            chatModel: {
                configured: chatConfigured,
                provider: chatConfig.providerLabel,
                model: chatConfig.model,
                wireAPI: chatConfig.wireAPI,
            },
            embedding: {
                configured: embeddingConfigured,
                provider: embeddingConfig.providerLabel,
                model: embeddingConfig.model,
            },
            admin: {
                protected: hasValue(env.ADMIN_TOKEN),
            },
            ops: {
                protected: hasValue(env.OPS_READ_TOKEN),
            },
            cron: {
                protected: hasValue(env.CRON_SECRET),
            },
            feishuSync: {
                enabled: isEnabled(env.LARK_FEEDBACK_SYNC_ENABLED),
            },
        },
    };
}
