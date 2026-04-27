import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { promisify } from "node:util";
import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import {
    buildKnowledgeGapRecord,
    buildNegativeFeedbackRecord,
    extractSyncKey,
} from "../lib/feedback-sync-payload";

const execFileAsync = promisify(execFile);
const DEFAULT_BASE_TOKEN = "EgvkbmspHaTCdes74AvcsL64nGg";
const DEFAULT_TABLE_ID = "tbllSr5HwymQ2YAq";
const SUPABASE_PAGE_SIZE = 200;
const LARK_PAGE_SIZE = 200;
const SYNCABLE_GAP_STATUSES = ["open", "triaged", "in_progress", "resolved"] as const;
const SNAPSHOT_URL = new URL("../../static/ops-sync-status.json", import.meta.url);

type LarkCommandOutput = {
    ok?: boolean;
    identity?: string;
    data?: {
        data?: unknown[][];
        fields?: string[];
        record_id_list?: string[];
        has_more?: boolean;
        record?: {
            record_id_list?: string[];
        };
        created?: boolean;
        updated?: boolean;
        deleted?: boolean;
    };
};

type SyncedRecordMap = Map<string, string>;

type FeedbackRow = {
    id: string;
    target_type: "agent_answer" | "page";
    query_log_id: string | null;
    page_path: string | null;
    question: string | null;
    answer_excerpt: string | null;
    comment: string | null;
    created_at: string;
};

type GapRow = {
    id: string;
    sample_question: string;
    source_path: string | null;
    latest_query_log_id: string | null;
    trigger_reason: string;
    occurrence_count: number | null;
    status: string | null;
    last_seen_at: string | null;
};

type SyncListItem = {
    syncKey: string;
    entityType: "feedback" | "gap";
    itemId: string;
    title: string;
    pagePath: string;
    sourceLabel: string;
    statusLabel: string;
    occurredAt: string;
    recordId?: string;
    error?: string;
};

loadEnv({ path: ".env.local", override: false });
loadEnv({ path: ".env", override: false });

function requireEnv(name: string) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}

function getLarkConfig() {
    return {
        baseToken: process.env.LARK_FEEDBACK_BASE_TOKEN || DEFAULT_BASE_TOKEN,
        tableId: process.env.LARK_FEEDBACK_TABLE_ID || DEFAULT_TABLE_ID,
    };
}

function getSupabase() {
    return createClient(
        requireEnv("SUPABASE_URL"),
        requireEnv("SUPABASE_SERVICE_ROLE_KEY")
    );
}

async function runLarkCommand(args: string[]) {
    const { stdout, stderr } = await execFileAsync("lark-cli", args, {
        encoding: "utf8",
        maxBuffer: 1024 * 1024 * 8,
    });

    if (stderr?.trim()) {
        const maybeJson = stderr.trim();
        if (!maybeJson.startsWith("{")) {
            console.warn(maybeJson);
        }
    }

    const payload = JSON.parse(stdout) as LarkCommandOutput;
    if (!payload.ok) {
        throw new Error(`Lark command failed: ${stdout}`);
    }

    return payload;
}

async function listExistingSyncedRecords() {
    const { baseToken, tableId } = getLarkConfig();
    const records = new Map<string, string>();
    let offset = 0;

    while (true) {
        const payload = await runLarkCommand([
            "base",
            "+record-list",
            "--as",
            "user",
            "--base-token",
            baseToken,
            "--table-id",
            tableId,
            "--offset",
            String(offset),
            "--limit",
            String(LARK_PAGE_SIZE),
        ]);

        const fields = payload.data?.fields ?? [];
        const detailIndex = fields.indexOf("具体问题描述 (选填)");
        const rows = payload.data?.data ?? [];
        const recordIds = payload.data?.record_id_list ?? [];

        rows.forEach((row, index) => {
            const recordId = recordIds[index];
            if (!recordId || detailIndex < 0) {
                return;
            }

            const syncKey = extractSyncKey(row[detailIndex]);
            if (syncKey) {
                records.set(syncKey, recordId);
            }
        });

        if (!payload.data?.has_more || rows.length < LARK_PAGE_SIZE) {
            break;
        }

        offset += rows.length;
    }

    return records;
}

