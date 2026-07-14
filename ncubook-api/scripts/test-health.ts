import assert from "node:assert/strict";
import { buildHealthSnapshot } from "../lib/health";

const healthy = buildHealthSnapshot(
    {
        SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "service-role",
        GOOGLE_GENERATIVE_AI_API_KEY: "google-key",
        OPENAI_COMPATIBLE_API_KEY: "relay-key",
        OPENAI_COMPATIBLE_BASE_URL: "https://relay.example.com",
        OPENAI_COMPATIBLE_CHAT_MODEL: "gpt-5.4",
        OPENAI_COMPATIBLE_WIRE_API: "responses",
        ADMIN_TOKEN: "admin-token",
        OPS_READ_TOKEN: "ops-token",
        CRON_SECRET: "cron-secret",
        LARK_FEEDBACK_SYNC_ENABLED: "false",
    },
    "2026-04-30T08:00:00.000Z"
);

assert.equal(healthy.status, "ok");
assert.equal(healthy.services.supabase.configured, true);
assert.equal(healthy.services.chatModel.configured, true);
assert.equal(healthy.services.chatModel.provider, "openai-compatible");
assert.equal(healthy.services.chatModel.model, "gpt-5.4");
assert.equal(healthy.services.chatModel.wireAPI, "responses");
assert.equal(healthy.services.embedding.configured, true);
assert.equal(healthy.services.embedding.provider, "google");
assert.equal(healthy.services.admin.protected, true);
assert.equal(healthy.services.ops.protected, true);
assert.equal(healthy.services.cron.protected, true);
assert.equal(healthy.services.feishuSync.enabled, false);
assert.deepEqual(healthy.missingRequired, []);

const degraded = buildHealthSnapshot(
    {
        SUPABASE_URL: "",
        SUPABASE_SERVICE_ROLE_KEY: "",
        OPENAI_COMPATIBLE_API_KEY: "",
        DEEPSEEK_API_KEY: "",
        GOOGLE_GENERATIVE_AI_API_KEY: "",
    },
    "2026-04-30T08:01:00.000Z"
);

assert.equal(degraded.status, "degraded");
assert.equal(degraded.services.supabase.configured, false);
assert.equal(degraded.services.chatModel.configured, false);
assert.equal(degraded.services.embedding.configured, false);
assert.ok(degraded.missingRequired.includes("SUPABASE_URL"));
assert.ok(degraded.missingRequired.includes("SUPABASE_SERVICE_ROLE_KEY"));
assert.ok(degraded.missingRequired.includes("CHAT_MODEL_API_KEY"));
assert.ok(degraded.missingRequired.includes("GOOGLE_GENERATIVE_AI_API_KEY"));

console.log("health snapshot tests passed");
