// Supabase 数据库 Database TypeScript 类型契约声明 (lib/database.types.ts)
// 基于 supabase/schema.sql 生产 Schema v2 强类型声明

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      content_versions: {
        Row: {
          id: string;
          schema_version: number;
          source_root_id: string;
          status: "pending" | "staging" | "published" | "failed";
          started_at: string;
          published_at: string | null;
          failed_at: string | null;
          fail_stage: "fetch" | "transform" | "mirror-assets" | "search-index" | "commit" | null;
          fail_reason: string | null;
          checksum: string | null;
          summary: Json;
        };
        Insert: {
          id: string;
          schema_version?: number;
          source_root_id: string;
          status?: "pending" | "staging" | "published" | "failed";
          started_at?: string;
          published_at?: string | null;
          failed_at?: string | null;
          fail_stage?: "fetch" | "transform" | "mirror-assets" | "search-index" | "commit" | null;
          fail_reason?: string | null;
          checksum?: string | null;
          summary?: Json;
        };
        Update: {
          id?: string;
          schema_version?: number;
          source_root_id?: string;
          status?: "pending" | "staging" | "published" | "failed";
          started_at?: string;
          published_at?: string | null;
          failed_at?: string | null;
          fail_stage?: "fetch" | "transform" | "mirror-assets" | "search-index" | "commit" | null;
          fail_reason?: string | null;
          checksum?: string | null;
          summary?: Json;
        };
        Relationships: [];
      };
      published_pages: {
        Row: {
          id: number;
          content_version: string;
          source_page_id: string;
          parent_source_page_id: string | null;
          title: string;
          slug: string;
          route_path: string;
          tree_path: Json;
          school: string;
          risk_level: "normal" | "needs-verification" | "sensitive";
          source_urls: Json;
          last_edited_time: string;
          last_published_at: string;
          metadata: Json;
        };
        Insert: {
          id?: never;
          content_version: string;
          source_page_id: string;
          parent_source_page_id?: string | null;
          title: string;
          slug: string;
          route_path: string;
          tree_path?: Json;
          school?: string;
          risk_level?: "normal" | "needs-verification" | "sensitive";
          source_urls?: Json;
          last_edited_time: string;
          last_published_at: string;
          metadata?: Json;
        };
        Update: {
          id?: never;
          content_version?: string;
          source_page_id?: string;
          parent_source_page_id?: string | null;
          title?: string;
          slug?: string;
          route_path?: string;
          tree_path?: Json;
          school?: string;
          risk_level?: "normal" | "needs-verification" | "sensitive";
          source_urls?: Json;
          last_edited_time?: string;
          last_published_at?: string;
          metadata?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "published_pages_content_version_fkey";
            columns: ["content_version"];
            isOneToOne: false;
            referencedRelation: "content_versions";
            referencedColumns: ["id"];
          },
        ];
      };
      published_blocks: {
        Row: {
          id: number;
          content_version: string;
          source_page_id: string;
          source_block_id: string;
          anchor: string;
          ordinal: number;
          block_type: string;
          block: Json;
        };
        Insert: {
          id?: never;
          content_version: string;
          source_page_id: string;
          source_block_id: string;
          anchor: string;
          ordinal: number;
          block_type: string;
          block: Json;
        };
        Update: {
          id?: never;
          content_version?: string;
          source_page_id?: string;
          source_block_id?: string;
          anchor?: string;
          ordinal?: number;
          block_type?: string;
          block?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "published_blocks_content_version_source_page_id_fkey";
            columns: ["content_version", "source_page_id"];
            isOneToOne: false;
            referencedRelation: "published_pages";
            referencedColumns: ["content_version", "source_page_id"];
          },
        ];
      };
      published_assets: {
        Row: {
          id: number;
          content_version: string;
          source_page_id: string;
          source_block_id: string;
          asset_id: string;
          kind: "image" | "file";
          public_url: string;
          checksum: string;
          alt: string | null;
          media_type: string | null;
          byte_size: number | null;
        };
        Insert: {
          id?: never;
          content_version: string;
          source_page_id: string;
          source_block_id: string;
          asset_id: string;
          kind: "image" | "file";
          public_url: string;
          checksum: string;
          alt?: string | null;
          media_type?: string | null;
          byte_size?: number | null;
        };
        Update: {
          id?: never;
          content_version?: string;
          source_page_id?: string;
          source_block_id?: string;
          asset_id?: string;
          kind?: "image" | "file";
          public_url?: string;
          checksum?: string;
          alt?: string | null;
          media_type?: string | null;
          byte_size?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "published_assets_content_version_source_page_id_fkey";
            columns: ["content_version", "source_page_id"];
            isOneToOne: false;
            referencedRelation: "published_pages";
            referencedColumns: ["content_version", "source_page_id"];
          },
        ];
      };
      published_search_segments: {
        Row: {
          id: number;
          content_version: string;
          source_page_id: string;
          source_block_id: string;
          page_title: string;
          section_path: string[];
          anchor: string;
          plain_text: string;
          block_type: "paragraph" | "heading" | "quote" | "callout" | "table" | "page-link";
          search_vector: string;
        };
        Insert: {
          id?: never;
          content_version: string;
          source_page_id: string;
          source_block_id: string;
          page_title: string;
          section_path?: string[];
          anchor: string;
          plain_text: string;
          block_type: "paragraph" | "heading" | "quote" | "callout" | "table" | "page-link";
          search_vector?: never;
        };
        Update: {
          id?: never;
          content_version?: string;
          source_page_id?: string;
          source_block_id?: string;
          page_title?: string;
          section_path?: string[];
          anchor?: string;
          plain_text?: string;
          block_type?: "paragraph" | "heading" | "quote" | "callout" | "table" | "page-link";
          search_vector?: never;
        };
        Relationships: [
          {
            foreignKeyName: "published_search_segments_content_version_source_page_id_fkey";
            columns: ["content_version", "source_page_id"];
            isOneToOne: false;
            referencedRelation: "published_pages";
            referencedColumns: ["content_version", "source_page_id"];
          },
        ];
      };
      publication_failures: {
        Row: {
          id: string;
          content_version: string;
          source_page_id: string | null;
          source_block_id: string | null;
          stage: string;
          reason: string;
          details: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          content_version: string;
          source_page_id?: string | null;
          source_block_id?: string | null;
          stage: string;
          reason: string;
          details?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          content_version?: string;
          source_page_id?: string | null;
          source_block_id?: string | null;
          stage?: string;
          reason?: string;
          details?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "publication_failures_content_version_fkey";
            columns: ["content_version"];
            isOneToOne: false;
            referencedRelation: "content_versions";
            referencedColumns: ["id"];
          },
        ];
      };
      published_content_pointer: {
        Row: {
          singleton: boolean;
          content_version: string;
          updated_at: string;
        };
        Insert: {
          singleton?: boolean;
          content_version: string;
          updated_at?: string;
        };
        Update: {
          singleton?: boolean;
          content_version?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "published_content_pointer_content_version_fkey";
            columns: ["content_version"];
            isOneToOne: false;
            referencedRelation: "content_versions";
            referencedColumns: ["id"];
          },
        ];
      };
      sync_jobs: {
        Row: {
          id: string;
          content_version: string | null;
          command: "publish" | "rollback";
          status: "running" | "succeeded" | "failed" | "released";
          started_at: string;
          finished_at: string | null;
          fail_reason: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          content_version?: string | null;
          command: "publish" | "rollback";
          status?: "running" | "succeeded" | "failed" | "released";
          started_at?: string;
          finished_at?: string | null;
          fail_reason?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          content_version?: string | null;
          command?: "publish" | "rollback";
          status?: "running" | "succeeded" | "failed" | "released";
          started_at?: string;
          finished_at?: string | null;
          fail_reason?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sync_jobs_content_version_fkey";
            columns: ["content_version"];
            isOneToOne: false;
            referencedRelation: "content_versions";
            referencedColumns: ["id"];
          },
        ];
      };
      sync_job_logs: {
        Row: {
          id: number;
          job_id: string;
          seq: number;
          level: "info" | "warn" | "error";
          event: string;
          detail: Json;
          created_at: string;
        };
        Insert: {
          id?: never;
          job_id: string;
          seq: number;
          level?: "info" | "warn" | "error";
          event: string;
          detail?: Json;
          created_at?: string;
        };
        Update: {
          id?: never;
          job_id?: string;
          seq?: number;
          level?: "info" | "warn" | "error";
          event?: string;
          detail?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sync_job_logs_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "sync_jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      evaluation_runs: {
        Row: {
          id: string;
          mode: "fixture" | "shadow" | "production";
          summary: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          mode: "fixture" | "shadow" | "production";
          summary: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          mode?: "fixture" | "shadow" | "production";
          summary?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      evaluation_cases: {
        Row: {
          id: string;
          question: string;
          page_context: Json | null;
          expectations: Json;
          enabled: boolean;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          question: string;
          page_context?: Json | null;
          expectations?: Json;
          enabled?: boolean;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          question?: string;
          page_context?: Json | null;
          expectations?: Json;
          enabled?: boolean;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      rate_limit_buckets: {
        Row: {
          bucket_key: string;
          minute_window: number;
          request_count: number;
          updated_at: string;
        };
        Insert: {
          bucket_key: string;
          minute_window: number;
          request_count?: number;
          updated_at?: string;
        };
        Update: {
          bucket_key?: string;
          minute_window?: number;
          request_count?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      current_published_content_version: {
        Args: Record<PropertyKey, never>;
        Returns: string | null;
      };
      stage_published_chunk: {
        Args: {
          p_content_version: string;
          p_pages: Json;
          p_blocks: Json;
          p_assets: Json;
          p_segments: Json;
        };
        Returns: void;
      };
      commit_published_content_version: {
        Args: {
          p_content_version: string;
          p_expected_current_version: string;
          p_checksum: string;
          p_summary: Json;
        };
        Returns: void;
      };
      rollback_published_content_version: {
        Args: {
          p_target_version: string;
          p_expected_current_version: string;
        };
        Returns: void;
      };
      fail_published_content_version: {
        Args: {
          p_content_version: string;
          p_source_page_id?: string | null;
          p_source_block_id?: string | null;
          p_stage: string;
          p_reason: string;
        };
        Returns: void;
      };
      search_published_segments: {
        Args: {
          p_query: string;
          p_limit?: number;
        };
        Returns: Array<{
          source_page_id: string;
          page_title: string;
          section_path: string[];
          anchor: string;
          block_type: string;
          plain_text: string;
          ts_rank: number;
          trgm_score: number;
        }>;
      };
      match_published_segments: {
        Args: {
          p_question: string;
          p_limit?: number;
        };
        Returns: Array<{
          source_id: string;
          page_id: string;
          page_title: string;
          anchor: string;
          section_path: string[];
          exact_text: string;
          risk_level: string;
          school: string;
          content_version: string;
          lexical_score: number;
          source_urls: Json;
        }>;
      };
      consume_ask_rate_limit: {
        Args: {
          p_bucket_key: string;
          p_minute_window: number;
        };
        Returns: number;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