async function fetchNegativeFeedbackRows() {
    const supabase = getSupabase();
    const rows: FeedbackRow[] = [];

    for (let from = 0; ; from += SUPABASE_PAGE_SIZE) {
        const to = from + SUPABASE_PAGE_SIZE - 1;
        const { data, error } = await supabase
            .from("agent_feedback")
            .select(
                "id, target_type, query_log_id, page_path, question, answer_excerpt, comment, created_at"
            )
            .eq("vote", "not_helpful")
            .order("created_at", { ascending: true })
            .range(from, to);

        if (error) {
            throw error;
        }

        const batch = (data ?? []) as FeedbackRow[];
        rows.push(...batch);

        if (batch.length < SUPABASE_PAGE_SIZE) {
            break;
        }
    }

    return rows;
}

async function fetchKnowledgeGapRows() {
    const supabase = getSupabase();
    const rows: GapRow[] = [];

    for (let from = 0; ; from += SUPABASE_PAGE_SIZE) {
        const to = from + SUPABASE_PAGE_SIZE - 1;
        const { data, error } = await supabase
            .from("agent_knowledge_gaps")
            .select(
                "id, sample_question, source_path, latest_query_log_id, trigger_reason, occurrence_count, status, last_seen_at"
            )
            .in("status", [...SYNCABLE_GAP_STATUSES])
            .order("last_seen_at", { ascending: true })
            .range(from, to);

        if (error) {
            throw error;
        }

        const batch = (data ?? []) as GapRow[];
        rows.push(...batch);

        if (batch.length < SUPABASE_PAGE_SIZE) {
            break;
        }
    }

    return rows;
}

async function upsertLarkRecord(fields: Record<string, unknown>, recordId?: string) {
    const { baseToken, tableId } = getLarkConfig();
    const args = [
        "base",
        "+record-upsert",
        "--as",
        "user",
        "--base-token",
        baseToken,
        "--table-id",
        tableId,
    ];

    if (recordId) {
        args.push("--record-id", recordId);
    }

    args.push("--json", JSON.stringify(fields));

    return runLarkCommand(args);
}

function pickRecent(items: SyncListItem[], limit = 8) {
    return [...items]
        .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
        .slice(0, limit);
}

function buildFeedbackListItem(row: FeedbackRow, syncKey: string, statusLabel: string): SyncListItem {
    return {
        syncKey,
        entityType: "feedback",
        itemId: row.id,
        title: row.question || row.page_path || "页面反馈",
        pagePath: row.page_path || "",
        sourceLabel: row.target_type === "agent_answer" ? "Agent 回答" : "文档页面",
        statusLabel,
        occurredAt: row.created_at,
    };
}

function buildGapListItem(row: GapRow, syncKey: string, statusLabel: string): SyncListItem {
    return {
        syncKey,
        entityType: "gap",
        itemId: row.id,
        title: row.sample_question,
        pagePath: row.source_path || "",
        sourceLabel: "知识缺口",
        statusLabel,
        occurredAt: row.last_seen_at || new Date(0).toISOString(),
    };
}

async function writeSyncSnapshot(snapshot: unknown) {
    const targetPath = fileURLToPath(SNAPSHOT_URL);
    await mkdir(dirname(targetPath), { recursive: true });
    await writeFile(targetPath, JSON.stringify(snapshot, null, 2));
}

