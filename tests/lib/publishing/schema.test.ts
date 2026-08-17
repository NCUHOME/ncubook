// 单测：测试 Supabase SQL Schema v2 契约，验证 content_versions, published_pages 等核心表结构、索引与约束
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = resolve(process.cwd(), "supabase/schema.sql");

describe("versioned published content schema v2", () => {
  it("defines the immutable publication tables, sync jobs, and a singleton current pointer", () => {
    expect(existsSync(migrationPath), "published content migration is missing").toBe(true);
    if (!existsSync(migrationPath)) return;

    const sql = readFileSync(migrationPath, "utf8");
    for (const table of [
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
    ]) {
      expect(sql).toMatch(new RegExp(`create table if not exists ${table}`, "i"));
    }
    expect(sql).toMatch(/unique\s*\(content_version,\s*source_page_id\)/i);
    expect(sql).toMatch(/singleton boolean primary key default true check \(singleton\)/i);
  });

  it("enables row-level security and exposes published data as read-only", () => {
    expect(existsSync(migrationPath), "published content migration is missing").toBe(true);
    if (!existsSync(migrationPath)) return;

    const sql = readFileSync(migrationPath, "utf8");
    for (const table of [
      "content_versions",
      "published_pages",
      "published_blocks",
      "published_assets",
      "published_search_segments",
      "published_content_pointer",
    ]) {
      expect(sql).toMatch(new RegExp(`alter table ${table} enable row level security`, "i"));
    }
    expect(sql).toMatch(/for select\s+using \([^;]*status = 'published'/is);
    expect(sql).not.toMatch(/for (?:insert|update|delete)\s+to (?:anon|authenticated)/i);
  });

  it("resolves the current version without recursive cross-table policies", () => {
    expect(existsSync(migrationPath), "published content migration is missing").toBe(true);
    if (!existsSync(migrationPath)) return;

    const sql = readFileSync(migrationPath, "utf8");
    expect(sql).toMatch(/create or replace function current_published_content_version\(\)[\s\S]*security definer[\s\S]*set row_security = off/i);
    const policies = sql.slice(sql.indexOf("drop policy if exists current_pages_are_public"));
    expect(policies).toContain("id = current_published_content_version()");
    expect(policies.match(/content_version = current_published_content_version\(\)/g)).toHaveLength(5);
    expect(policies).not.toMatch(/from (?:content_versions|published_content_pointer)/i);
  });

  it("commits, stages and rolls back pointer changes through database transactions", () => {
    const sql = readFileSync(migrationPath, "utf8");
    expect(sql).toMatch(/create or replace function stage_published_chunk\s*\(/i);
    expect(sql).toMatch(/create or replace function commit_published_content_version\s*\(/i);
    expect(sql).toMatch(/published_content_pointer[\s\S]*for update/i);
    expect(sql).toMatch(/insert into published_pages[\s\S]*insert into published_blocks[\s\S]*insert into published_assets[\s\S]*insert into published_search_segments/is);
    expect(sql).toMatch(/update content_versions[\s\S]*status = 'published'[\s\S]*insert into published_content_pointer/is);
    expect(sql).toMatch(/create or replace function rollback_published_content_version\s*\(/i);
    expect(sql).toMatch(/create or replace function fail_published_content_version\s*\(/i);
  });

  it("keeps privileged publication RPCs executable by the service role only", () => {
    const sql = readFileSync(migrationPath, "utf8");
    for (const signature of [
      "stage_published_chunk\\(text, jsonb, jsonb, jsonb, jsonb\\)",
      "commit_published_content_version\\(text, text, text, jsonb\\)",
      "rollback_published_content_version\\(text, text\\)",
      "fail_published_content_version\\(text, text, text, text, text\\)",
      "match_published_segments\\(text, integer\\)",
      "consume_ask_rate_limit\\(text, bigint\\)",
    ]) {
      expect(sql).toMatch(new RegExp(`grant execute on function ${signature} to service_role`, "i"));
    }
  });

  it("pins the immutable-version trigger function search path", () => {
    const sql = readFileSync(migrationPath, "utf8");
    expect(sql).toMatch(/create or replace function reject_published_version_mutation\(\)[\s\S]*?set search_path = public, pg_temp[\s\S]*?as \$\$/i);
    expect(sql).toMatch(/if tg_table_name = 'content_versions' then\s+target_version := old\.id;\s+else\s+target_version := old\.content_version;\s+end if;/i);
  });

  it("defines match and search RPCs with tsvector and trgm similarity", () => {
    const sql = readFileSync(migrationPath, "utf8");
    expect(sql).toMatch(/create or replace function search_published_segments\s*\(/i);
    expect(sql).toMatch(/create or replace function match_published_segments\s*\(/i);
    const retrieval = sql.slice(sql.indexOf("create or replace function match_published_segments"));
    expect(retrieval).toContain("current_published_content_version()");
    expect(retrieval).toMatch(/page\.school\s*=\s*'ncu'/i);
    expect(retrieval).toContain("source_urls");
    expect(retrieval).toMatch(/ts_rank_cd\(seg\.search_vector,\s*websearch_to_tsquery\('simple',\s*p_question\)\)/i);
  });
});
