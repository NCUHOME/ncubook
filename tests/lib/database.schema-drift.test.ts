// 门禁单测：防漂移门禁，解析 supabase/schema.sql 与 lib/database.types.ts，双向比对表名、列名与 RPC 契约
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { Database } from "@/lib/database.types";

type TableName = keyof Database["public"]["Tables"];
type FunctionName = keyof Database["public"]["Functions"];

const SCHEMA_PATH = resolve(process.cwd(), "supabase/schema.sql");

function parseSqlSchema(sqlContent: string) {
  const tableRegex = /create\s+table\s+(?:if\s+not\s+exists\s+)?(\w+)\s*\(([\s\S]*?)\n\);/gi;
  const tables: Record<string, string[]> = {};

  let match: RegExpExecArray | null;
  while ((match = tableRegex.exec(sqlContent)) !== null) {
    const tableName = match[1];
    if (!tableName) continue;
    const body = match[2] ?? "";
    const columns: string[] = [];

    const lines = body.split("\n");
    let inConstraintBlock = false;
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith("--")) continue;
      // 过滤表级约束定义与多行条件
      if (/^(?:constraint|unique|foreign\s+key|primary\s+key|check)\b/i.test(line)) {
        // 如果行末没有闭合括号，则进入约束块
        if (!line.endsWith(",") && !line.endsWith(";")) {
          inConstraintBlock = true;
        }
        continue;
      }
      if (inConstraintBlock) {
        if (line.endsWith(",") || line.endsWith(");") || line.endsWith(")")) {
          inConstraintBlock = false;
        }
        continue;
      }
      if (/^(?:or|and|\))\b/i.test(line)) {
        continue;
      }
      const colMatch = line.match(/^(\w+)\s+/);
      if (colMatch && colMatch[1]) {
        columns.push(colMatch[1]);
      }
    }
    tables[tableName] = columns;
  }

  const funcRegex = /create\s+(?:or\s+replace\s+)?function\s+(\w+)\s*\(/gi;
  const functions: string[] = [];
  while ((match = funcRegex.exec(sqlContent)) !== null) {
    const funcName = match[1];
    if (funcName && !["set_updated_at", "reject_published_version_mutation"].includes(funcName)) {
      functions.push(funcName);
    }
  }

  return { tables, functions: Array.from(new Set(functions)) };
}

describe("database schema drift gate (M-2)", () => {
  const sql = readFileSync(SCHEMA_PATH, "utf8");
  const { tables: sqlTables, functions: sqlFunctions } = parseSqlSchema(sql);

  // 1. 表集合完全一致断言
  it("ensures all SQL tables are declared in TypeScript Database['public']['Tables']", () => {
    const declaredTableNames: TableName[] = [
      "content_versions",
      "published_pages",
      "published_blocks",
      "published_assets",
      "published_search_segments",
      "publication_failures",
      "published_content_pointer",
      "sync_jobs",
      "sync_job_logs",
      "evaluation_runs",
      "evaluation_cases",
      "rate_limit_buckets",
    ];

    const sqlTableNames = Object.keys(sqlTables).sort();
    expect(sqlTableNames).toEqual([...declaredTableNames].sort());
  });

  // 2. 每张表的字段集合完全双向一致断言
  it("ensures all columns in SQL tables match Database Row types", () => {
    // 预期每张表字段
    const expectedColumnsByTable: Record<TableName, string[]> = {
      content_versions: [
        "id",
        "schema_version",
        "source_root_id",
        "status",
        "started_at",
        "published_at",
        "failed_at",
        "fail_stage",
        "fail_reason",
        "checksum",
        "summary",
      ],
      published_pages: [
        "id",
        "content_version",
        "source_page_id",
        "parent_source_page_id",
        "title",
        "slug",
        "route_path",
        "tree_path",
        "school",
        "risk_level",
        "source_urls",
        "last_edited_time",
        "last_published_at",
        "metadata",
      ],
      published_blocks: [
        "id",
        "content_version",
        "source_page_id",
        "source_block_id",
        "anchor",
        "ordinal",
        "block_type",
        "block",
      ],
      published_assets: [
        "id",
        "content_version",
        "source_page_id",
        "source_block_id",
        "asset_id",
        "kind",
        "public_url",
        "checksum",
        "alt",
        "media_type",
        "byte_size",
      ],
      published_search_segments: [
        "id",
        "content_version",
        "source_page_id",
        "source_block_id",
        "page_title",
        "section_path",
        "anchor",
        "plain_text",
        "block_type",
        "search_vector",
      ],
      publication_failures: [
        "id",
        "content_version",
        "source_page_id",
        "source_block_id",
        "stage",
        "reason",
        "details",
        "created_at",
      ],
      published_content_pointer: [
        "singleton",
        "content_version",
        "updated_at",
      ],
      sync_jobs: [
        "id",
        "content_version",
        "command",
        "status",
        "started_at",
        "finished_at",
        "fail_reason",
        "updated_at",
      ],
      sync_job_logs: [
        "id",
        "job_id",
        "seq",
        "level",
        "event",
        "detail",
        "created_at",
      ],
      evaluation_runs: [
        "id",
        "mode",
        "summary",
        "created_at",
      ],
      evaluation_cases: [
        "id",
        "question",
        "page_context",
        "expectations",
        "enabled",
        "sort_order",
        "updated_at",
      ],
      rate_limit_buckets: [
        "bucket_key",
        "minute_window",
        "request_count",
        "updated_at",
      ],
    };

    for (const [tableName, expectedCols] of Object.entries(expectedColumnsByTable)) {
      const parsedCols = sqlTables[tableName];
      expect(parsedCols, `Table ${tableName} must exist in SQL schema`).toBeDefined();
      expect(parsedCols?.sort()).toEqual([...expectedCols].sort());
    }
  });

  // 3. 所有 RPC 函数名完全一致断言
  it("ensures all public RPC functions in SQL match Database['public']['Functions']", () => {
    const declaredRpcNames: FunctionName[] = [
      "current_published_content_version",
      "stage_published_chunk",
      "commit_published_content_version",
      "rollback_published_content_version",
      "fail_published_content_version",
      "search_published_segments",
      "match_published_segments",
      "consume_ask_rate_limit",
    ];

    expect(sqlFunctions.sort()).toEqual([...declaredRpcNames].sort());
  });
});
