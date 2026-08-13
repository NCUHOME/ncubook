// Supabase 数据库 Database TypeScript 类型契约声明 (lib/database.types.ts)
// 基于 supabase/schema.sql 生产 Schema 手动提取与强类型化

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      content_versions: {
        Row: {
          id: string;
          schema_version: number;
          source_root_id: string;
          status: "pending" | "published" | "failed";
          notion_last_edited_time: string | null;
          started_at: string;
          published_at: string | null;
          checksum: string | null;
          summary: Json;
          failure_reason: string | null;
        };
        Insert: {
          id: string;
          schema_version?: number;
          source_root_id: string;
          status?: "pending" | "published" | "failed";
          notion_last_edited_time?: string | null;
          started_at?: string;
          published_at?: string | null;
          checksum?: string | null;
          summary?: Json;
          failure_reason?: string | null;
        };
        Update: {
          id?: string;
          schema_version?: number;
          source_root_id?: string;
          status?: "pending" | "published" | "failed";
          notion_last_edited_time?: string | null;
          started_at?: string;
          published_at?: string | null;
          checksum?: string | null;
          summary?: Json;
          failure_reason?: string | null;
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
          status: "published" | "failed";
          last_edited_time: string;
          last_published_at: string;
          metadata: Json;
        };
        Insert: {
          id?: number;
          content_version: string;
          source_page_id: string;
          parent_source_page_id?: string | null;
          title: string;
          slug: string;
          status?: "published" | "failed";
          last_edited_time: string;
          last_published_at: string;
          metadata: Json;
        };
        Update: {
          id?: number;
          content_version?: string;
          source_page_id?: string;
          parent_source_page_id?: string | null;
          title?: string;
          slug?: string;
          status?: "published" | "failed";
          last_edited_time?: string;
          last_published_at?: string;
          metadata?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "published_pages_content_version_fkey";
            columns: ["content_version"];
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
          id?: number;
          content_version: string;
          source_page_id: string;
          source_block_id: string;
          anchor: string;
          ordinal: number;
          block_type: string;
          block: Json;
        };
        Update: {
          id?: number;
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
          id?: number;
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
          id?: number;
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
            referencedRelation: "published_pages";
            referencedColumns: ["content_version", "source_page_id"];
          },
        ];
      };
      published_search_entries: {
        Row: {
          id: number;
          content_version: string;
          source_page_id: string;
          source_block_id: string;
          page_title: string;
          section_path: string[];
          anchor: string;
          plain_text: string;
          block_type: string;
          updated_at: string;
          search_vector: unknown | null;
          embedding: number[] | null;
        };
        Insert: {
          id?: number;
          content_version: string;
          source_page_id: string;
          source_block_id: string;
          page_title: string;
          section_path?: string[];
          anchor: string;
          plain_text: string;
          block_type: string;
          updated_at: string;
          search_vector?: unknown | null;
          embedding?: number[] | null;
        };
        Update: {
          id?: number;
          content_version?: string;
          source_page_id?: string;
          source_block_id?: string;
          page_title?: string;
          section_path?: string[];
          anchor?: string;
          plain_text?: string;
          block_type?: string;
          updated_at?: string;
          search_vector?: unknown | null;
          embedding?: number[] | null;
        };
        Relationships: [
          {
            foreignKeyName: "published_search_entries_content_version_source_page_id_fkey";
            columns: ["content_version", "source_page_id"];
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
            referencedRelation: "content_versions";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      commit_published_content_version: {
        Args: {
          p_content_version: string;
          p_expected_current_version: string | null;
          p_checksum: string;
          p_pages: Json;
          p_blocks: Json;
          p_assets: Json;
          p_search_entries: Json;
        };
        Returns: void;
      };
      rollback_published_content_version: {
        Args: {
          p_target_version: string;
          p_expected_current_version: string | null;
        };
        Returns: void;
      };
      fail_published_content_version: {
        Args: {
          p_content_version: string;
          p_source_page_id: string | null;
          p_source_block_id: string | null;
          p_stage: string;
          p_reason: string;
        };
        Returns: void;
      };
      unreferenced_published_asset_urls: {
        Args: {
          p_retention?: string;
        };
        Returns: { public_url: string }[];
      };
      retrieve_published_sources: {
        Args: {
          p_question: string;
          p_query_embedding?: number[] | null;
          p_limit?: number;
        };
        Returns: {
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
          vector_score: number;
          source_urls: Json;
        }[];
      };
      current_published_content_version: {
        Args: Record<PropertyKey, never>;
        Returns: string | null;
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
