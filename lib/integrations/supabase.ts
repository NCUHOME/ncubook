// 第三方集成：Supabase 服务端 Admin 客户端初始化（强制 assertServerOnly 服务端隔离，防护 SUPABASE_SERVICE_ROLE_KEY）
import { createClient } from "@supabase/supabase-js";
import { assertServerOnly } from "@/lib/integrations/server";

assertServerOnly("Supabase Admin Client");

export function hasSupabaseConfig() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return null;
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