async function syncFeedback(existingRecords: SyncedRecordMap) {
    const feedbackRows = await fetchNegativeFeedbackRows();
    let created = 0;
    let updated = 0;
    const pendingBeforeSync: SyncListItem[] = [];
    const syncedItems: SyncListItem[] = [];
    const failedItems: SyncListItem[] = [];

    for (const row of feedbackRows) {
        const payload = buildNegativeFeedbackRecord({
            id: row.id,
            targetType: row.target_type,
            queryLogId: row.query_log_id,
            pagePath: row.page_path,
            question: row.question,
            answer: row.answer_excerpt,
            comment: row.comment,
        });

        const existingRecordId = existingRecords.get(payload.syncKey);
        if (!existingRecordId) {
            pendingBeforeSync.push(buildFeedbackListItem(row, payload.syncKey, "待同步"));
        }

        try {
            const result = await upsertLarkRecord(payload.fields, existingRecordId);
            const returnedRecordId =
                result.data?.record?.record_id_list?.[0] ?? existingRecordId ?? null;

            if (returnedRecordId) {
                existingRecords.set(payload.syncKey, returnedRecordId);
            }

            if (existingRecordId) {
                updated += 1;
            } else {
                created += 1;
            }

            syncedItems.push({
                ...buildFeedbackListItem(row, payload.syncKey, existingRecordId ? "已同步更新" : "已同步创建"),
                recordId: returnedRecordId ?? undefined,
            });
        } catch (error) {
            failedItems.push({
                ...buildFeedbackListItem(row, payload.syncKey, "同步失败"),
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    return {
        total: feedbackRows.length,
        created,
        updated,
        pendingBeforeSync: pickRecent(pendingBeforeSync),
        syncedItems: pickRecent(syncedItems),
        failedItems: pickRecent(failedItems),
    };
}

async function syncKnowledgeGaps(existingRecords: SyncedRecordMap) {
    const gapRows = await fetchKnowledgeGapRows();
    let created = 0;
    let updated = 0;
    const pendingBeforeSync: SyncListItem[] = [];
    const syncedItems: SyncListItem[] = [];
    const failedItems: SyncListItem[] = [];

    for (const row of gapRows) {
        const payload = buildKnowledgeGapRecord({
            id: row.id,
            question: row.sample_question,
            currentPath: row.source_path,
            queryLogId: row.latest_query_log_id,
            gapReason: row.trigger_reason,
            occurrenceCount: row.occurrence_count,
            status: row.status,
        });

        const existingRecordId = existingRecords.get(payload.syncKey);
        if (!existingRecordId) {
            pendingBeforeSync.push(buildGapListItem(row, payload.syncKey, "待同步"));
        }

        try {
            const result = await upsertLarkRecord(payload.fields, existingRecordId);
            const returnedRecordId =
                result.data?.record?.record_id_list?.[0] ?? existingRecordId ?? null;

            if (returnedRecordId) {
                existingRecords.set(payload.syncKey, returnedRecordId);
            }

            if (existingRecordId) {
                updated += 1;
            } else {
                created += 1;
            }

            syncedItems.push({
                ...buildGapListItem(row, payload.syncKey, existingRecordId ? "已同步更新" : "已同步创建"),
                recordId: returnedRecordId ?? undefined,
            });
        } catch (error) {
            failedItems.push({
                ...buildGapListItem(row, payload.syncKey, "同步失败"),
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    return {
        total: gapRows.length,
        created,
        updated,
        pendingBeforeSync: pickRecent(pendingBeforeSync),
        syncedItems: pickRecent(syncedItems),
        failedItems: pickRecent(failedItems),
    };
}

async function main() {
    const existingRecords = await listExistingSyncedRecords();
    const feedbackSummary = await syncFeedback(existingRecords);
    const gapSummary = await syncKnowledgeGaps(existingRecords);
    const failedItems = [...feedbackSummary.failedItems, ...gapSummary.failedItems];
    const syncSnapshot = {
        updatedAt: new Date().toISOString(),
        source: "lark-cli user sync",
        totals: {
            pendingBeforeSync:
                feedbackSummary.pendingBeforeSync.length + gapSummary.pendingBeforeSync.length,
            syncedAfterRun: existingRecords.size,
            failed: failedItems.length,
            created: feedbackSummary.created + gapSummary.created,
            updated: feedbackSummary.updated + gapSummary.updated,
        },
        feedback: {
            totalEligible: feedbackSummary.total,
            created: feedbackSummary.created,
            updated: feedbackSummary.updated,
        },
        knowledgeGaps: {
            totalEligible: gapSummary.total,
            created: gapSummary.created,
            updated: gapSummary.updated,
        },
        recentPendingBeforeSync: pickRecent([
            ...feedbackSummary.pendingBeforeSync,
            ...gapSummary.pendingBeforeSync,
        ]),
        recentSynced: pickRecent([
            ...feedbackSummary.syncedItems,
            ...gapSummary.syncedItems,
        ]),
        recentFailed: pickRecent(failedItems),
    };

    await writeSyncSnapshot(syncSnapshot);

    const result = {
        ok: failedItems.length === 0,
        syncedAt: syncSnapshot.updatedAt,
        feedback: {
            total: feedbackSummary.total,
            created: feedbackSummary.created,
            updated: feedbackSummary.updated,
            failed: feedbackSummary.failedItems.length,
        },
        knowledgeGaps: {
            total: gapSummary.total,
            created: gapSummary.created,
            updated: gapSummary.updated,
            failed: gapSummary.failedItems.length,
        },
        snapshotPath: fileURLToPath(SNAPSHOT_URL),
        larkRecordCount: existingRecords.size,
    };

    console.log(
        JSON.stringify(
            result,
            null,
            2
        )
    );

    if (failedItems.length > 0) {
        process.exit(1);
    }
}

main().catch((error) => {
    console.error(
        JSON.stringify(
            {
                ok: false,
                error: error instanceof Error ? error.message : String(error),
            },
            null,
            2
        )
    );
    process.exit(1);
});
