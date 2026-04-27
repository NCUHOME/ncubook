/**
 * 官网信息运营中台演示脚本
 *
 * 使用方法：
 *   npm run check:admin   # 只检查环境与 Supabase 表是否 ready
 *   npm run demo:admin    # 跑一遍 抓取 -> 生成草稿 -> 编辑保存 -> 审核通过
 */

import * as path from "node:path";
import { config } from "dotenv";

config({ path: path.resolve(__dirname, "../.env.local") });

const REQUIRED_TABLES = [
    "official_sources",
    "official_snapshots",
    "official_candidate_events",
    "content_drafts",
    "content_audit_logs",
];

function hasEnv(name: string) {
    return Boolean(process.env[name]?.trim());
}

function printMigrationHint() {
    console.log("\n中台数据库还没有 ready。请在 Supabase SQL Editor 运行：");
    console.log("ncubook-api/supabase-official-content-admin-migration.sql");
    console.log("运行成功后再执行：npm run check:admin 或 npm run demo:admin\n");
}

function summarizeError(error: unknown) {
    if (!error || typeof error !== "object") return String(error);
    const payload = error as { message?: string; code?: string; details?: string; hint?: string };
    return [payload.code, payload.message, payload.details, payload.hint].filter(Boolean).join(" | ");
}

async function main() {
    const checkOnly = process.argv.includes("--check");

    const missingEnv = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ADMIN_TOKEN"].filter(
        (name) => !hasEnv(name)
    );
    if (missingEnv.length > 0) {
        console.error(`缺少环境变量：${missingEnv.join(", ")}`);
        process.exit(1);
    }

    const { getSupabase } = await import("../lib/supabase");
    const {
        generateDraftForEvent,
        listCandidateEvents,
        runOfficialSourceCrawl,
        updateDraft,
        approveDraft,
    } = await import("../lib/content-admin-service");

    const supabase = getSupabase();
    const missingTables: string[] = [];

    for (const table of REQUIRED_TABLES) {
        const { error } = await supabase.from(table).select("id").limit(1);
        if (error) {
            missingTables.push(`${table}: ${summarizeError(error)}`);
        }
    }

    if (missingTables.length > 0) {
        console.log("Supabase 表检查未通过：");
        for (const item of missingTables) {
            console.log(`- ${item}`);
        }
        printMigrationHint();
        process.exit(1);
    }

    if (checkOnly) {
        console.log("Admin 中台检查通过：环境变量和 Supabase 表都已 ready。");
        return;
    }

    console.log("开始演示：抓取官网来源...");
    const crawlResult = await runOfficialSourceCrawl(supabase);
    console.log(
        `抓取完成：checked=${crawlResult.checked}, created=${crawlResult.created}, candidate=${crawlResult.candidate}, watching=${crawlResult.watching}, ignored=${crawlResult.ignored}, failed=${crawlResult.failed}`
    );
    if (crawlResult.errors.length > 0) {
        console.log("失败来源：");
        for (const item of crawlResult.errors) {
            console.log(`- ${item.source}: ${item.error}`);
        }
    }

    const events = await listCandidateEvents(supabase);
    const event = events.find((item) => item.status === "candidate") ?? events.find((item) => item.status === "watching");
    if (!event) {
        console.log("没有可生成草稿的 candidate/watching 事件。请确认白名单来源能访问，或稍后重新抓取。");
        return;
    }

    console.log(`生成 AI 初稿：${event.title}`);
    const draft = await generateDraftForEvent(supabase, event.id);
    const editedMarkdown = `${draft.edited_markdown || draft.ai_markdown}

<!-- demo-review: 已做一次人工编辑保存，正式合并前仍需核对官方原文、适用对象和时间。 -->`;

    const updated = await updateDraft(supabase, draft.id, {
        editedMarkdown,
        reviewNote: "Demo：人工已阅读来源并补充审核备注。",
    });
    const approved = await approveDraft(supabase, updated.id, "Demo：审核通过，允许导出 Markdown 修改稿。");

    console.log("演示闭环完成：");
    console.log(`- 候选事件：${event.id}`);
    console.log(`- 草稿状态：${approved.status}`);
    console.log(`- 建议页面：${approved.target_doc_path || "待人工指定"}`);
    console.log(`- 导出 Markdown 字数：${(approved.export_markdown || "").length}`);
}

main().catch((error) => {
    console.error("Admin demo failed:", summarizeError(error));
    process.exit(1);
});
